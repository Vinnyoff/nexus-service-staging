"use client";

import React, { useEffect } from 'react';
import { UserNav } from "@/components/user-nav";
import { BottomNavBar } from '@/components/mobile/bottom-nav-bar';
import { useAuth } from '@/hooks/use-auth';
import { PushBoot } from '@/components/push/PushBoot';
import { Logo } from '@/components/logo';

export default function MobileAppLayout({ children }: { children: React.ReactNode }) {
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

                    registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: vapidPublicKey
                    }).then(newSubscription => {
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
        <div className="flex flex-col h-screen pt-[--safe-area-inset-top]">
            <PushBoot />
            <header className="flex h-14 items-center shrink-0 justify-between px-4 border-b bg-card">
                <Logo />
                <UserNav />
            </header>
            <main className="flex-1 overflow-y-auto overflow-x-hidden bg-muted/30 p-4 pb-[calc(4.5rem+var(--safe-area-inset-bottom))]">
                {children}
            </main>
            <BottomNavBar />
        </div>
    );
}
