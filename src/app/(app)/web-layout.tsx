"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Logo } from "@/components/logo";
import { NavLinks } from "@/components/nav-links";
import { UserNav } from "@/components/user-nav";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarSeparator, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';

export default function WebAppLayout({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.PushManager) {
            navigator.serviceWorker.ready.then(registration => {
                registration.pushManager.getSubscription().then(subscription => {
                    if (!subscription) {
                        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
                        if (!vapidPublicKey) {
                            console.error("VAPID public key não definida no ambiente.");
                            return;
                        }

                        registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidPublicKey })
                            .then(newSubscription => {
                                fetch('/api/notifications/subscribe', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
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
                        fetch('/api/notifications/subscribe', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ subscription: subscription, userId: user.id })
                        });
                    }
                });
            });
        }
    }, [user]);

    return (
        <>
            <Sidebar collapsible="icon" className="border-r border-sidebar-border">
                <SidebarHeader className="p-4 justify-center mt-2">
                    <Link href="/dashboard">
                        <Logo />
                    </Link>
                </SidebarHeader>
                <SidebarSeparator />
                <SidebarContent className="flex flex-col p-2">
                    <NavLinks />
                </SidebarContent>
                <SidebarSeparator />
                <SidebarFooter className="p-3 group-data-[state=collapsed]:hidden">
                    <div className="text-center text-[11px] text-sidebar-foreground/40 space-y-0.5">
                        <p>&copy; {new Date().getFullYear()} Euroinfo</p>
                        <p>
                            Dev by{' '}
                            <Link
                                href="https://wa.me/5569981003976"
                                target="_blank"
                                className="text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors font-medium"
                            >
                                Incode Dev
                            </Link>
                        </p>
                    </div>
                </SidebarFooter>
            </Sidebar>

            <SidebarInset>
                <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-border/60 bg-background/80 backdrop-blur-md px-4 lg:h-[60px] lg:px-6">
                    <div className="hidden md:flex items-center gap-3">
                        <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" />
                    </div>
                    <div className="flex-1" />
                    <div className="flex items-center gap-2">
                        <UserNav />
                        <SidebarTrigger className="md:hidden h-8 w-8 text-muted-foreground" />
                    </div>
                </header>
                <main className="flex flex-1 flex-col gap-4 md:gap-6 md:pb-6 pb-4 p-4 overflow-x-hidden">
                    {children}
                </main>
            </SidebarInset>
        </>
    );
}
