

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  Users,
  UserCheck,
  ClipboardList,
  Wrench,
  Map,
  LineChart,
  History,
  LayoutGrid,
  User,
  MapPinned,
  Activity,
  Calendar,
  CalendarCheck,
  MessageSquare,
  FileText,
  ListChecks,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarSeparator } from "@/components/ui/sidebar"
import type { MobileNavPreferences, ModulePermissions } from "@/lib/types"
import { useIsMobile } from "@/hooks/use-mobile"

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  roles: string[];
  permissionKey: keyof ModulePermissions;
  mobileKey: keyof MobileNavPreferences;
};


const primaryNavItems: NavItem[] = [
  { href: "/dashboard", icon: LayoutGrid, label: "Dashboard", roles: ["admin", "gerente", "encarregado", "tecnico"], permissionKey: "dashboard", mobileKey: "dashboard" },
  { href: "/schedule", icon: Calendar, label: "Agenda", roles: ["admin", "gerente", "encarregado", "tecnico"], permissionKey: "dashboard", mobileKey: "schedule" }, // Assuming agenda has same permission as dashboard for now
  { href: "/external-tickets", icon: Wrench, label: "Chamados Externos", roles: ["admin", "gerente", "encarregado", "tecnico"], permissionKey: "external_tickets", mobileKey: "external_tickets" },
  { href: "/internal-tickets", icon: ClipboardList, label: "Atendimentos Internos", roles: ["admin", "gerente", "encarregado", "tecnico"], permissionKey: "internal_tickets", mobileKey: "internal_tickets"},
  { href: "/routes", icon: Map, label: "Otimizar Rotas", roles: ["admin", "gerente", "encarregado", "tecnico"], permissionKey: "routes", mobileKey: "routes" },
  { href: "/location", icon: MapPinned, label: "Localização", roles: ["admin", "gerente", "encarregado", "tecnico"], permissionKey: "location", mobileKey: "location" },
  { href: "/planning", icon: CalendarCheck, label: "Planejamento", roles: ["admin", "gerente", "encarregado"], permissionKey: "planning", mobileKey: "planning" },
  { href: "/history", icon: History, label: "Histórico", roles: ["admin", "gerente", "encarregado", "tecnico"], permissionKey: "history", mobileKey: "history" },
  { href: "/reports/summary", icon: LineChart, label: "Relatórios", roles: ["admin", "gerente", "encarregado"], permissionKey: "reports", mobileKey: "reports" },
  { href: "/reports/interactive", icon: MessageSquare, label: "Relatório Interativo", roles: ["admin", "gerente", "encarregado"], permissionKey: "reports", mobileKey: "reports" },
];

const secondaryNavItems: NavItem[] = [
    { href: "/monitoring", icon: Activity, label: "Monitoramento", roles: ["admin", "gerente"], permissionKey: "monitoring", mobileKey: "dashboard" }, // No mobile key for this one
    { href: "/clients", icon: User, label: "Clientes", roles: ["admin", "gerente", "encarregado", "tecnico"], permissionKey: "clients", mobileKey: "dashboard" },
    { href: "/contracts", icon: FileText, label: "Contratos", roles: ["admin", "gerente", "encarregado"], permissionKey: "clients", mobileKey: "dashboard" },
    { href: "/checklists", icon: ListChecks, label: "Checklists", roles: ["admin", "gerente", "encarregado"], permissionKey: "checklists", mobileKey: "dashboard" },
    { href: "/sectors", icon: Building2, label: "Setores", roles: ["admin", "gerente"], permissionKey: "technicians", mobileKey: "dashboard" }, // Assuming sectors are part of technician management
    { href: "/users", icon: Users, label: "Usuários", roles: ["admin", "gerente"], permissionKey: "technicians", mobileKey: "dashboard" }, // Assuming users are part of technician management
    { href: "/technicians", icon: UserCheck, label: "Técnicos", roles: ["admin", "gerente", "encarregado"], permissionKey: "technicians", mobileKey: "dashboard" },
]

export function NavLinks() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  if (!user) return null;

  const hasPermission = (item: NavItem) => {
    // Admins and managers have access to everything by default, ignoring the permissions object
    if (!item.roles.includes(user.role)) {
        return false;
    }
    
    if (user.role === 'admin' || user.role === 'gerente') {
      return true;
    }
    
    // For other roles, check the specific permission
    const permissionLevel = user.permissions?.[item.permissionKey];
    return permissionLevel === 'read' || permissionLevel === 'write';
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
