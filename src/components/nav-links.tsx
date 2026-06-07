"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarSeparator } from "@/components/ui/sidebar"
import { useIsMobile } from "@/hooks/use-mobile"
import { primaryNavItems, secondaryNavItems, NavItem } from "@/lib/nav-items"
import { cn } from "@/lib/utils"

export function NavLinks() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  if (!user) return null;

  const hasPermission = (item: NavItem) => item.roles.includes(user.role);

  const userPrimaryNavItems = primaryNavItems.filter(item => !item.hidden && hasPermission(item));
  const userSecondaryNavItems = secondaryNavItems.filter(item => !item.hidden && hasPermission(item));

  const renderItems = (items: typeof primaryNavItems) => {
    return items.map((item) => {
      const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
      return (
        <SidebarMenuItem key={item.label}>
          <SidebarMenuButton
            asChild
            isActive={isActive}
            tooltip={item.label}
            className={cn(
              "relative transition-all duration-150 rounded-md",
              isActive && "font-semibold"
            )}
          >
            <Link href={item.href}>
              <item.icon
                className={cn(
                  "shrink-0 transition-colors duration-150",
                  isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60"
                )}
              />
              <span
                className={cn(
                  "transition-colors duration-150",
                  isActive ? "text-sidebar-foreground" : "text-sidebar-foreground/70"
                )}
              >
                {item.label}
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });
  };

  return (
    <>
      <SidebarMenu>
        {renderItems(userPrimaryNavItems)}

        {userSecondaryNavItems.length > 0 && !isMobile && (
          <>
            <SidebarSeparator className="my-2" />
            {renderItems(userSecondaryNavItems)}
          </>
        )}

        {isMobile && userSecondaryNavItems.length > 0 && (
          <>
            <SidebarSeparator className="my-2" />
            <SidebarMenuItem>
              <span className="px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35">
                Gerenciamento
              </span>
            </SidebarMenuItem>
            {renderItems(userSecondaryNavItems)}
          </>
        )}
      </SidebarMenu>
    </>
  );
}
