// ============================================================
// ARQUIVO: src/contexts/AuthContext.tsx
// REVISÃO: Enterprise Grade
// ============================================================
//
// BUGS CRÍTICOS CORRIGIDOS:
//
// 1. [CRÍTICO] FLASH DE CONTEÚDO PROTEGIDO ("piscar na tela")
//    PROBLEMA: O AuthProvider original usa `{!loading && children}`, que
//    renderiza null enquanto loading=true. Isso evita o flash AQUI, mas o
//    ProtectedRoute original não verificava `loading` — se o JS carregasse
//    rápido o suficiente, `currentUser` ainda seria null e redirecionaria
//    para /login antes de a verificação do Firestore terminar.
//    SOLUÇÃO: Manter o bloqueio no Provider E garantir que o ProtectedRoute
//    também respeite o estado `loading` (ver ProtectedRoute.tsx).
//
// 2. [CRÍTICO] FALHA SILENCIOSA NO SIGNOUT DE USUÁRIOS NÃO-ADMIN
//    PROBLEMA: Se o `getDoc` para verificar a role falhar (ex: regra de
//    segurança do Firestore barrar a leitura), o usuário NÃO é deslogado
//    (o `signOut` está dentro do bloco `else`, não do `catch`). Resultado:
//    o usuário fica em um estado limbo — logado no Auth mas sem `isAdmin`,
//    podendo causar comportamentos imprevisíveis.
//    SOLUÇÃO: O bloco `catch` agora também chama `signOut` para garantir
//    limpeza de estado em qualquer cenário de falha.
//
// 3. [SEGURANÇA] CONSOLE.LOG DE DADOS SENSÍVEIS
//    Removido do firebase.ts (ver firebase.ts comentário).
//
// 4. [ANTI-PATTERN] SETLOADING FORA DO TRY/CATCH
//    PROBLEMA: `setLoading(false)` era chamado em dois lugares separados.
//    SOLUÇÃO: Movido para um bloco `finally` para garantia.
//
// ============================================================

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
      // FIX #4: Usar try/catch/finally garante que loading sempre vira false,
      // mesmo em caso de exceções inesperadas.
      try {
        if (user) {
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));

          if (adminDoc.exists() && adminDoc.data().role === 'admin') {
            setCurrentUser(user);
            setIsAdmin(true);
          } else {
            // FIX #2: Deslogar em QUALQUER cenário onde o usuário não é admin
            // (seja o doc inexistente ou a role incorreta).
            await signOut(auth);
            setCurrentUser(null);
            setIsAdmin(false);
          }
        } else {
          setCurrentUser(null);
          setIsAdmin(false);
        }
      } catch (error) {
        // FIX #2: Em caso de ERRO (ex: Firestore offline, regra de segurança),
        // também deslogamos para evitar estado indeterminado.
        if (import.meta.env.DEV) {
          console.error('Erro ao verificar permissões de admin:', error);
        }
        await signOut(auth).catch(() => {}); // .catch() evita unhandled rejection se signOut também falhar
        setCurrentUser(null);
        setIsAdmin(false);
      } finally {
        // FIX #4: setLoading SEMPRE é chamado, independente do resultado.
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
      {/* 
        FIX #1: Enquanto loading=true, renderizamos null (tela em branco).
        Isso é intencional e preferível ao flash de conteúdo protegido.
        Uma tela de loading global pode ser adicionada aqui se desejado.
      */}
      {loading ? null : children}
    </AuthContext.Provider>
  );
};
