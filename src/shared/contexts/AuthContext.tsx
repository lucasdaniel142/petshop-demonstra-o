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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));

          if (adminDoc.exists() && adminDoc.data().role === 'admin') {
            setCurrentUser(user);
            setIsAdmin(true);
          } else {
            await signOut(auth);
            setCurrentUser(null);
            setIsAdmin(false);
          }
        } else {
          setCurrentUser(null);
          setIsAdmin(false);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Erro ao verificar permissões de admin:', error);
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
