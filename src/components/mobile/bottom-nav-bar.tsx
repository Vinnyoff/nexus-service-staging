"use client";
import { BottomNavLinks } from "@/components/mobile/bottom-nav-links";

export function BottomNavBar() {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm">
            <div className="grid h-16 grid-cols-5">
                <BottomNavLinks />
            </div>
        </nav>
    );
}
