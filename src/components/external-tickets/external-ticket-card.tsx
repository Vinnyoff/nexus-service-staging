"use client"

import type { ExternalTicket, Sector, User } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  parseISO, differenceInHours, formatDistanceToNow,
  formatDistanceToNowStrict, isAfter, format
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import {
  MoreHorizontal, Calendar, UserSquare, MapPin, Hand, History,
  XCircle, Truck, Copy, Clock, AlertTriangle, Building2, MessageSquare, UserCog
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

// ── Avatar de iniciais com cor determinística ────────────────────────────────

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-indigo-500",
];

function TechAvatar({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join("").toUpperCase();
  const colorIndex = [...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return (
    <div className={cn(
      "h-5 w-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0",
      AVATAR_COLORS[colorIndex]
    )}>
      {initials}
    </div>
  );
}

// ── Faixa de SLA no topo do card ─────────────────────────────────────────────

interface SlaBannerProps { expiresAt: string; status: ExternalTicket["status"] }

function SlaBanner({ expiresAt, status }: SlaBannerProps) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (status !== "pendente" && status !== "em andamento") return null;

  const exp = parseISO(expiresAt);
  const isViolated = isAfter(now, exp);
  const hoursLeft = differenceInHours(exp, now);

  if (isViolated) {
    return (
      <div className="flex items-center gap-2 bg-destructive/15 border-b border-destructive/25 px-3 py-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-destructive animate-pulse shrink-0" />
        <span className="text-xs font-bold text-destructive animate-pulse tracking-wide">SLA VENCIDO</span>
      </div>
    );
  }
  if (hoursLeft <= 4) {
    return (
      <div className="flex items-center gap-2 bg-amber-500/10 border-b border-amber-500/25 px-3 py-1.5">
        <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
          SLA expira {formatDistanceToNowStrict(exp, { locale: ptBR, addSuffix: true })}
        </span>
      </div>
    );
  }
  return null;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ExternalTicketCardProps {
  ticket: ExternalTicket;
  users: User[];
  sectors: Sector[];
  onViewDetails: () => void;
  onAssignToMe: () => void;
  onSetEnRoute: () => void;
  onStatusChange: (ticketId: string, status: ExternalTicket["status"]) => void;
  onConfirmAction: (action: "reopen" | "cancel" | "take" | "reassign", ticket: ExternalTicket) => void;
  currentUser: User | null;
  hasActiveRoute: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const getStatusVariant = (s: ExternalTicket["status"]): "default" | "secondary" | "destructive" | "outline" =>
  s === "concluído" ? "default" : s === "em andamento" ? "secondary" : s === "cancelado" ? "destructive" : "outline";

const getTypeVariant = (t: ExternalTicket["type"]): "default" | "secondary" | "destructive" | "outline" =>
  t === "contrato" ? "secondary" : t === "urgente" ? "destructive" : t === "retorno" ? "outline" : "default";

const getPriorityVariant = (p: "Normal" | "Alta" | "Extrema"): "secondary" | "default" | "destructive" =>
  p === "Extrema" ? "destructive" : p === "Alta" ? "default" : "secondary";

const getCardBorderClass = (type: ExternalTicket["type"]) => ({
  padrão:   "border-l-4 border-l-transparent",
  contrato: "border-l-4 border-l-brand-navy",
  urgente:  "border-l-4 border-l-red-500 dark:border-l-red-400",
  agendado: "border-l-4 border-l-violet-500 dark:border-l-violet-400",
  retorno:  "border-l-4 border-l-brand-orange",
}[type] ?? "");

const getCardBgClass = (type: ExternalTicket["type"]) => ({
  padrão:   "bg-card hover:bg-muted/40",
  contrato: "bg-brand-navy/5 dark:bg-brand-navy/15 hover:bg-brand-navy/10 dark:hover:bg-brand-navy/25",
  urgente:  "bg-red-50 dark:bg-red-950/40 hover:bg-red-100/80 dark:hover:bg-red-950/60",
  agendado: "bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100/80 dark:hover:bg-violet-950/60",
  retorno:  "bg-brand-orange/5 dark:bg-brand-orange/10 hover:bg-brand-orange/10 dark:hover:bg-brand-orange/20",
}[type] ?? "bg-card");

// ── Componente principal ──────────────────────────────────────────────────────

export function ExternalTicketCard({
  ticket, onViewDetails, onConfirmAction, onAssignToMe,
  onSetEnRoute, users, sectors, currentUser, hasActiveRoute,
}: ExternalTicketCardProps) {
  const creator  = users.find(u => u.id === ticket.creatorId);
  const assignee = users.find(u => u.id === ticket.technicianId);
  const finalizer = users.find(u => u.id === ticket.finalizedBy);
  const sector   = sectors.find(s => s.id === ticket.sectorId);

  const isCurrentUserAssigned = currentUser?.id === ticket.technicianId;
  const hasComments = !!(ticket.comments?.length);

  const canUserIntervene = !!(currentUser && (
    currentUser.id === ticket.creatorId ||
    isCurrentUserAssigned ||
    currentUser.role === "admin" ||
    currentUser.role === "gerente" ||
    (currentUser.role === "encarregado" && ticket.sectorId && currentUser.sectorIds?.includes(ticket.sectorId))
  ));

  const canReassign = canUserIntervene &&
    ticket.technicianId &&
    (currentUser?.role === "admin" || currentUser?.role === "gerente" || currentUser?.role === "encarregado") &&
    (ticket.status === "pendente" || ticket.status === "em andamento");

  const showGrabButton   = ticket.status === "pendente" && !ticket.technicianId &&
    (currentUser?.role === "tecnico" || currentUser?.role === "encarregado");
  const showReopenButton = ticket.status === "concluído" && canUserIntervene;
  const canBeCancelled   = (ticket.status === "pendente" || ticket.status === "em andamento") && canUserIntervene;
  const isEnRoute        = ticket.enRoute === true;
  const showEnRouteButton = isCurrentUserAssigned && ticket.status === "em andamento" && !ticket.checkIn && !hasActiveRoute && !isEnRoute;

  // SLA info for footer (non-critical / OK state only shown there)
  const slaOK = ticket.slaExpiresAt &&
    (ticket.status === "pendente" || ticket.status === "em andamento") &&
    !isAfter(new Date(), parseISO(ticket.slaExpiresAt)) &&
    differenceInHours(parseISO(ticket.slaExpiresAt), new Date()) > 4;

  const renderTechnicianStatus = () => {
    const techName    = assignee?.name.split(" ")[0] || "Técnico";
    const finalName   = finalizer?.name.split(" ")[0] || techName;
    if (ticket.status === "concluído")    return `Finalizado por ${finalName}`;
    if (ticket.status === "em andamento") return `Em andamento por ${techName}`;
    if (ticket.status === "pendente")     return assignee ? `Aguardando por ${techName}` : "Aguardando atribuição";
    if (ticket.status === "cancelado")    return "Cancelado";
    return assignee ? `Atribuído a ${techName}` : "Sem técnico";
  };

  const relativeTime = formatDistanceToNow(parseISO(ticket.createdAt), { locale: ptBR, addSuffix: true });
  const clientLabel  = ticket.client.name.length > 26
    ? `${ticket.client.name.substring(0, 26)}…`
    : ticket.client.name;
  const ticketCode   = `#${ticket.id.substring(0, 6).toUpperCase()}`;

  return (
    <Card
      className={cn(
        "flex flex-col cursor-pointer transition-all overflow-hidden",
        getCardBgClass(ticket.type),
        getCardBorderClass(ticket.type)
      )}
      onClick={onViewDetails}
    >
      {/* ── Faixa SLA (apenas quando crítico/violado) ── */}
      {ticket.slaExpiresAt && (
        <SlaBanner expiresAt={ticket.slaExpiresAt} status={ticket.status} />
      )}

      {/* ── Header ── */}
      <CardHeader className="pb-2 pt-3 px-4 overflow-hidden">
        <div className="flex items-start gap-2">

          {/* Lado esquerdo: nome + id + badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <CardTitle className="text-base leading-tight truncate max-w-[160px] sm:max-w-none">{clientLabel}</CardTitle>
              <code className="text-[10px] font-mono text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded-sm border border-border/50 shrink-0">
                {ticketCode}
              </code>
              {ticket.type === "contrato" && ticket.priority && (
                <Badge variant={getPriorityVariant(ticket.priority)} className="text-xs px-1.5 py-0">
                  {ticket.priority}
                </Badge>
              )}
              {hasComments && (
                <MessageSquare className="h-3.5 w-3.5 text-primary fill-primary/20 shrink-0" />
              )}
            </div>

            {/* Técnico com avatar */}
            <div className="flex items-center gap-1.5 mt-1.5">
              {assignee && <TechAvatar name={assignee.name} />}
              <span className="text-xs text-muted-foreground truncate leading-none">
                {renderTechnicianStatus()}
              </span>
            </div>
          </div>

          {/* Lado direito: status + menu */}
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant={getStatusVariant(ticket.status)} className="capitalize text-xs px-1.5 py-0 h-5">
              {ticket.status}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 w-10 md:h-7 md:w-7 p-0" onClick={e => e.stopPropagation()}>
                  <span className="sr-only">Abrir menu</span>
                  <MoreHorizontal className="h-5 w-5 md:h-4 md:w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                <DropdownMenuItem onClick={onViewDetails}>Ver Detalhes</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(ticket.id)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {canReassign && (
                  <DropdownMenuItem onClick={() => onConfirmAction("reassign", ticket)}>
                    <UserCog className="mr-2 h-4 w-4" />
                    Reatribuir Técnico
                  </DropdownMenuItem>
                )}
                {showReopenButton && (
                  <DropdownMenuItem onClick={() => onConfirmAction("reopen", ticket)}>
                    <History className="mr-2 h-4 w-4" />
                    Reabrir Chamado
                  </DropdownMenuItem>
                )}
                {canBeCancelled && (
                  <DropdownMenuItem onClick={() => onConfirmAction("cancel", ticket)} className="text-destructive focus:text-destructive">
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancelar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        </div>
      </CardHeader>

      {/* ── Conteúdo: descrição ── */}
      <CardContent className="flex-grow py-0 px-4 overflow-hidden">
        <div className="rounded-md border bg-background/50 p-2.5 overflow-hidden">
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed break-words">
            {ticket.description}
          </p>
        </div>

        {ticket.scheduledTo && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium mt-2 min-w-0">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Agendado: {format(parseISO(ticket.scheduledTo), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
          </div>
        )}
      </CardContent>

      {/* ── Footer: info compacta + tipo + ações ── */}
      <CardFooter className="flex flex-col gap-2.5 mt-2 px-4 pt-2.5 pb-3 border-t">

        {/* Grade 2×2 de metadados */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 w-full text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 min-w-0">
            <UserSquare className="h-3 w-3 shrink-0" />
            <span className="truncate">{creator?.name.split(" ")[0] || "—"}</span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <Clock className="h-3 w-3 shrink-0" />
            <span className="truncate">{relativeTime}</span>
          </div>
          {sector && (
            <div className="flex items-center gap-1.5 min-w-0">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{sector.name}</span>
            </div>
          )}
          {ticket.client.address && (
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{ticket.client.address}</span>
            </div>
          )}
          {slaOK && (
            <div className="flex items-center gap-1.5 min-w-0 col-span-2">
              <Clock className="h-3 w-3 shrink-0 text-emerald-500" />
              <span className="truncate text-emerald-600 dark:text-emerald-500">
                SLA: {formatDistanceToNowStrict(parseISO(ticket.slaExpiresAt!), { locale: ptBR, addSuffix: true })}
              </span>
            </div>
          )}
        </div>

        {/* Tipo + ações */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2">
          <Badge variant={getTypeVariant(ticket.type)} className="capitalize text-xs px-2 py-0 h-5 self-start sm:self-auto">
            {ticket.type}
          </Badge>

          {(showGrabButton || showEnRouteButton || isEnRoute || showReopenButton) && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              {showGrabButton && (
                <Button className="h-11 sm:h-7 text-sm sm:text-xs sm:px-2.5 justify-center font-semibold" onClick={e => { e.stopPropagation(); onAssignToMe(); }}>
                  <Hand className="mr-2 h-4 w-4 sm:mr-1.5 sm:h-3.5 sm:w-3.5" />
                  Pegar Chamado
                </Button>
              )}
              {showEnRouteButton && (
                <Button variant="outline" className="h-11 sm:h-7 text-sm sm:text-xs sm:px-2.5 justify-center" onClick={e => { e.stopPropagation(); onSetEnRoute(); }}>
                  <Truck className="mr-2 h-4 w-4 sm:mr-1.5 sm:h-3.5 sm:w-3.5" />
                  Estou a Caminho
                </Button>
              )}
              {isEnRoute && (
                <div className="flex items-center justify-center gap-2 text-sm sm:text-xs font-medium text-blue-600 bg-blue-600/10 border border-blue-600/25 rounded-md px-2.5 py-2.5 sm:py-1">
                  <Truck className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                  Destino Atual
                </div>
              )}
              {showReopenButton && (
                <Button variant="secondary" className="h-11 sm:h-7 text-sm sm:text-xs sm:px-2.5 justify-center" onClick={e => { e.stopPropagation(); onConfirmAction("reopen", ticket); }}>
                  <History className="mr-2 h-4 w-4 sm:mr-1.5 sm:h-3.5 sm:w-3.5" />
                  Reabrir
                </Button>
              )}
            </div>
          )}
        </div>

      </CardFooter>
    </Card>
  );
}
