
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import type { User } from '@/lib/types';
import { useToast } from './use-toast';
import app, { db } from '@/firebase/config';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const auth = getAuth(app);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const isMockAdmin = useRef(false);
  const isSigningOut = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (isMockAdmin.current) {
        setLoading(false);
        return;
      }

      if (firebaseUser) {
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const appUser = { id: userDocSnap.id, ...userDocSnap.data() } as User;

            if (appUser.status === 'inactive') {
              console.warn(`User ${firebaseUser.uid} is inactive. Signing out.`);
              toast({
                variant: "destructive",
                title: "Acesso Negado",
                description: "Sua conta está inativa. Contate um administrador.",
              });
              await signOut(auth);
              setUser(null);
            } else {
              if (!appUser.sectorIds || !Array.isArray(appUser.sectorIds)) {
                appUser.sectorIds = [];
              }
              setUser(appUser);
            }
          } else {
            console.warn("User profile not found in Firestore for UID:", firebaseUser.uid);
            await signOut(auth);
            setUser(null);
          }
        } catch (error: any) {
          // permission-denied during logout is expected — Firebase token is already revoked
          if (error?.code === 'permission-denied' || isSigningOut.current) {
            setUser(null);
          } else {
            console.error("Error fetching user data from Firestore:", error);
            toast({
              variant: "destructive",
              title: "Erro ao buscar dados",
              description: "Não foi possível carregar seu perfil. Tente novamente.",
            });
            setUser(null);
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    isMockAdmin.current = false;
    isSigningOut.current = false;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error) {
      console.error("Login Error:", error);
      toast({
        variant: "destructive",
        title: "Falha no Login",
        description: "Email ou senha incorretos. Por favor, tente novamente.",
      });
      return false;
    }
  };

  const logout = async () => {
    if (user?.id === 'mock-admin-id') {
      isMockAdmin.current = false;
      setUser(null);
      router.push('/login');
      return;
    }
    try {
      isSigningOut.current = true;
      setUser(null);
      router.push('/login');
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
      toast({
        variant: "destructive",
        title: "Erro ao Sair",
        description: "Ocorreu um problema ao tentar fazer logout.",
      });
    } finally {
      isSigningOut.current = false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
