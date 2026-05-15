import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../shared/lib/firebase';
import { Store, Lock, AlertCircle } from 'lucide-react';
import { BRAND } from '../../shared/config/brand';

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

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION_MS = 30_000;

  React.useEffect(() => {
    if (lockoutUntil <= Date.now()) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutSeconds(0);
        setFailedAttempts(0);
        clearInterval(interval);
      } else {
        setLockoutSeconds(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const isLockedOut = lockoutSeconds > 0;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setFailedAttempts(0);
      navigate('/admin');
    } catch (err: any) {
      const code = err?.code || 'unknown';
      if (import.meta.env.DEV) {
        console.error('[Login] Erro de autenticação:', code);
      }

      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_DURATION_MS;
        setLockoutUntil(until);
        setLockoutSeconds(Math.ceil(LOCKOUT_DURATION_MS / 1000));
        setError(`Muitas tentativas (${MAX_ATTEMPTS}). Aguarde 30 segundos.`);
      } else {
        setError(getErrorMessage(code));
      }
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
          <h1 className="text-[24px] font-[800] text-text text-center">{BRAND.name}</h1>
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
            <label htmlFor="login-email" className="block text-[13px] font-[600] text-text mb-1">E-mail Corporativo</label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#F0F2F2] border border-transparent rounded-[8px] px-4 py-3 text-[14px] outline-none focus:border-primary focus:bg-white transition-colors"
              placeholder="admin@minhaloja.com"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-[13px] font-[600] text-text mb-1">Senha</label>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#F0F2F2] border border-transparent rounded-[8px] px-4 py-3 text-[14px] outline-none focus:border-primary focus:bg-white transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading || isLockedOut}
            className="w-full mt-4 bg-primary hover:bg-primary-dark text-white font-[600] text-[15px] py-3.5 rounded-[8px] transition-colors disabled:opacity-70 flex justify-center items-center gap-2 shadow-sm"
          >
            {isLockedOut ? `🔒 Aguarde ${lockoutSeconds}s` : loading ? 'Autenticando...' : <><Lock size={18} /> Acessar Painel</>}
          </button>
        </form>
      </div>
    </div>
  );
};
