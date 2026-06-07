"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Sector, User } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useEffect, useState, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import { Input } from "../ui/input";
import { Search, X, CalendarDays, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExternalTicket } from "@/lib/types";
import { cn } from "@/lib/utils";

export type StatusFilter = ExternalTicket['status'] | 'all';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all',          label: 'Todos'        },
  { value: 'pendente',     label: 'Pendentes'    },
  { value: 'em andamento', label: 'Em Andamento' },
  { value: 'concluído',    label: 'Concluídos'   },
  { value: 'cancelado',    label: 'Cancelados'   },
];

interface ExternalTicketsFilterBarProps {
  statusFilter: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  technicianFilter: string;
  onTechnicianChange: (technicianId: string) => void;
  sectorFilter: string;
  onSectorChange: (sectorId: string) => void;
  contractOnly: boolean;
  onContractOnlyChange: (checked: boolean) => void;
  myTicketsOnly: boolean;
  onMyTicketsOnlyChange: (checked: boolean) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  dateFrom: string;
  onDateFromChange: (date: string) => void;
  dateTo: string;
  onDateToChange: (date: string) => void;
  currentUser: User | null;
  sectors: Sector[];
}

export function ExternalTicketsFilterBar({
  statusFilter, onStatusChange,
  technicianFilter, onTechnicianChange,
  sectorFilter, onSectorChange,
  contractOnly, onContractOnlyChange,
  myTicketsOnly, onMyTicketsOnlyChange,
  searchQuery, onSearchChange,
  dateFrom, onDateFromChange,
  dateTo, onDateToChange,
  currentUser, sectors,
}: ExternalTicketsFilterBarProps) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    getDocs(collection(db, "users")).then(snap =>
      setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)))
    );
  }, []);

  const canFilterBySector = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' || currentUser.role === 'gerente') return true;
    if ((currentUser.role === 'encarregado' || currentUser.role === 'tecnico') && (currentUser.sectorIds?.length ?? 0) > 1) return true;
    return false;
  }, [currentUser]);

  const userSectors = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'encarregado' || currentUser.role === 'tecnico') {
      return sectors.filter(s => currentUser?.sectorIds?.includes(s.id));
    }
    return sectors;
  }, [currentUser, sectors]);

  const assignableUsers = useMemo(() => {
    const fieldStaff = allUsers.filter(u => u.role === 'tecnico' || u.role === 'encarregado');
    if (!currentUser) return [];
    let techSectorFilter = sectorFilter;
    if (currentUser.role === 'tecnico' || (currentUser.role === 'encarregado' && currentUser.sectorIds?.length === 1)) {
      techSectorFilter = currentUser.sectorIds?.[0] || 'all';
    }
    return fieldStaff.filter(user => {
      if (techSectorFilter === 'all') {
        if (currentUser.role === 'encarregado') return user.sectorIds?.some(id => currentUser.sectorIds?.includes(id));
        if (currentUser.role === 'admin' || currentUser.role === 'gerente') return true;
        return user.sectorIds?.some(id => currentUser.sectorIds?.includes(id));
      }
      return user.sectorIds?.includes(techSectorFilter);
    });
  }, [currentUser, allUsers, sectorFilter]);

  const isTechnicianFilterDisabled = statusFilter === 'pendente';
  const hasDateFilter = !!(dateFrom || dateTo);
  const clearDates = () => { onDateFromChange(''); onDateToChange(''); };

  const activeFiltersCount = [
    technicianFilter !== 'all',
    sectorFilter !== 'all',
    contractOnly,
    myTicketsOnly,
    hasDateFilter,
  ].filter(Boolean).length;

  // ── Painel de filtros avançados (compartilhado mobile/desktop) ─────────────
  const AdvancedFilters = () => (
    <div className="space-y-3">
      {canFilterBySector && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Setor</Label>
          <Select value={sectorFilter} onValueChange={onSectorChange}>
            <SelectTrigger className="h-10 md:h-9">
              <SelectValue placeholder="Todos os setores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              {userSectors.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Técnico</Label>
        <Select
          value={isTechnicianFilterDisabled ? 'all' : technicianFilter}
          onValueChange={onTechnicianChange}
          disabled={isTechnicianFilterDisabled}
        >
          <SelectTrigger className="h-10 md:h-9">
            <SelectValue placeholder="Todos os técnicos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os técnicos</SelectItem>
            {assignableUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Período</Label>
          {hasDateFilter && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={clearDates}>
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={dateFrom} onChange={e => onDateFromChange(e.target.value)} className="h-10 md:h-9 text-sm w-full" />
          <Input type="date" value={dateTo} onChange={e => onDateToChange(e.target.value)} className="h-10 md:h-9 text-sm w-full" />
        </div>
      </div>

      <div className="flex items-center gap-6 pt-1">
        <div className="flex items-center gap-2">
          <Checkbox id="cb-contract" checked={contractOnly} onCheckedChange={c => onContractOnlyChange(Boolean(c))} className="h-5 w-5 md:h-4 md:w-4" />
          <Label htmlFor="cb-contract" className="text-sm cursor-pointer">Apenas Contratos</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="cb-mine" checked={myTicketsOnly} onCheckedChange={c => onMyTicketsOnlyChange(Boolean(c))} className="h-5 w-5 md:h-4 md:w-4" />
          <Label htmlFor="cb-mine" className="text-sm cursor-pointer">Apenas Meus</Label>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ══ MOBILE (< md) ══════════════════════════════════════════════════════ */}
      <div className="md:hidden space-y-2">

        {/* Status pills — horizontal scroll */}
        <div className="w-full overflow-x-auto pb-1 scrollbar-none">
          <div className="flex gap-2 w-max">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => onStatusChange(opt.value)}
                className={cn(
                  "flex-shrink-0 px-3.5 py-2 rounded-full text-sm font-medium transition-colors border",
                  statusFilter === opt.value
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/50 text-muted-foreground border-transparent active:bg-muted"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search + filtros avançados */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar chamado..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="pl-9 h-11"
            />
          </div>
          <Button
            variant={activeFiltersCount > 0 ? "default" : "outline"}
            size="icon"
            className="h-11 w-11 shrink-0 relative"
            onClick={() => setShowAdvanced(prev => !prev)}
          >
            <SlidersHorizontal className="h-5 w-5" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-brand-orange text-[10px] font-bold text-white flex items-center justify-center leading-none">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>

        {/* Painel avançado recolhível */}
        {showAdvanced && (
          <div className="rounded-xl border bg-card p-4 animate-fade-in shadow-sm">
            <AdvancedFilters />
          </div>
        )}
      </div>

      {/* ══ DESKTOP (≥ md) ═════════════════════════════════════════════════════ */}
      <div className="hidden md:flex flex-col gap-3 rounded-lg border bg-card p-3">
        {/* Linha 1: status tabs + busca */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          <ToggleGroup
            type="single"
            value={statusFilter}
            onValueChange={(value: StatusFilter) => value && onStatusChange(value)}
            className="flex-wrap justify-start"
          >
            <ToggleGroupItem value="all">Todos</ToggleGroupItem>
            <ToggleGroupItem value="pendente">Pendente</ToggleGroupItem>
            <ToggleGroupItem value="em andamento">Em Andamento</ToggleGroupItem>
            <ToggleGroupItem value="concluído">Concluído</ToggleGroupItem>
            <ToggleGroupItem value="cancelado">Cancelado</ToggleGroupItem>
          </ToggleGroup>

          <div className="relative min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar chamado..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="pl-8 sm:w-[200px] lg:w-[280px]"
            />
          </div>
        </div>

        {/* Linha 2: filtros avançados */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          {canFilterBySector && (
            <div className="min-w-[180px]">
              <Select value={sectorFilter} onValueChange={onSectorChange}>
                <SelectTrigger><SelectValue placeholder="Filtrar por setor..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os setores</SelectItem>
                  {userSectors.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="min-w-[180px]">
            <Select
              value={isTechnicianFilterDisabled ? 'all' : technicianFilter}
              onValueChange={onTechnicianChange}
              disabled={isTechnicianFilterDisabled}
            >
              <SelectTrigger><SelectValue placeholder="Filtrar por técnico..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os técnicos</SelectItem>
                {assignableUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input type="date" value={dateFrom} onChange={e => onDateFromChange(e.target.value)} className="h-9 w-[140px] text-sm" title="Data inicial" />
            <span className="text-xs text-muted-foreground">até</span>
            <Input type="date" value={dateTo} onChange={e => onDateToChange(e.target.value)} className="h-9 w-[140px] text-sm" title="Data final" />
            {hasDateFilter && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={clearDates} title="Limpar datas">
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-4 ml-auto shrink-0">
            <div className="flex items-center space-x-2">
              <Checkbox id="desktop-contract" checked={contractOnly} onCheckedChange={c => onContractOnlyChange(Boolean(c))} />
              <Label htmlFor="desktop-contract" className="text-sm cursor-pointer">Contratos</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="desktop-mine" checked={myTicketsOnly} onCheckedChange={c => onMyTicketsOnlyChange(Boolean(c))} />
              <Label htmlFor="desktop-mine" className="text-sm cursor-pointer">Apenas Meus</Label>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
