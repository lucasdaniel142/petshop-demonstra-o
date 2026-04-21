import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Store, Lock, AlertCircle } from 'lucide-react';

const getErrorMessage = (code: string): string => {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
    case 'auth/network-request-failed':
      return 'Sem conexão com a internet. Verifique sua rede.';
    case 'auth/user-disabled':
      return 'Esta conta foi desativada. Entre em contato com o administrador.';
    default:
      return 'Erro ao autenticar. Tente novamente.';
  }
};

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin');
    } catch (err: unknown) {
      const code =
        err !== null && typeof err === 'object' && 'code' in err
          ? String((err as { code: string }).code)
          : 'unknown';
      console.error('[Login] Erro de autenticação:', code);
      setError(getErrorMessage(code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-md rounded-[12px] shadow-lg border border-border p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
            <Store size={32} />
          </div>
          <h1 className="text-[24px] font-[800] text-text text-center">
            Sagrada Família
          </h1>
          <p className="text-muted text-[14px] mt-1">Painel Administrativo</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-[8px] flex items-center gap-2 border border-red-200">
            <AlertCircle size={20} className="shrink-0" />
            <span className="text-[14px] font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="login-email" className="block text-[13px] font-[600] text-text mb-1">
              E-mail Corporativo
            </label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#F0F2F2] border border-transparent rounded-[8px] px-4 py-3 text-[14px] outline-none focus:border-primary focus:bg-white transition-colors"
              placeholder="admin@sagradafamilia.com.br"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-[13px] font-[600] text-text mb-1">
              Senha
            </label>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#F0F2F2] border border-transparent rounded-[8px] px-4 py-3 text-[14px] outline-none focus:border-primary focus:bg-white transition-colors"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-primary hover:bg-primary-dark text-white font-[600] text-[15px] py-3.5 rounded-[8px] transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Autenticando...
              </>
            ) : (
              <>
                <Lock size={18} />
                Acessar Painel
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
