
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { User } from '@/lib/types';
import { useToast } from './use-toast';
import app, { db } from '@/firebase/config';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (user?.id === 'mock-admin-id') {
        setLoading(false);
        return;
      }
      
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          let userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const appUser = { id: userDocSnap.id, ...userDocSnap.data() } as User;
            
            // Critical: Check if the user's status is active
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
        } catch (error) {
          console.error("Error fetching user data from Firestore:", error);
          toast({
            variant: "destructive",
            title: "Erro ao buscar dados",
            description: "Não foi possível carregar seu perfil. Tente novamente.",
          });
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast, user]);

  const login = async (email: string, password: string): Promise<boolean> => {
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
      setUser(null);
      router.push('/login');
      return;
    }
    try {
      await signOut(auth);
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error("Logout Error:", error);
      toast({
        variant: "destructive",
        title: "Erro ao Sair",
        description: "Ocorreu um problema ao tentar fazer logout.",
      });
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
