"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { primaryNavItems, NavItem } from "@/lib/nav-items";

export function BottomNavLinks() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  const hasPermission = (item: NavItem) => item.roles.includes(user.role);

  const mobilePrefs = user.mobileNavPreferences || {};

  const permittedItems = primaryNavItems.filter(item => !item.hidden && hasPermission(item));

  const preferredItems = Object.keys(mobilePrefs).length > 0
    ? permittedItems.filter(item => mobilePrefs[item.mobileKey] !== false)
    : permittedItems;

  const finalNavItems = preferredItems.length > 0 ? preferredItems : permittedItems;

  return (
    <div className="flex h-[4.5rem] overflow-x-auto">
      {finalNavItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-1.5 py-2 transition-colors min-w-[72px]",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary" />
            )}
            <item.icon className={cn("h-6 w-6 transition-transform duration-150", isActive && "scale-110")} />
            <span className={cn("text-[11px] font-medium text-center leading-none", isActive && "font-semibold")}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
