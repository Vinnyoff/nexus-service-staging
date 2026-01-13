
"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Menu } from "lucide-react";
import { Logo } from "@/components/logo";
import { NavLinks } from "@/components/nav-links";
import { UserNav } from "@/components/user-nav";
import { useAuth } from "@/hooks/use-auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarSeparator, SidebarTrigger, SidebarInset, SidebarProvider, useOptionalSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/types';


export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const sidebar = useOptionalSidebar();
   
    useEffect(() => {
      // Se ainda estiver verificando a autenticação, não faça nada.
      if (loading) {
        return;
      }
      // Se a verificação terminou e não há usuário, redirecione para o login.
      if (!user) {
        router.replace('/login');
        return;
      }
      
      // Lógica de inscrição para notificações push
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.PushManager) {
        navigator.serviceWorker.ready.then(registration => {
            registration.pushManager.getSubscription().then(subscription => {
                if (!subscription) {
                    // Não está inscrito, solicita permissão
                    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
                    if (!vapidPublicKey) {
                        console.error("VAPID public key não definida no ambiente.");
                        return;
                    }

                    registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: vapidPublicKey
                    }).then(newSubscription => {
                        console.log('New push subscription:', newSubscription);
                        // Envia a nova inscrição para o servidor
                        fetch('/api/notifications/subscribe', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ subscription: newSubscription, userId: user.id })
                        });
                    }).catch(err => {
                        if (Notification.permission === 'denied') {
                            console.warn('Permissão para notificações foi negada.');
                        } else {
                            console.error('Falha ao se inscrever para notificações push:', err);
                        }
                    });
                } else {
                    console.log('Existing push subscription found.');
                    // Opcional: reenviar a inscrição para o servidor para garantir que está atualizada
                     fetch('/api/notifications/subscribe', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ subscription: subscription, userId: user.id })
                    });
                }
            });
        });
      }


    }, [user, loading, router]);
    
    // Mostra a tela de carregamento enquanto o useAuth verifica o estado do usuário.
    if (loading || !user) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      );
    }

    return (
      <SidebarProvider>
        <Sidebar collapsible="icon" className='border-r'>
          <SidebarHeader className="p-4 justify-center mt-2 bg-muted/50">
              <Link href="/dashboard">
                <Logo />
              </Link>
          </SidebarHeader>
          <SidebarSeparator />
          <SidebarContent className="flex flex-col p-2">
              <NavLinks />
          </SidebarContent>
          <SidebarSeparator />
          <SidebarFooter className="p-2 group-data-[state=collapsed]:hidden">
              <div className="text-center text-xs text-muted-foreground space-y-1">
                  <p>&copy; {new Date().getFullYear()} Euroinfo</p>
                  <p>
                      Desenvolvido por{' '}
                      <span className="font-semibold text-foreground">
                      Incode Dev
                      </span>
                  </p>
                   <Link
                      href="https://wa.me/5569981003976"
                      target="_blank"
                      className="font-semibold text-foreground hover:underline"
                      >
                      +55 69 98100-3976
                    </Link>
              </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-14 items-center gap-4 border-b bg-card dark:bg-muted/40 px-4 lg:h-[60px] lg:px-6">
             <div className="text-lg font-semibold text-muted-foreground hidden md:flex items-center gap-2">
                <span>Nexus Service</span>
                <SidebarTrigger />
             </div>
             <div className="flex-1 text-lg font-semibold text-muted-foreground md:hidden">Euroinfo</div>

            <div className="w-full flex-1" />
            
            <div className="flex items-center gap-2">
                <UserNav />
                <SidebarTrigger className="md:hidden"/>
            </div>
          </header>
          <main className="flex flex-1 flex-col gap-4 md:gap-6 md:pb-6 pb-4 p-4 overflow-x-hidden">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    )
  }
