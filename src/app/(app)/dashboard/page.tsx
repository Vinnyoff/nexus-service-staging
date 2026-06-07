"use client"

import { ClipboardList, Wrench, CheckCircle, Clock, AlertCircle, TrendingUp, TrendingDown } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { useAuth } from "@/hooks/use-auth"
import { RecentTicketsList } from "@/components/dashboard/recent-tickets-list"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectSeparator } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusChart } from "@/components/dashboard/status-chart"
import { ActiveRoutesCard } from "@/components/dashboard/active-routes-card"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"
import { AlertPanel } from "@/components/dashboard/alert-panel"
import { TrendChart } from "@/components/dashboard/trend-chart"
import { TopClientsCard } from "@/components/dashboard/top-clients-card"
import { useEffect, useState, useMemo } from "react"
import { collection, onSnapshot, query } from "firebase/firestore"
import { db } from "@/firebase/config"
import { ExternalTicket, InternalTicket, Sector, Technician, User } from "@/lib/types"
import { SectorStatsCard } from "@/components/dashboard/sector-stats-card"
import { RecentActivityCard } from "@/components/dashboard/recent-activity-card"
import { cn } from "@/lib/utils"
import {
  isWithinInterval,
  startOfToday, endOfToday,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  startOfYear, endOfYear,
  subDays, subWeeks, subMonths, subYears,
  parseISO
} from "date-fns"


