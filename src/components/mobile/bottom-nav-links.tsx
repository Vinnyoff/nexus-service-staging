"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Wrench, MapPinned, LayoutGrid, Calendar, Settings
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function BottomNavLinks() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;
  
  const navItems = [
    { href: "/dashboard", icon: LayoutGrid, label: "Dashboard" },
    { href: "/schedule", icon: Calendar, label: "Agenda" },
    { href: "/external-tickets", icon: Wrench, label: "Chamados" },
    { href: "/location", icon: MapPinned, label: "Rotas" },
    { href: "/settings", icon: Settings, label: "Ajustes" },
  ];

  return (
    <>
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 p-2 text-muted-foreground transition-colors hover:bg-muted",
              isActive && "text-primary bg-muted"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}
