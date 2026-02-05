
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
import type { MobileNavPreferences, ModulePermissions } from "@/lib/types"

export type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  roles: string[];
  permissionKey: keyof ModulePermissions;
  mobileKey: keyof MobileNavPreferences;
};


export const primaryNavItems: NavItem[] = [
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

export const secondaryNavItems: NavItem[] = [
    { href: "/monitoring", icon: Activity, label: "Monitoramento", roles: ["admin", "gerente"], permissionKey: "monitoring", mobileKey: "dashboard" }, // No mobile key for this one
    { href: "/clients", icon: User, label: "Clientes", roles: ["admin", "gerente", "encarregado", "tecnico"], permissionKey: "clients", mobileKey: "dashboard" },
    { href: "/contracts", icon: FileText, label: "Contratos", roles: ["admin", "gerente", "encarregado"], permissionKey: "clients", mobileKey: "dashboard" },
    { href: "/checklists", icon: ListChecks, label: "Checklists", roles: ["admin", "gerente", "encarregado"], permissionKey: "checklists", mobileKey: "dashboard" },
    { href: "/sectors", icon: Building2, label: "Setores", roles: ["admin", "gerente"], permissionKey: "technicians", mobileKey: "dashboard" }, // Assuming sectors are part of technician management
    { href: "/users", icon: Users, label: "Usuários", roles: ["admin", "gerente"], permissionKey: "technicians", mobileKey: "dashboard" }, // Assuming users are part of technician management
    { href: "/technicians", icon: UserCheck, label: "Técnicos", roles: ["admin", "gerente", "encarregado"], permissionKey: "technicians", mobileKey: "dashboard" },
]
