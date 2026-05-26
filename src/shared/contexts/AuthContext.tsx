import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  currentUser: User | null;
  isAdmin: boolean;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isAdmin: false,
  loading: true,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// [MP-04 FIX] Função auxiliar para sleep (usado no backoff exponencial)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// [MP-04 FIX] Verifica permissões de admin com retry e backoff exponencial
async function checkAdminPermissions(user: User, retryCount = 0): Promise<boolean> {
  const MAX_RETRIES = 3;
  
  try {
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    
    if (adminDoc.exists() && adminDoc.data().role === 'admin') {
      return true;
    }
    
    return false;
  } catch (error) {
    // Se ainda temos tentativas restantes, faz retry com backoff exponencial
    if (retryCount < MAX_RETRIES) {
      const backoffMs = 1000 * Math.pow(2, retryCount); // 1s, 2s, 4s
      console.warn(`[AuthContext] Erro ao verificar permissões (tentativa ${retryCount + 1}/${MAX_RETRIES + 1}). Retry em ${backoffMs}ms...`, error);
      await sleep(backoffMs);
      return checkAdminPermissions(user, retryCount + 1);
    }
    
    // Após todas as tentativas, loga o erro e retorna false
    console.error('[AuthContext] Falha ao verificar permissões após todas as tentativas:', error);
    throw error;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // [MP-04 FIX] Usa função com retry ao invés de chamada direta
          const hasAdminPermissions = await checkAdminPermissions(user);
          
          if (hasAdminPermissions) {
            setCurrentUser(user);
            setIsAdmin(true);
          } else {
            // Usuário autenticado mas não é admin
            await signOut(auth);
            setCurrentUser(null);
            setIsAdmin(false);
          }
        } else {
          setCurrentUser(null);
          setIsAdmin(false);
        }
      } catch (error) {
        // [MP-04 FIX] Só desloga após esgotar todas as tentativas de retry
        if (import.meta.env.DEV) {
          console.error('Erro ao verificar permissões de admin após retry:', error);
        }
        await signOut(auth).catch(() => {});
        setCurrentUser(null);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ currentUser, isAdmin, loading, logout }}>
      {loading ? null : children}
    </AuthContext.Provider>
  );
};
