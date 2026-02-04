

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarSeparator } from "@/components/ui/sidebar"
import { useIsMobile } from "@/hooks/use-mobile"
import { primaryNavItems, secondaryNavItems, NavItem } from "@/lib/nav-items"

export function NavLinks() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  if (!user) return null;

  const hasPermission = (item: NavItem) => {
    // Simplified logic: only check if the user's role is included in the item's roles array.
    return item.roles.includes(user.role);
  }

  let userPrimaryNavItems = primaryNavItems.filter(hasPermission);
  let userSecondaryNavItems = secondaryNavItems.filter(hasPermission);

  if (isMobile) {
    const mobilePrefs = user.mobileNavPreferences || {};
    const mobileVisibleItems = userPrimaryNavItems.filter(item => mobilePrefs[item.mobileKey] !== false);
    
    // Use the filtered list for mobile view, but ensure it's not empty. 
    // Fallback to default if all are disabled.
    userPrimaryNavItems = mobileVisibleItems.length > 0 ? mobileVisibleItems : userPrimaryNavItems.slice(0,4); // fallback to first 4
    
    // Secondary nav is hidden in the bottom bar, but available in the sidebar menu
    userSecondaryNavItems = secondaryNavItems.filter(hasPermission);
  }


  const renderItems = (items: typeof primaryNavItems) => {
    return items.map((item) =>(
        <SidebarMenuItem key={item.label}>
          <SidebarMenuButton
              asChild
              isActive={pathname.startsWith(item.href)}
              tooltip={item.label}
          >
              <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
              </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))
  }

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
                        <span className="px-2 text-xs font-medium text-muted-foreground">Gerenciamento</span>
                    </SidebarMenuItem>
                    {renderItems(userSecondaryNavItems)}
                </>
            )}
        </SidebarMenu>
    </>
  );
}
