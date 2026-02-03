"use client"

import { ClipboardList, Wrench, Users, CheckCircle, Clock, List, AlertCircle, Loader2 } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { useAuth } from "@/hooks/use-auth"
import { RecentTicketsList } from "@/components/dashboard/recent-tickets-list"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectSeparator } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusChart } from "@/components/dashboard/status-chart"
import { ActiveRoutesCard } from "@/components/dashboard/active-routes-card"
import { useEffect, useState, useMemo } from "react"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { db } from "@/firebase/config"
import { ExternalTicket, InternalTicket, Sector, Technician, User } from "@/lib/types"
import { SectorStatsCard } from "@/components/dashboard/sector-stats-card"
import { RecentActivityCard } from "@/components/dashboard/recent-activity-card"
import { isWithinInterval, startOfToday, endOfToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from "date-fns"


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
                if (loadedCount === totalCollections) {
                    setLoading(false);
                }
            },
            (error) => {
                console.warn(`A coleção '${name}' não foi encontrada ou ocorreu um erro. Tratando como vazia.`, error);
                setter([]); // Garante que o estado seja um array vazio em caso de erro
                loadedCount++;
                if (loadedCount === totalCollections) {
                    setLoading(false);
                }
            }
        );
    });

    // Failsafe: se algo der muito errado, desativa o loading após 5 segundos.
    const timer = setTimeout(() => {
        if (loading) {
            console.warn("Timeout de carregamento atingido. Forçando a renderização da UI.");
            setLoading(false);
        }
    }, 5000);

    return () => {
        unsubscribes.forEach(unsub => unsub());
        clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  const filteredData = useMemo(() => {
    const now = new Date();
    let interval;

    if (period.startsWith('month-')) {
        const monthIndex = parseInt(period.split('-')[1], 10);
        const year = now.getFullYear();
        const startDate = new Date(year, monthIndex, 1);
        const endDate = endOfMonth(startDate);
        interval = { start: startDate, end: endDate };
    } else {
        switch (period) {
            case "today":
                interval = { start: startOfToday(), end: endOfToday() };
                break;
            case "this-week":
                interval = { start: startOfWeek(now), end: endOfWeek(now) };
                break;
            case "this-year":
                interval = { start: startOfYear(now), end: endOfYear(now) };
                break;
            case "this-month":
            default:
                interval = { start: startOfMonth(now), end: endOfMonth(now) };
                break;
        }
    }

    const filteredExternal = externalTickets.filter(t => t.createdAt && isWithinInterval(parseISO(t.createdAt), interval));
    const filteredInternal = internalTickets.filter(t => t.createdAt && isWithinInterval(parseISO(t.createdAt), interval));

    return {
        externalTickets: filteredExternal,
        internalTickets: filteredInternal
    };
  }, [period, externalTickets, internalTickets]);


  if (loading || !user) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }
  
  const allTickets = [...filteredData.externalTickets, ...filteredData.internalTickets];
  const allTeamMembers = [...users, ...technicians];

  const renderContent = () => {
    switch (user.role) {
      case "admin":
      case "gerente":
        const pendingTickets = filteredData.externalTickets.filter(t => t.status === 'pendente').length;
        const inProgressTickets = filteredData.externalTickets.filter(t => t.status === 'em andamento').length;
        return (
          <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Chamados Pendentes</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingTickets}</div>
                        <p className="text-xs text-muted-foreground">Aguardando atribuição no período</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Chamados Em Andamento</CardTitle>
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{inProgressTickets}</div>
                         <p className="text-xs text-muted-foreground">Atribuídos a um técnico no período</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Técnicos Ativos</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{technicians.length}</div>
                        <p className="text-xs text-muted-foreground">Total de técnicos na equipe</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Chamados Concluídos</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{filteredData.externalTickets.filter(t=>t.status === 'concluído').length}</div>
                        <p className="text-xs text-muted-foreground">Finalizados no período selecionado</p>
                    </CardContent>
                </Card>
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
                    <CardContent className="pt-6">
                        <div className="text-center text-muted-foreground">
                            <p>Nenhum setor cadastrado para exibir estatísticas.</p>
                        </div>
                    </CardContent>
                </Card>
            )}

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <ActiveRoutesCard technicians={technicians} tickets={externalTickets} />
                 <RecentActivityCard tickets={filteredData.externalTickets} users={allTeamMembers} title="Atividade Recente (Geral)" />
             </div>
          </div>
        )
      case "encarregado":
        if (!user.sectorIds || user.sectorIds.length === 0) {
            return (
                <Card>
                    <CardContent className="pt-6">
                         <div className="text-center text-muted-foreground">
                            <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                            <p className="font-semibold">Nenhum Setor Associado</p>
                            <p className="text-sm">Você não está associado a nenhum setor. Peça para um administrador te vincular a um setor.</p>
                        </div>
                    </CardContent>
                </Card>
            );
        }
        const mySectors = sectors.filter(s => user.sectorIds?.includes(s.id));
        const mySectorTickets = filteredData.externalTickets.filter(t => user.sectorIds?.includes(t.sectorId));
        const mySectorTechs = allTeamMembers.filter(t => t.sectorIds && t.sectorIds.some(id => user.sectorIds?.includes(id)));
        return (
          <div className="space-y-6">
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
                 <RecentTicketsList tickets={mySectorTickets.filter(t => t.status === 'pendente' || t.status === 'em andamento')} users={mySectorTechs} title="Chamados Ativos dos Meus Setores" />
                 <RecentActivityCard tickets={mySectorTickets.filter(t => t.status === 'concluído')} users={mySectorTechs} title="Últimos Chamados Concluídos" />
            </div>
          </div>
        )
      case "tecnico":
        const myExternal = filteredData.externalTickets.filter(t => t.technicianId === user.id);
        const myInProgress = myExternal.filter(t => t.status === 'em andamento');
        const technician = technicians.find(t => t.id === user.id);
        const mySectorId = technician?.sectorIds?.[0];
        return (
           <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Meus Chamados em Andamento</CardTitle>
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{myInProgress.length}</div>
                            <p className="text-xs text-muted-foreground">Chamados que você está trabalhando</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{myExternal.filter(t=>t.status === 'concluído').length}</div>
                             <p className="text-xs text-muted-foreground">Finalizados no período</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pendentes no meu Setor</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{mySectorId ? filteredData.externalTickets.filter(t => t.sectorId === mySectorId && t.status === 'pendente').length : 0}</div>
                             <p className="text-xs text-muted-foreground">Disponíveis para pegar</p>
                        </CardContent>
                    </Card>
                </div>
                <div className="grid gap-4 md:grid-cols-1">
                    <RecentTicketsList tickets={myInProgress} users={allTeamMembers} title="Meus Chamados Ativos" />
                </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <>
      <PageHeader
        title={`Dashboard de ${user.name.split(' ')[0]}`}
        description={`Bem-vindo de volta! Aqui está um resumo da sua operação.`}
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
  )
}
