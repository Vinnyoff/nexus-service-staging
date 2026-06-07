"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import WebAppLayout from './web-layout';
import MobileAppLayout from './mobile-layout';
import { usePlatform } from '@/hooks/use-platform';
import { useIsMobile } from '@/hooks/use-mobile';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const platform = usePlatform();
    const isMobile = useIsMobile();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.replace('/login');
            return;
        }
    }, [user, loading, router]);

    if (loading || !user || !isClient) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    // Capacitor nativo (android/ios) OU navegador mobile (< 768px) → layout mobile
    if (platform !== 'web' || isMobile) {
        return <MobileAppLayout>{children}</MobileAppLayout>;
    }

    return (
        <SidebarProvider>
            <WebAppLayout>{children}</WebAppLayout>
        </SidebarProvider>
    );
}
