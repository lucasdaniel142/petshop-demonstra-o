import React, { useState, useEffect } from 'react';
import { Settings, Save, Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../shared/lib/firebase';
import { updateDeliverySettings } from '../../shared/config/delivery';

interface SystemSettings {
  freeShippingMinValueEnabled: boolean;
  freeShippingMinValue: number;
  updatedAt?: unknown;
}

const DEFAULT_SETTINGS: SystemSettings = {
  freeShippingMinValueEnabled: false,
  freeShippingMinValue: 100.00,
};

export const SettingsManager: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const settingsDocRef = doc(db, 'settings', 'delivery');

    const unsubscribe = onSnapshot(
      settingsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as SystemSettings;
          const newSettings = {
            freeShippingMinValueEnabled: data.freeShippingMinValueEnabled ?? false,
            freeShippingMinValue: data.freeShippingMinValue ?? 100.00,
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

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-primary" size={32} />
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

          <div className="flex justify-end">
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
