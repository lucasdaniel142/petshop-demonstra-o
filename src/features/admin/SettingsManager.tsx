import React, { useState, useEffect } from 'react';
import { Settings, Save, Loader2, AlertCircle, Bell, Download } from 'lucide-react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../shared/lib/firebase';
import { updateDeliverySettings } from '../../shared/config/delivery';
import { useAuth } from '../../shared/contexts/AuthContext';

interface SystemSettings {
  freeShippingMinValueEnabled: boolean;
  freeShippingMinValue: number;
  promoNotificationTitle: string;
  promoNotificationBody: string;
  updatedAt?: unknown;
}

const DEFAULT_SETTINGS: SystemSettings = {
  freeShippingMinValueEnabled: false,
  freeShippingMinValue: 100.00,
  promoNotificationTitle: '🔥 Promoção Especial!',
  promoNotificationBody: 'Confira nossas ofertas imperdíveis!',
};

export const SettingsManager: React.FC = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // Capturar evento beforeinstallprompt para PWA
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Verificar se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setCanInstall(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    // [HP-01 FIX] Retorna ANTES de registrar o listener se não for admin
    // Isso evita vazamento de memória quando isAdmin muda de true → false
    if (!isAdmin) {
      setLoading(false);
      return; // ← Cleanup não é necessário pois listener não foi criado
    }

    const settingsDocRef = doc(db, 'settings', 'delivery');

    const unsubscribe = onSnapshot(
      settingsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as SystemSettings;
          const newSettings = {
            freeShippingMinValueEnabled: data.freeShippingMinValueEnabled ?? false,
            freeShippingMinValue: data.freeShippingMinValue ?? 100.00,
            promoNotificationTitle: data.promoNotificationTitle ?? DEFAULT_SETTINGS.promoNotificationTitle,
            promoNotificationBody: data.promoNotificationBody ?? DEFAULT_SETTINGS.promoNotificationBody,
          };
          setSettings(newSettings);
          // Atualiza configurações globais de entrega
          updateDeliverySettings(newSettings.freeShippingMinValueEnabled, newSettings.freeShippingMinValue);
        } else {
          setSettings(DEFAULT_SETTINGS);
          updateDeliverySettings(DEFAULT_SETTINGS.freeShippingMinValueEnabled, DEFAULT_SETTINGS.freeShippingMinValue);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao carregar configurações:', err);
        setError('Erro ao carregar configurações');
        setLoading(false);
      }
    );

    // Cleanup sempre executado quando isAdmin muda ou componente desmonta
    return () => unsubscribe();
  }, [isAdmin]);

  const handleSave = async () => {
    // Verifica se o usuário é admin antes de salvar
    if (!isAdmin) {
      setError('Você não tem permissão para salvar configurações');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const settingsDocRef = doc(db, 'settings', 'delivery');
      await setDoc(settingsDocRef, {
        ...settings,
        updatedAt: new Date(),
      });
      // Atualiza configurações globais de entrega
      updateDeliverySettings(settings.freeShippingMinValueEnabled, settings.freeShippingMinValue);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      setError('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setCanInstall(false);
      setDeferredPrompt(null);
    }

    setDeferredPrompt(null);
  };

  const handleNotifyOffers = async () => {
    const confirmed = window.confirm('Deseja enviar notificações de ofertas para todos os clientes cadastrados?');
    if (!confirmed) return;

    setIsNotifying(true);
    setError(null);
    setSuccess(false);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Não autenticado');

      // Diagnóstico: verifica quantos tokens existem antes de enviar
      let tokenCount = '?';
      try {
        const diagRes = await fetch('/api/admin/debug-tokens', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (diagRes.ok) {
          const diagData = await diagRes.json();
          tokenCount = String(diagData.total ?? '?');
          console.log('[SettingsManager] Tokens no Firestore:', diagData.total, diagData.tokens);
        }
      } catch (diagErr) {
        console.warn('[SettingsManager] Diagnóstico falhou:', diagErr);
      }

      const response = await fetch('/api/send-promotions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      const data = await response.json();
      if (response.ok) {
        const sent = Number(data.sent ?? 0);
        const failed = Number(data.failed ?? 0);
        const deleted = Number(data.tokensDeleted ?? 0);

        // Sem inscritos
        if (sent === 0 && failed === 0) {
          const msg = data.message || 'Nenhum dispositivo inscrito para receber notificações.';
          window.dispatchEvent(new CustomEvent('app-toast', {
            detail: { title: `⚠️ ${msg} (tokens no DB: ${tokenCount})`, type: 'info', duration: 8000 }
          }));
          setError(`${msg} — Tokens encontrados no Firestore: ${tokenCount}`);
        } else {
          // Sucesso com detalhes
          const summary = `📢 Notificações enviadas: ${sent}` +
            (failed > 0 ? ` • Falharam: ${failed}` : '') +
            (deleted > 0 ? ` • Tokens inválidos removidos: ${deleted}` : '');
          window.dispatchEvent(new CustomEvent('app-toast', {
            detail: { title: summary, type: 'success', duration: 6000 }
          }));
          setSuccess(true);
          setTimeout(() => setSuccess(false), 5000);
        }
      } else {
        const msg = data.error || `Erro ${response.status} ao enviar notificações`;
        window.dispatchEvent(new CustomEvent('app-toast', {
          detail: { title: '❌ ' + msg, type: 'error', duration: 6000 }
        }));
        setError(msg);
      }
    } catch (err) {
      console.error('[SettingsManager] Falha ao chamar /api/send-promotions:', err);
      const msg = err instanceof Error ? err.message : 'Erro de conexão.';
      window.dispatchEvent(new CustomEvent('app-toast', {
        detail: { title: msg, type: 'error', duration: 6000 }
      }));
      setError(msg);
    } finally {
      setIsNotifying(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="mx-auto text-red-500 mb-3" size={48} />
        <h2 className="text-[18px] font-[700] text-red-700 mb-2">Acesso Negado</h2>
        <p className="text-[14px] text-red-600">
          Você não tem permissão para acessar as configurações do sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Settings size={22} className="text-primary" />
          <h1 className="text-[20px] font-[800] text-primary">Configurações do Sistema</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-center gap-2 mb-6">
            <span>⚠️</span>
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 flex items-center gap-2 mb-6">
            <span>✅</span>
            Configurações salvas com sucesso!
          </div>
        )}

        <div className="space-y-6">
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-[16px] font-[700] text-text mb-4">Frete Grátis por Valor Mínimo</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[14px] font-[600] text-text block mb-1">
                    Ativar Frete Grátis por Valor
                  </label>
                  <p className="text-[12px] text-muted">
                    Quando ativado, pedidos acima do valor mínimo terão frete grátis
                  </p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, freeShippingMinValueEnabled: !settings.freeShippingMinValueEnabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.freeShippingMinValueEnabled ? 'bg-primary' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.freeShippingMinValueEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {settings.freeShippingMinValueEnabled && (
                <div>
                  <label className="text-[14px] font-[600] text-text block mb-2">
                    Valor Mínimo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.freeShippingMinValue}
                    onChange={(e) => setSettings({ ...settings, freeShippingMinValue: parseFloat(e.target.value) || 0 })}
                    className="w-full max-w-[200px] rounded-lg border border-border px-4 py-2.5 text-[14px] outline-none focus:border-primary transition-colors"
                    placeholder="100.00"
                  />
                  <p className="text-[12px] text-muted mt-1">
                    Pedidos acima deste valor terão frete grátis
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-[16px] font-[700] text-text mb-4">Notificações de Promoção</h2>

            <div className="space-y-4">
              <div>
                <label className="text-[14px] font-[600] text-text block mb-2">
                  Título Padrão
                </label>
                <input
                  type="text"
                  value={settings.promoNotificationTitle}
                  onChange={(e) => setSettings({ ...settings, promoNotificationTitle: e.target.value })}
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-[14px] outline-none focus:border-primary transition-colors"
                  placeholder="🔥 Promoção Especial!"
                />
                <p className="text-[12px] text-muted mt-1">
                  Título usado nas notificações push de promoção
                </p>
              </div>

              <div>
                <label className="text-[14px] font-[600] text-text block mb-2">
                  Mensagem Padrão
                </label>
                <textarea
                  value={settings.promoNotificationBody}
                  onChange={(e) => setSettings({ ...settings, promoNotificationBody: e.target.value })}
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-[14px] outline-none focus:border-primary transition-colors resize-none h-20"
                  placeholder="Confira nossas ofertas imperdíveis!"
                />
                <p className="text-[12px] text-muted mt-1">
                  Corpo da mensagem usado nas notificações push de promoção
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            {canInstall && (
              <button
                onClick={handleInstallPWA}
                className="flex items-center gap-2 bg-gray-600 text-white px-6 py-2.5 rounded-xl font-bold text-[14px] hover:bg-gray-700 transition-colors"
              >
                <Download size={18} />
                Instalar App
              </button>
            )}
            <button
              onClick={handleNotifyOffers}
              disabled={isNotifying}
              className="flex items-center gap-2 bg-secondary text-white px-6 py-2.5 rounded-xl font-bold text-[14px] hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isNotifying ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Bell size={18} />
                  Notificar Clientes
                </>
              )}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-[14px] hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Salvar Configurações
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