export default function Dashboard() {
  const { user } = useAuth()
  const [externalTickets, setExternalTickets] = useState<ExternalTicket[]>([]);
  const [internalTickets, setInternalTickets] = useState<InternalTicket[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [period, setPeriod] = useState("this-month");
  const [loading, setLoading] = useState(true);

  const months = [
    { value: '0', label: 'Janeiro' },
    { value: '1', label: 'Fevereiro' },
    { value: '2', label: 'Março' },
    { value: '3', label: 'Abril' },
    { value: '4', label: 'Maio' },
    { value: '5', label: 'Junho' },
    { value: '6', label: 'Julho' },
    { value: '7', label: 'Agosto' },
    { value: '8', label: 'Setembro' },
    { value: '9', label: 'Outubro' },
    { value: '10', label: 'Novembro' },
    { value: '11', label: 'Dezembro' },
  ];

  useEffect(() => {
    setLoading(true);

    const collectionsToFetch = [
      { name: 'external-tickets', setter: setExternalTickets },
      { name: 'internal-tickets', setter: setInternalTickets },
      { name: 'technicians', setter: setTechnicians },
      { name: 'sectors', setter: setSectors },
      { name: 'users', setter: setUsers },
    ];

    let loadedCount = 0;
    const totalCollections = collectionsToFetch.length;

    const unsubscribes = collectionsToFetch.map(({ name, setter }) => {
      const q = query(collection(db, name));
      return onSnapshot(q,
        (snapshot) => {
          setter(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any);
          loadedCount++;
          if (loadedCount === totalCollections) setLoading(false);
        },
        (error) => {
          console.warn(`A coleção '${name}' não foi encontrada ou ocorreu um erro. Tratando como vazia.`, error);
          setter([]);
          loadedCount++;
          if (loadedCount === totalCollections) setLoading(false);
        }
      );
    });

    const timer = setTimeout(() => setLoading(false), 5000);

    return () => {
      unsubscribes.forEach(unsub => unsub());
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { filteredData, prevData } = useMemo(() => {
    const now = new Date();

    const getInterval = (p: string) => {
      if (p.startsWith('month-')) {
        const monthIndex = parseInt(p.split('-')[1], 10);
        const startDate = new Date(now.getFullYear(), monthIndex, 1);
        return { start: startDate, end: endOfMonth(startDate) };
      }
      switch (p) {
        case "today":     return { start: startOfToday(), end: endOfToday() };
        case "this-week": return { start: startOfWeek(now), end: endOfWeek(now) };
        case "this-year": return { start: startOfYear(now), end: endOfYear(now) };
        default:          return { start: startOfMonth(now), end: endOfMonth(now) };
      }
    };

    const getPrevInterval = (p: string) => {
      if (p.startsWith('month-')) {
        const monthIndex = parseInt(p.split('-')[1], 10);
        const prevMonth = monthIndex === 0 ? 11 : monthIndex - 1;
        const year = monthIndex === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const startDate = new Date(year, prevMonth, 1);
        return { start: startDate, end: endOfMonth(startDate) };
      }
      switch (p) {
        case "today":     return { start: subDays(startOfToday(), 1), end: subDays(endOfToday(), 1) };
        case "this-week": return { start: subWeeks(startOfWeek(now), 1), end: subWeeks(endOfWeek(now), 1) };
        case "this-year": return { start: startOfYear(subYears(now, 1)), end: endOfYear(subYears(now, 1)) };
        default:          return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      }
    };

    const interval = getInterval(period);
    const prevInterval = getPrevInterval(period);

    return {
      filteredData: {
        externalTickets: externalTickets.filter(t => t.createdAt && isWithinInterval(parseISO(t.createdAt), interval)),
        internalTickets: internalTickets.filter(t => t.createdAt && isWithinInterval(parseISO(t.createdAt), interval)),
      },
      prevData: {
        externalTickets: externalTickets.filter(t => t.createdAt && isWithinInterval(parseISO(t.createdAt), prevInterval)),
      },
    };
  }, [period, externalTickets, internalTickets]);

  if (loading || !user) {
    return (
      <div className="space-y-6">
        <DashboardSkeleton />
      </div>
    );
  }

  const allTeamMembers = [...users, ...technicians];

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  const getContextDescription = () => {
    const active = externalTickets.filter(t => t.status === 'em andamento').length;
    const pending = externalTickets.filter(t => t.status === 'pendente').length;
    if (active === 0 && pending === 0) return "Nenhum chamado ativo no momento.";
    const parts: string[] = [];
    if (pending > 0) parts.push(`${pending} pendente${pending !== 1 ? 's' : ''}`);
    if (active > 0) parts.push(`${active} em andamento`);
    return `Operação atual: ${parts.join(' · ')}`;
  };

  const getDelta = (current: number, previous: number) => {
    if (previous === 0) return null;
    return current - previous;
  };

  const renderContent = () => {
    switch (user.role) {
      case "admin":
      case "gerente": {
        const pendingTickets   = filteredData.externalTickets.filter(t => t.status === 'pendente').length;
        const inProgressTickets = filteredData.externalTickets.filter(t => t.status === 'em andamento').length;
        const concludedTickets  = filteredData.externalTickets.filter(t => t.status === 'concluído').length;
        const totalTickets      = filteredData.externalTickets.length;
        const completionRate    = totalTickets > 0 ? Math.round((concludedTickets / totalTickets) * 100) : 0;

        const prevConcluded    = prevData.externalTickets.filter(t => t.status === 'concluído').length;
        const prevTotal        = prevData.externalTickets.length;
        const prevRate         = prevTotal > 0 ? Math.round((prevConcluded / prevTotal) * 100) : 0;
        const concludedDelta   = getDelta(concludedTickets, prevConcluded);
        const rateDelta        = getDelta(completionRate, prevRate);

        return (
          <div className="space-y-6">
            <AlertPanel tickets={externalTickets} />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Chamados Pendentes</CardTitle>
                  <div className="p-1.5 rounded-lg bg-indigo-500/10">
                    <Clock className="h-4 w-4 text-indigo-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingTickets}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">Aguardando atribuição no período</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
                  <div className="p-1.5 rounded-lg bg-orange-500/10">
                    <Wrench className="h-4 w-4 text-orange-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{inProgressTickets}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">Atribuídos a um técnico</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
                  <div className="p-1.5 rounded-lg bg-emerald-500/10">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{concludedTickets}</div>
                  {concludedDelta !== null ? (
                    <p className={cn(
                      "text-xs mt-0.5 flex items-center gap-1",
                      concludedDelta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                    )}>
                      {concludedDelta >= 0
                        ? <TrendingUp className="h-3 w-3" />
                        : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(concludedDelta)} vs período anterior
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">Finalizados no período</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <ClipboardList className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{completionRate}%</div>
                  {rateDelta !== null ? (
                    <p className={cn(
                      "text-xs mt-0.5 flex items-center gap-1",
                      rateDelta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                    )}>
                      {rateDelta >= 0
                        ? <TrendingUp className="h-3 w-3" />
                        : <TrendingDown className="h-3 w-3" />}
                      {rateDelta >= 0 ? "+" : ""}{rateDelta}pp vs período anterior
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {totalTickets > 0 ? `${concludedTickets} de ${totalTickets} chamados` : "Nenhum chamado no período"}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TrendChart tickets={filteredData.externalTickets} period={period} />
              <TopClientsCard tickets={filteredData.externalTickets} />
            </div>

            <PageHeader title="Visão por Setor" description="Métricas detalhadas para cada setor da empresa." />

            {sectors.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {sectors.map(sector => (
                  <SectorStatsCard
                    key={sector.id}
                    sector={sector}
                    tickets={filteredData.externalTickets.filter(t => t.sectorId === sector.id)}
                    technicians={technicians.filter(t => t.sectorIds && t.sectorIds.includes(sector.id))}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <p>Nenhum setor cadastrado para exibir estatísticas.</p>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ActiveRoutesCard technicians={technicians} tickets={externalTickets} />
              <RecentActivityCard tickets={filteredData.externalTickets} users={allTeamMembers} title="Atividade Recente (Geral)" />
            </div>
          </div>
        );
      }

      case "encarregado": {
        if (!user.sectorIds || user.sectorIds.length === 0) {
          return (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                  <p className="font-semibold">Nenhum Setor Associado</p>
                  <p className="text-sm">Você não está associado a nenhum setor. Peça para um administrador te vincular.</p>
                </div>
              </CardContent>
            </Card>
          );
        }

        const mySectors       = sectors.filter(s => user.sectorIds?.includes(s.id));
        const mySectorTickets = filteredData.externalTickets.filter(t => user.sectorIds?.includes(t.sectorId ?? ''));
        const mySectorTechs   = allTeamMembers.filter(t => t.sectorIds && t.sectorIds.some((id: string) => user.sectorIds?.includes(id)));

        return (
          <div className="space-y-6">
            <AlertPanel tickets={externalTickets.filter(t => user.sectorIds?.includes(t.sectorId ?? ''))} />

            <PageHeader title="Visão dos Meus Setores" description="Métricas detalhadas para os setores que você gerencia." />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {mySectors.map(sector => (
                <SectorStatsCard
                  key={sector.id}
                  sector={sector}
                  tickets={mySectorTickets.filter(t => t.sectorId === sector.id)}
                  technicians={technicians.filter(t => t.sectorIds && t.sectorIds.includes(sector.id))}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <RecentTicketsList
                tickets={mySectorTickets.filter(t => t.status === 'pendente' || t.status === 'em andamento')}
                users={mySectorTechs}
                title="Chamados Ativos dos Meus Setores"
              />
              <RecentActivityCard
                tickets={mySectorTickets.filter(t => t.status === 'concluído')}
                users={mySectorTechs}
                title="Últimos Chamados Concluídos"
              />
            </div>
          </div>
        );
      }

      case "tecnico": {
        const myExternal   = filteredData.externalTickets.filter(t => t.technicianId === user.id);
        const myInProgress = myExternal.filter(t => t.status === 'em andamento');
        const myConcluded  = myExternal.filter(t => t.status === 'concluído');
        const technician   = technicians.find(t => t.id === user.id);
        const mySectorId   = technician?.sectorIds?.[0];
        const sectorPending = mySectorId
          ? filteredData.externalTickets.filter(t => t.sectorId === mySectorId && t.status === 'pendente').length
          : 0;

        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
                  <div className="p-1.5 rounded-lg bg-orange-500/10">
                    <Wrench className="h-4 w-4 text-orange-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{myInProgress.length}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">Chamados que você está trabalhando</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
                  <div className="p-1.5 rounded-lg bg-emerald-500/10">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{myConcluded.length}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">Finalizados no período</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pendentes no Setor</CardTitle>
                  <div className="p-1.5 rounded-lg bg-indigo-500/10">
                    <Clock className="h-4 w-4 text-indigo-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sectorPending}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">Disponíveis para assumir</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4">
              <RecentTicketsList tickets={myInProgress} users={allTeamMembers} title="Meus Chamados Ativos" />
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <>
      <PageHeader
        title={`${getGreeting()}, ${user.name.split(' ')[0]}!`}
        description={getContextDescription()}
      >
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="this-week">Esta Semana</SelectItem>
            <SelectItem value="this-month">Este Mês</SelectItem>
            <SelectItem value="this-year">Este Ano</SelectItem>
            <SelectSeparator />
            {months.map(month => (
              <SelectItem key={month.value} value={`month-${month.value}`}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>
      <div className="space-y-6">
        {renderContent()}
      </div>
    </>
  );
}
