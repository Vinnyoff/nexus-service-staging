
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
  
  const hasPermission = (item: NavItem) => {
    return item.roles.includes(user.role);
  };

  const mobilePrefs = user.mobileNavPreferences || {};
  
  const permittedItems = primaryNavItems.filter(hasPermission);
  
  // If user has set any preferences, use them. Otherwise, show all permitted items.
  const preferredItems = Object.keys(mobilePrefs).length > 0 
    ? permittedItems.filter(item => mobilePrefs[item.mobileKey] !== false)
    : permittedItems;

  // Fallback to permitted items if preferences result in an empty list
  let finalNavItems = preferredItems.length > 0 ? preferredItems : permittedItems;

  return (
    <div className="flex h-16 overflow-x-auto">
      {finalNavItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 p-2 text-muted-foreground transition-colors hover:bg-muted min-w-[80px]",
              isActive && "text-primary"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium text-center">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
