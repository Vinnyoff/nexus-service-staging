
export type Role = 'admin' | 'gerente' | 'encarregado' | 'tecnico' | 'vendedor';
export type UserStatus = 'active' | 'inactive' | 'pending_invitation';

export type PermissionLevel = 'none' | 'read' | 'write';

export interface ModulePermissions {
  dashboard: PermissionLevel;
  external_tickets: PermissionLevel;
  internal_tickets: PermissionLevel;
  routes: PermissionLevel;
  planning: PermissionLevel;
  reports: PermissionLevel;
  history: PermissionLevel;
  clients: PermissionLevel;
  technicians: PermissionLevel;
  location: PermissionLevel;
  monitoring: PermissionLevel;
  checklists: PermissionLevel;
}

export type MobileNavPreferences = {
    dashboard?: boolean;
    schedule?: boolean;
    external_tickets?: boolean;
    internal_tickets?: boolean;
    routes?: boolean;
    location?: boolean;
    planning?: boolean;
    history?: boolean;
    reports?: boolean;
}

// Representa a inscrição para notificações push
export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}


export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  avatarUrl?: string;
  sectorIds: string[]; 
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  permissions?: Partial<ModulePermissions>;
  mobileNavPreferences?: MobileNavPreferences;
  euroInfoId?: string;
  rondoInfoId?: string;
  pushSubscriptions?: PushSubscription[];
}

export interface Sector {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: 'active' | 'archived';
  whatsappGroupId?: string;
  euroInfoId?: string;
  rondoInfoId?: string;
}

export interface RouteHistoryEntry {
  date: string; // YYYY-MM-DD
  routeOrder: string[];
  finishedAt?: string;
}

export interface Technician {
  id: string;
  userId: string;
  name: string;
  email: string;
  sectorIds: string[];
  status: UserStatus;
  routeOrder?: string[];
  routeHistory?: RouteHistoryEntry[];
  euroInfoId?: string;
  rondoInfoId?: string;
}

export interface Address {
  street: string;
  number?: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface PreventiveContract {
  sectorIds: string[];
  frequencyDays: number;
}

export interface ServiceContract {
  id: string;
  clientId: string;
  clientName: string;
  description?: string;
  sectorIds: string[];
  defaultChecklists?: Record<string, string>; // sectorId: checklistId
  frequencyDays: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Client {
    id: string;
    name: string;
    document?: string; // CPF ou CNPJ
    phone: string;
    address: Address;
    status: 'active' | 'inactive';
    slaHours?: number;
    // O preventiveContract é mantido para a nova lógica de planejamento
    preventiveContract?: PreventiveContract;
    euroInfoId?: string;
    rondoInfoId?: string;
}

export interface SupportPoint {
  id: string;
  name: string;
  address: Address;
}

export interface Comment {
    id: string;
    authorId: string;
    content: string;
    createdAt: string;
}

export interface TechnicalReport {
    observations: string;
    photos?: string[]; // URLs of the photos
    signature?: string; // Data URL of the signature image
}

export interface ChecklistTaskState {
    taskId: string;
    completed: boolean;
    photo?: string; // URL da foto de evidência
    observation?: string;
}

export interface ExternalTicket {
  id: string;
  client: {
    id: string; 
    name: string;
    address?: string;
    phone: string;
    isWhats: boolean;
  };
  requesterName?: string;
  sectorId: string;
  creatorId: string;
  technicianId?: string | null;
  description: string;
  type: 'padrão' | 'contrato' | 'urgente' | 'agendado' | 'retorno';
  priority?: 'Normal' | 'Alta' | 'Extrema';
  status: 'pendente' | 'em andamento' | 'concluído' | 'cancelado';
  scheduledTo?: string;
  createdAt: string;
  updatedAt: string;
  slaExpiresAt?: string | null;
  checkIn?: {
    ticketId: string;
    timestamp: string;
  } | null;
  checkOut?: {
    ticketId: string;
    timestamp: string;
  } | null;
  enRoute?: boolean | null;
  enRouteAt?: string | null;
  comments?: Comment[];
  technicalReport?: TechnicalReport | null;
  checklistId?: string;
  checklist?: ChecklistTaskState[];
}

export interface InternalTicket {
  id: string;
  title: string;
  description?: string;
  creatorId: string;
  assigneeId?: string;
  sectorId?: string;
  status: 'pendente' | 'em andamento' | 'concluído' | 'cancelado';
  isPriority?: boolean;
  createdAt: string;
  updatedAt: string;
  scheduledTo?: string;
  comments?: Comment[];
}

export interface OptimizedRoute {
    optimizedRoute: { ticketId: string; address: string }[];
    explanation: string;
    tickets: ExternalTicket[];
}

export interface AppNotification {
    id: string;
    title: string;
    description: string;
    createdAt: string;
    href: string;
}

export type SystemLogEvent = 'EXTERNAL_TICKET_CREATED' | 'AI_CALL' | 'API_CALL';

export interface SystemLog {
    id: string;
    userId: string;
    event: SystemLogEvent;
    timestamp: string;
    details: Record<string, any>;
}

export interface TicketReportSummary {
  summaryAndTrends: string;
  improvementSuggestions: string;
}

export interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  resource: ExternalTicket | InternalTicket;
  type: 'external' | 'internal';
}

export interface PreventiveRoutePlan {
  suggestedRoutes: {
    day: number;
    clients: {
      id: string;
      name: string;
      address: string;
    }[];
  }[];
  summary: string;
}

export interface ChecklistTask {
  id: string;
  text: string;
}

export interface Checklist {
  id: string;
  name: string;
  description?: string;
  sectorId: string;
  tasks: ChecklistTask[];
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}
