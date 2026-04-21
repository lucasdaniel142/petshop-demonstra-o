import React, { useState, useEffect } from 'react';
import { Shield, UserPlus, Trash2, AlertTriangle } from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, firebaseConfig } from '../../lib/firebase';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import type { AdminUser, FeedbackState } from '../../types';
import { ADMIN_UNIDADES } from '../../utils/constants';

const validatePassword = (senha: string): string | null => {
  if (senha.length < 8) return 'A senha deve ter pelo menos 8 caracteres.';
  if (!/[A-Z]/.test(senha)) return 'A senha deve conter pelo menos uma letra maiúscula.';
  if (!/[0-9]/.test(senha)) return 'A senha deve conter pelo menos um número.';
  return null;
};

const getSecondaryApp = () => {
  const NAME = 'SecondaryApp';
  return getApps().find((app) => app.name === NAME) ?? initializeApp(firebaseConfig, NAME);
};

const RemoveConfirmModal: React.FC<{
  adminNome: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ adminNome, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="w-full max-w-sm rounded-[16px] bg-white shadow-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
          <AlertTriangle size={20} className="text-red-600" />
        </div>
        <h3 className="font-[700] text-text text-[16px]">Remover Acesso</h3>
      </div>
      <p className="text-[14px] text-muted mb-6">
        Tem certeza que deseja remover o acesso de{' '}
        <strong className="text-text">"{adminNome}"</strong>? Essa ação não pode ser desfeita.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 border border-border rounded-[8px] text-[14px] font-[600] text-text hover:bg-[#F0F2F2] transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-[8px] text-[14px] font-extrabold transition-colors"
        >
          Sim, remover
        </button>
      </div>
    </div>
  </div>
);

function getFirebaseErrorMessage(error: unknown): string {
  if (error !== null && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    if (code === 'auth/email-already-in-use') return 'Este e-mail já está em uso.';
    if (code === 'auth/weak-password') return 'A senha deve ter pelo menos 6 caracteres.';
    if (code === 'auth/invalid-email') return 'E-mail inválido.';
  }
  return 'Erro ao cadastrar administrador.';
}

export const TeamManager: React.FC = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [removeTarget, setRemoveTarget] = useState<AdminUser | null>(null);

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    unidade: 'geral',
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'admins'),
      (snapshot) => {
        const loadedAdmins: AdminUser[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<AdminUser, 'id'>),
        }));
        setAdmins(loadedAdmins);
        setLoadingAdmins(false);
      },
      (err) => {
        console.error('Erro ao buscar admins:', err);
        setFeedback({ type: 'error', message: 'Erro ao carregar a lista da equipe.' });
        setLoadingAdmins(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    const pwdError = validatePassword(formData.senha);
    if (pwdError) { setPasswordError(pwdError); return; }
    setPasswordError(null);

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const secondaryAuth = getAuth(getSecondaryApp());
      const { user } = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.senha);
      await signOut(secondaryAuth);

      await setDoc(doc(db, 'admins', user.uid), {
        nome: formData.nome,
        email: formData.email,
        unidade: formData.unidade,
        role: 'admin',
        createdAt: serverTimestamp(),
      });

      showFeedback('success', `Administrador "${formData.nome}" cadastrado com sucesso!`);
      setFormData({ nome: '', email: '', senha: '', unidade: 'geral' });
    } catch (error: unknown) {
      console.error('Erro ao criar admin:', error);
      showFeedback('error', getFirebaseErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveConfirm = async () => {
    if (!removeTarget) return;
    try {
      await deleteDoc(doc(db, 'admins', removeTarget.id));
      showFeedback('success', `Acesso de "${removeTarget.nome}" removido com sucesso.`);
    } catch (error) {
      console.error('Erro ao remover admin:', error);
      showFeedback('error', 'Erro ao remover acesso. Tente novamente.');
    } finally {
      setRemoveTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      {removeTarget && (
        <RemoveConfirmModal
          adminNome={removeTarget.nome}
          onConfirm={handleRemoveConfirm}
          onCancel={() => setRemoveTarget(null)}
        />
      )}

      <div className="bg-white p-6 rounded-[12px] border border-border shadow-sm">
        <h1 className="text-[20px] font-[800] text-primary">Gerenciamento de Equipe</h1>
        <p className="text-muted text-[13px] mt-1">Adicione ou remova permissões de acesso ao painel.</p>
      </div>

      <FeedbackBanner feedback={feedback} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-[12px] border border-border shadow-sm">
            <h2 className="text-[16px] font-[700] text-text flex items-center gap-2 mb-6">
              <UserPlus size={18} className="text-primary" />
              Novo Acesso
            </h2>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-[13px] font-[600] text-text mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full bg-[#F0F2F2] border border-transparent rounded-[8px] px-4 py-2.5 text-[14px] outline-none focus:border-primary focus:bg-white transition-colors"
                  placeholder="Ex: Maria Oliveira"
                />
              </div>

              <div>
                <label className="block text-[13px] font-[600] text-text mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[#F0F2F2] border border-transparent rounded-[8px] px-4 py-2.5 text-[14px] outline-none focus:border-primary focus:bg-white transition-colors"
                  placeholder="maria@sagradafamilia.com"
                />
              </div>

              <div>
                <label className="block text-[13px] font-[600] text-text mb-1">Senha Inicial</label>
                <input
                  type="password"
                  required
                  value={formData.senha}
                  onChange={(e) => {
                    setFormData({ ...formData, senha: e.target.value });
                    if (passwordError) setPasswordError(validatePassword(e.target.value));
                  }}
                  className={`w-full bg-[#F0F2F2] border rounded-[8px] px-4 py-2.5 text-[14px] outline-none focus:bg-white transition-colors ${
                    passwordError ? 'border-red-400 focus:border-red-400' : 'border-transparent focus:border-primary'
                  }`}
                  placeholder="Mín. 8 chars, 1 maiúscula, 1 número"
                />
                {passwordError && (
                  <p className="text-red-500 text-[12px] mt-1">{passwordError}</p>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-[600] text-text mb-1">Unidade</label>
                <select
                  value={formData.unidade}
                  onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                  className="w-full bg-[#F0F2F2] border border-transparent text-text text-[14px] rounded-[8px] px-4 py-2.5 outline-none focus:border-primary focus:bg-white transition-colors"
                >
                  {ADMIN_UNIDADES.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 bg-primary hover:bg-primary-dark text-white font-[600] text-[14px] py-3 rounded-[8px] transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  <>
                    <Shield size={16} />
                    Cadastrar Acesso
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Tabela */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[12px] border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-border text-[12px] text-muted uppercase tracking-wider">
                    <th className="p-4 font-[600]">Colaborador</th>
                    <th className="p-4 font-[600]">Unidade</th>
                    <th className="p-4 font-[600] text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loadingAdmins ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-muted">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          Carregando equipe...
                        </div>
                      </td>
                    </tr>
                  ) : admins.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-muted">
                        Nenhum administrador cadastrado.
                      </td>
                    </tr>
                  ) : (
                    admins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-[#F9F9F9] transition-colors">
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-[600] text-[14px] text-text">{admin.nome}</span>
                            <span className="text-[13px] text-muted">{admin.email}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="bg-[#F0F2F2] text-text text-[12px] font-[500] px-2.5 py-1 rounded-[4px]">
                            {ADMIN_UNIDADES.find((u) => u.id === admin.unidade)?.name ?? admin.unidade}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setRemoveTarget(admin)}
                            className="text-red-500 hover:bg-red-50 p-2 rounded-[6px] transition-colors"
                            title="Remover Acesso"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
