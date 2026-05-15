import React, { useState, useEffect } from 'react';
import { Shield, UserPlus, Trash2, AlertTriangle } from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, firebaseConfig } from '../../shared/lib/firebase';
import { FeedbackBanner } from '../../shared/ui/FeedbackBanner';
import type { AdminUser, FeedbackState } from '../../shared/types';
import { ADMIN_UNIDADES } from '../../shared/utils/constants';

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
        Tem certeza que deseja remover o acesso de <strong className="text-text">"{adminNome}"</strong>?
      </p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 border rounded-[8px] text-[14px] font-[600]">Cancelar</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 text-white rounded-[8px] text-[14px] font-extrabold">Remover</button>
      </div>
    </div>
  </div>
);

export const TeamManager: React.FC = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [removeTarget, setRemoveTarget] = useState<AdminUser | null>(null);

  const [formData, setFormData] = useState({ nome: '', email: '', senha: '', unidade: 'geral' });
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'admins'), (snapshot) => {
      const loadedAdmins: AdminUser[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<AdminUser, 'id'>),
      }));
      setAdmins(loadedAdmins);
      setLoadingAdmins(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const pwdError = validatePassword(formData.senha);
    if (pwdError) { setPasswordError(pwdError); return; }
    setIsSubmitting(true);
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
      setFeedback({ type: 'success', message: 'Cadastrado!' });
      setFormData({ nome: '', email: '', senha: '', unidade: 'geral' });
    } catch {
      setFeedback({ type: 'error', message: 'Erro ao cadastrar.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {removeTarget && <RemoveConfirmModal adminNome={removeTarget.nome} onConfirm={async () => { await deleteDoc(doc(db, 'admins', removeTarget.id)); setRemoveTarget(null); setFeedback({type:'success', message:'Removido'}); }} onCancel={() => setRemoveTarget(null)} />}
      <div className="bg-white p-6 rounded-[12px] border border-border shadow-sm"><h1 className="text-[20px] font-[800] text-primary">Equipe</h1></div>
      <FeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-[12px] border border-border shadow-sm">
          <h2 className="text-[16px] font-[700] mb-6 flex items-center gap-2"><UserPlus size={18} /> Novo Acesso</h2>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <input type="text" value={formData.nome} onChange={e => setFormData({...formData, nome:e.target.value})} placeholder="Nome" className="w-full bg-[#F0F2F2] px-4 py-2.5 rounded-[8px] outline-none" />
            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email:e.target.value})} placeholder="E-mail" className="w-full bg-[#F0F2F2] px-4 py-2.5 rounded-[8px] outline-none" />
            <input type="password" value={formData.senha} onChange={e => setFormData({...formData, senha:e.target.value})} placeholder="Senha" className="w-full bg-[#F0F2F2] px-4 py-2.5 rounded-[8px] outline-none" />
            {passwordError && <p className="text-red-500 text-[12px]">{passwordError}</p>}
            <button disabled={isSubmitting} className="w-full bg-primary text-white py-3 rounded-[8px] font-extrabold">{isSubmitting ? 'Cadastrando...' : 'Cadastrar'}</button>
          </form>
        </div>
        <div className="lg:col-span-2 bg-white rounded-[12px] border border-border shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#FAFAFA] border-b border-border text-[12px] text-muted uppercase"><tr className="font-[600]"><th className="p-4">Colaborador</th><th className="p-4 text-right">Ação</th></tr></thead>
            <tbody className="divide-y divide-border">
              {admins.map(admin => (
                <tr key={admin.id} className="hover:bg-gray-50"><td className="p-4"><div className="flex flex-col"><span className="font-bold">{admin.nome}</span><span className="text-xs">{admin.email}</span></div></td><td className="p-4 text-right"><button onClick={() => setRemoveTarget(admin)} className="text-red-500 p-2"><Trash2 size={18} /></button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
