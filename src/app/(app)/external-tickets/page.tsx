
"use client"

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, LayoutDashboard, List, RefreshCcw, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NewExternalTicketForm, NewExternalTicketFormValues } from "@/components/external-tickets/new-external-ticket-form";
import { ExternalTicket, Sector, User, Technician, Comment, Checklist, ChecklistTaskState } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { ExternalTicketCard } from "@/components/external-tickets/external-ticket-card";
import { ExternalTicketsFilterBar, StatusFilter } from "@/components/external-tickets/external-tickets-filter-bar";
import { TicketsStatsBar } from "@/components/external-tickets/tickets-stats-bar";
import { useToast } from "@/hooks/use-toast";
import { addDoc, collection, getDocs, doc, updateDoc, deleteField, writeBatch, onSnapshot, arrayUnion, getDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { isToday, parseISO, isPast, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ExternalTicketsTable } from "@/components/external-tickets/external-tickets-table";
import { useIsMobile } from "@/hooks/use-mobile";
import { sendWhatsappMessage } from "@/lib/services/notification-service";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from "xlsx";


type ConfirmationState = {
    isOpen: boolean;
    action: 'reopen' | 'cancel' | 'take' | 'reassign' | null;
    ticket: ExternalTicket | null;
    reason?: string;
    reassignTechnicianId?: string;
};

const STATUS_FILTER_STORAGE_KEY = 'external_tickets_status_filter';
const VIEW_MODE_STORAGE_KEY = 'external_tickets_view_mode';

type ViewMode = 'kanban' | 'list';
const TICKETS_PER_PAGE = 20;

export default function ExternalTicketsPage() {
  const [isNewTicketDialogOpen, setIsNewTicketDialogOpen] = useState(false);
  const [tickets, setTickets] = useState<ExternalTicket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [confirmation, setConfirmation] = useState<ConfirmationState>({ isOpen: false, action: null, ticket: null, reason: '', reassignTechnicianId: '' });
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');

  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    if (typeof window !== 'undefined') {
      return (sessionStorage.getItem(STATUS_FILTER_STORAGE_KEY) as StatusFilter) || 'pendente';
    }
    return 'pendente';
  });
  const [technicianFilter, setTechnicianFilter] = useState<string>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [contractOnly, setContractOnly] = useState(false);
  const [myTicketsOnly, setMyTicketsOnly] = useState(false);

  useEffect(() => {
    const storedViewMode = sessionStorage.getItem(VIEW_MODE_STORAGE_KEY) as ViewMode | null;
    if (isMobile) {
      setViewMode('kanban');
    } else {
      setViewMode(storedViewMode || 'kanban');
    }
  }, [isMobile]);

  useEffect(() => {
    setLoading(true);

    let loadedCount = 0;
    const totalCollections = 5;

    const onCollectionLoad = () => {
        loadedCount++;
        if (loadedCount === totalCollections) setLoading(false);
    };

    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
        const usersData = snapshot.docs.map(doc => {
            const userData = { id: doc.id, ...doc.data() } as User;
            if ((userData as any).sectorId && !userData.sectorIds) {
                userData.sectorIds = [(userData as any).sectorId];
            } else if (!userData.sectorIds) {
                userData.sectorIds = [];
            }
            return userData;
        });
        setUsers(usersData);
        onCollectionLoad();
    }, () => { setUsers([]); onCollectionLoad(); });

    const unsubSectors = onSnapshot(collection(db, "sectors"), (snapshot) => {
        setSectors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sector)));
        onCollectionLoad();
    }, () => { setSectors([]); onCollectionLoad(); });

    const unsubTechs = onSnapshot(collection(db, "technicians"), (snapshot) => {
        setTechnicians(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Technician)));
        onCollectionLoad();
    }, () => { setTechnicians([]); onCollectionLoad(); });

    const unsubTickets = onSnapshot(collection(db, "external-tickets"), (snapshot) => {
        setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExternalTicket)));
        setPullDistance(0);
        onCollectionLoad();
    }, () => { setTickets([]); onCollectionLoad(); });

    const unsubChecklists = onSnapshot(collection(db, "checklists"), (snapshot) => {
        setChecklists(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Checklist)));
        onCollectionLoad();
    }, () => { setChecklists([]); onCollectionLoad(); });

    const timer = setTimeout(() => setLoading(false), 5000);

    return () => {
        unsubUsers(); unsubSectors(); unsubTechs(); unsubTickets(); unsubChecklists();
        clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sessionStorage.setItem(STATUS_FILTER_STORAGE_KEY, statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, technicianFilter, sectorFilter, contractOnly, myTicketsOnly, searchQuery, dateFrom, dateTo]);

  useEffect(() => {
    if (!isMobile) sessionStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode, isMobile]);

  useEffect(() => {
    if ((statusFilter === 'em andamento' || statusFilter === 'concluído') && technicianFilter === 'all') {
      setMyTicketsOnly(true);
    } else {
      setMyTicketsOnly(false);
    }
    if (statusFilter === 'pendente') setTechnicianFilter('all');
  }, [statusFilter, technicianFilter]);

  useEffect(() => {
    if (technicianFilter !== 'all') setMyTicketsOnly(false);
  }, [technicianFilter]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) setPullStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY === 0 && pullStartY > 0) {
      const distance = e.touches[0].clientY - pullStartY;
      if (distance > 0) {
        e.preventDefault();
        setPullDistance(Math.min(distance, 150));
      }
    }
  };

  const handleTouchEnd = () => {
    setPullDistance(0);
    setPullStartY(0);
  };

  const handleAddTicket = async (values: NewExternalTicketFormValues & { type: 'padrão' | 'contrato' | 'urgente' | 'agendado' | 'retorno', slaExpiresAt?: string, priority?: string }) => {
    if (!user) return;

    const newTicketData: Partial<ExternalTicket> = {
      client: {
        id: '',
        name: values.clientName,
        phone: values.contact || '',
        isWhats: values.isWhatsapp,
      },
      sectorId: values.sectorId,
      creatorId: user.id,
      description: values.description,
      type: values.type,
      status: 'pendente' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(values.priority && { priority: values.priority as any }),
    };

    if (values.clientId) newTicketData.client!.id = values.clientId;

    if (values.address?.street) {
      newTicketData.client!.address = `${values.address.street}, ${values.address.number || 'S/N'} - ${values.address.neighborhood}, ${values.address.city} - ${values.address.state}`;
    }

    if (values.requesterName) newTicketData.requesterName = values.requesterName;

    if (values.assigneeId) {
      newTicketData.technicianId = values.assigneeId;
      newTicketData.status = 'em andamento';
    }

    if (values.scheduledToDate) {
      const timePart = values.scheduledToTime || '00:00:00';
      const datePart = values.scheduledToDate.toISOString().split('T')[0];
      newTicketData.scheduledTo = `${datePart}T${timePart}`;
    }

    if (values.slaExpiresAt) newTicketData.slaExpiresAt = values.slaExpiresAt;

    if (values.checklistId) {
      const selectedChecklist = checklists.find(c => c.id === values.checklistId);
      if (selectedChecklist) {
          newTicketData.checklistId = values.checklistId;
          newTicketData.checklist = selectedChecklist.tasks.map(task => ({ taskId: task.id, completed: false, observation: '', photo: '' }));
      }
    }

    try {
      const docRef = await addDoc(collection(db, "external-tickets"), newTicketData);

      const sector = sectors.find(s => s.id === newTicketData.sectorId);
      const sectorGroupId = sector?.whatsappGroupId;
      const assignedTechnician = technicians.find(t => t.id === newTicketData.technicianId);
      let messageStatusText = newTicketData.technicianId && assignedTechnician
        ? `*Status:* Em andamento por ${assignedTechnician.name}`
        : `*Status:* Pendente`;

      let message = `⚠️ Novo Chamado Criado ⚠️\n\n`
        + `*Cliente:* ${newTicketData.client!.name}\n`
        + `*Contato:* ${newTicketData.client!.phone || 'N/A'}\n`
        + `*Solicitante:* ${newTicketData.requesterName || 'N/A'}\n`
        + `*Endereço:* ${newTicketData.client!.address || 'N/A'}\n\n`
        + `*Descrição:* ${newTicketData.description}\n\n`
        + `*Tipo:* ${newTicketData.type}`;

      if (newTicketData.type === 'contrato' && newTicketData.priority) {
        message += `\n*Prioridade do Contrato:* 🚨${newTicketData.priority}`;
      }
      message += `\n*Atribuído por:* ${user.name}\n\n${messageStatusText}`;

      if (newTicketData.technicianId) {
        const techUser = users.find(u => u.id === assignedTechnician?.userId);
        if (techUser?.phone) await sendWhatsappMessage(techUser.phone, message, techUser.id, `/external-tickets/${docRef.id}`);
      }
      if (sectorGroupId) await sendWhatsappMessage(sectorGroupId, message);

      await addDoc(collection(db, "system-logs"), {
        userId: user.id,
        event: 'EXTERNAL_TICKET_CREATED',
        timestamp: new Date().toISOString(),
        details: { ticketId: docRef.id, clientName: values.clientName },
      });

      setIsNewTicketDialogOpen(false);
      toast({ title: 'Chamado criado com sucesso!', description: `O chamado para ${values.clientName} foi aberto.` });

    } catch (error) {
       console.error("Error adding ticket: ", error);
       toast({ variant: "destructive", title: "Erro ao criar chamado", description: "Ocorreu um erro ao salvar os dados. Tente novamente." });
       throw error;
    }
  }

  const handleViewDetails = (ticketId: string) => router.push(`/external-tickets/${ticketId}`);

  const handleStatusChange = async (id: string, status: ExternalTicket['status']) => {
    const ticketRef = doc(db, "external-tickets", id);
    try {
      await updateDoc(ticketRef, { status, updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error(`Error updating status for ticket ${id}:`, error);
      toast({ variant: "destructive", title: "Erro ao atualizar status", description: "Não foi possível atualizar o chamado. Tente novamente." });
    }
  };

  const handleAssignTicket = async (id: string) => {
    if (!user) return;
    const ticketRef = doc(db, "external-tickets", id);
    try {
        const ticket = tickets.find(t => t.id === id);
        if (ticket) {
            const updatePayload: Record<string, any> = {
                technicianId: user.id,
                status: 'em andamento',
                updatedAt: new Date().toISOString(),
            };
            if (!ticket.sectorId && user.sectorIds?.length > 0) {
                updatePayload.sectorId = user.sectorIds[0];
            }
            await updateDoc(ticketRef, updatePayload);

            const claimedSectorId = ticket.sectorId || updatePayload.sectorId;
            const sector = sectors.find(s => s.id === claimedSectorId);
            if (sector?.whatsappGroupId) {
                await sendWhatsappMessage(sector.whatsappGroupId, `🏃‍♂️ Chamado em Andamento 🏃‍♂️\n\n*Cliente:* ${ticket.client.name}\n*Status:* Em andamento por ${user.name}`);
            }
        }
        toast({ title: 'Chamado Atribuído!', description: `Você pegou o chamado #${id.substring(0,4)}.` });
    } catch (error) {
        console.error(`Error assigning ticket ${id}:`, error);
        toast({ variant: 'destructive', title: 'Erro ao atribuir chamado.' });
    }
  }

  const handleReassignTicket = async (id: string, newTechnicianId: string) => {
    if (!user) return;
    const ticketRef = doc(db, "external-tickets", id);
    try {
      const newTech = users.find(u => u.id === newTechnicianId);
      await updateDoc(ticketRef, {
        technicianId: newTechnicianId,
        status: 'em andamento',
        updatedAt: new Date().toISOString(),
      });
      toast({ title: 'Técnico reatribuído!', description: `Chamado atribuído a ${newTech?.name || 'novo técnico'}.` });
    } catch (error) {
      console.error(`Error reassigning ticket ${id}:`, error);
      toast({ variant: 'destructive', title: 'Erro ao reatribuir chamado.' });
    }
  };

  const handleSetEnRoute = async (ticketId: string) => {
    if (!user || user.role !== 'tecnico') return;
    const batch = writeBatch(db);
    let targetTicket: ExternalTicket | undefined;
    const enRouteTime = new Date().toISOString();

    tickets.forEach(t => {
        if (t.technicianId === user.id) {
            if (t.enRoute && t.id !== ticketId) {
                batch.update(doc(db, "external-tickets", t.id), { enRoute: deleteField(), enRouteAt: deleteField() });
            }
            if (t.id === ticketId) {
                batch.update(doc(db, "external-tickets", ticketId), { enRoute: true, enRouteAt: enRouteTime });
                targetTicket = { ...t, enRoute: true, enRouteAt: enRouteTime };
            }
        }
    });

    try {
        await batch.commit();
        if (targetTicket) {
            toast({ title: 'A caminho!', description: `Próximo destino: ${targetTicket.client.name}.` });
        }
    } catch (error) {
        console.error("Error setting en-route status:", error);
        toast({ variant: "destructive", title: "Erro ao marcar rota" });
    }
  };

  const handleReopenTicket = async (id: string, reason: string) => {
    if (!user) return;
    const ticketRef = doc(db, "external-tickets", id);
    try {
      const comment: Comment = { id: `comment-${Date.now()}`, authorId: user.id, content: `**Chamado Reaberto:** ${reason}`, createdAt: new Date().toISOString() };
      await updateDoc(ticketRef, { status: 'pendente', type: 'retorno', technicianId: deleteField(), updatedAt: new Date().toISOString(), comments: arrayUnion(comment) });
      toast({ title: 'Chamado Reaberto!', description: `O chamado #${id.substring(0,4)} foi movido para pendentes como retorno.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao reabrir chamado" });
    }
  };

  const handleCancelTicket = async (id: string, reason: string) => {
    if (!user) return;
    const ticketRef = doc(db, "external-tickets", id);
    try {
        const comment: Comment = { id: `comment-${Date.now()}`, authorId: user.id, content: `**Chamado Cancelado:** ${reason}`, createdAt: new Date().toISOString() };
        await updateDoc(ticketRef, { status: 'cancelado', updatedAt: new Date().toISOString(), comments: arrayUnion(comment) });
        toast({ title: 'Chamado Cancelado', description: `O chamado #${id.substring(0,4)} foi cancelado.` });
    } catch (error) {
        toast({ variant: "destructive", title: "Erro ao cancelar chamado" });
    }
  };

  const handleConfirmAction = (action: 'reopen' | 'cancel' | 'take' | 'reassign', ticket: ExternalTicket) => {
    setConfirmation({ isOpen: true, action, ticket, reason: '', reassignTechnicianId: '' });
  };

  const executeConfirmedAction = async () => {
    if (!confirmation.ticket || !confirmation.action) return;
    const { ticket, action, reason, reassignTechnicianId } = confirmation;

    if (action === 'reopen' || action === 'cancel') {
        if (!reason) { toast({ variant: 'destructive', title: 'Justificativa obrigatória' }); return; }
        if (action === 'reopen') await handleReopenTicket(ticket.id, reason);
        else await handleCancelTicket(ticket.id, reason);
    } else if (action === 'take') {
        await handleAssignTicket(ticket.id);
    } else if (action === 'reassign') {
        if (!reassignTechnicianId) { toast({ variant: 'destructive', title: 'Selecione um técnico.' }); return; }
        await handleReassignTicket(ticket.id, reassignTechnicianId);
    }

    setConfirmation({ isOpen: false, action: null, ticket: null });
  };

  const getConfirmationContent = () => {
    switch (confirmation.action) {
      case 'reopen': return (
        <>
          <AlertDialogTitle>Reabrir Chamado</AlertDialogTitle>
          <AlertDialogDescription>Informe o motivo para reabrir este chamado. A justificativa será adicionada aos comentários.</AlertDialogDescription>
          <div className="py-4">
            <Label htmlFor="reopen-reason">Justificativa</Label>
            <Textarea id="reopen-reason" placeholder="Ex: O problema persistiu..." value={confirmation.reason} onChange={(e) => setConfirmation(c => ({ ...c, reason: e.target.value }))} />
          </div>
        </>
      );
      case 'cancel': return (
        <>
          <AlertDialogTitle>Confirmar Cancelamento</AlertDialogTitle>
          <AlertDialogDescription>Informe o motivo do cancelamento. Essa informação será salva nos comentários do chamado.</AlertDialogDescription>
          <div className="py-4">
            <Label htmlFor="cancel-reason">Justificativa</Label>
            <Textarea id="cancel-reason" placeholder="Ex: Cliente solicitou o cancelamento..." value={confirmation.reason} onChange={(e) => setConfirmation(c => ({ ...c, reason: e.target.value }))} />
          </div>
        </>
      );
      case 'take': return (
        <>
          <AlertDialogTitle>Confirmar Atribuição</AlertDialogTitle>
          <AlertDialogDescription>Você tem certeza que deseja pegar este chamado?</AlertDialogDescription>
        </>
      );
      case 'reassign': {
        const sectorId = confirmation.ticket?.sectorId;
        const eligibleUsers = users.filter(u =>
          (u.role === 'tecnico' || u.role === 'encarregado') &&
          (!sectorId || u.sectorIds?.includes(sectorId))
        );
        return (
          <>
            <AlertDialogTitle>Reatribuir Técnico</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione o novo técnico para assumir o chamado de <strong>{confirmation.ticket?.client.name}</strong>.
            </AlertDialogDescription>
            <div className="py-4">
              <Label htmlFor="reassign-tech">Novo Técnico</Label>
              <Select
                value={confirmation.reassignTechnicianId || ''}
                onValueChange={(v) => setConfirmation(c => ({ ...c, reassignTechnicianId: v }))}
              >
                <SelectTrigger id="reassign-tech" className="mt-1">
                  <SelectValue placeholder="Selecione um técnico..." />
                </SelectTrigger>
                <SelectContent>
                  {eligibleUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                  {eligibleUsers.length === 0 && (
                    <SelectItem value="__none__" disabled>Nenhum técnico disponível neste setor</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </>
        );
      }
      default: return null;
    }
  };

  const handleExport = () => {
    if (!filteredAndSortedTickets.length) {
      toast({ title: 'Nada para exportar', description: 'Nenhum chamado encontrado com os filtros atuais.' });
      return;
    }

    const data = filteredAndSortedTickets.map(t => ({
      'ID': t.id.substring(0, 8),
      'Cliente': t.client.name,
      'Descrição': t.description,
      'Solicitante': t.requesterName || '',
      'Status': t.status,
      'Tipo': t.type,
      'Prioridade': t.priority || '',
      'Técnico': users.find(u => u.id === t.technicianId)?.name || '',
      'Setor': sectors.find(s => s.id === t.sectorId)?.name || '',
      'Endereço': t.client.address || '',
      'Telefone': t.client.phone || '',
      'Criado em': format(parseISO(t.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      'Atualizado em': format(parseISO(t.updatedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      'Agendado para': t.scheduledTo ? format(parseISO(t.scheduledTo), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '',
      'SLA expira': t.slaExpiresAt ? format(parseISO(t.slaExpiresAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Chamados Externos');
    XLSX.writeFile(wb, `chamados_externos_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast({ title: 'Exportado!', description: `${data.length} chamados exportados para Excel.` });
  };

  const filteredAndSortedTickets = useMemo(() => {
    const filtered = tickets.filter(ticket => {
        if (user?.role === 'encarregado' || user?.role === 'tecnico') {
            if (ticket.sectorId && !user.sectorIds?.includes(ticket.sectorId)) return false;
        }

        if (dateFrom && ticket.createdAt.substring(0, 10) < dateFrom) return false;
        if (dateTo && ticket.createdAt.substring(0, 10) > dateTo) return false;

        const query = searchQuery.toLowerCase();
        if (query &&
            !ticket.client.name.toLowerCase().includes(query) &&
            !ticket.description.toLowerCase().includes(query) &&
            !(ticket.requesterName && ticket.requesterName.toLowerCase().includes(query))
        ) return false;

        if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
        if (technicianFilter !== 'all' && ticket.technicianId !== technicianFilter) return false;
        if (sectorFilter !== 'all' && ticket.sectorId !== sectorFilter) return false;
        if (contractOnly && ticket.type !== 'contrato') return false;
        if (myTicketsOnly && user && ticket.technicianId !== user.id) return false;

        return true;
    });

    return filtered.sort((a, b) => {
        if (statusFilter === 'concluído' || statusFilter === 'all') {
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }

        if (statusFilter === 'em andamento' && user?.routeOrder && user.routeOrder.length > 0) {
            const routeOrder = user.routeOrder;
            const indexA = routeOrder.indexOf(a.id);
            const indexB = routeOrder.indexOf(b.id);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
        }

        const priorityOrder = { 'agendado-atrasado': -1, 'agendado-hoje': 0, 'retorno': 1, 'contrato': 2, 'urgente': 3, 'padrão': 4, 'agendado-futuro': 5 };
        const getPriority = (ticket: ExternalTicket) => {
            if (ticket.type === 'agendado' && ticket.scheduledTo) {
                const scheduledDate = parseISO(ticket.scheduledTo);
                if (isPast(scheduledDate) && !isToday(scheduledDate)) return priorityOrder['agendado-atrasado'];
                if (isToday(scheduledDate)) return priorityOrder['agendado-hoje'];
                return priorityOrder['agendado-futuro'];
            }
            return priorityOrder[ticket.type as keyof typeof priorityOrder] ?? 99;
        };
        const priorityA = getPriority(a);
        const priorityB = getPriority(b);
        if (priorityA !== priorityB) return priorityA - priorityB;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [tickets, user, statusFilter, technicianFilter, sectorFilter, contractOnly, myTicketsOnly, searchQuery, dateFrom, dateTo]);

  const shouldPaginate = statusFilter === 'all' || !!searchQuery || !!(dateFrom || dateTo);
  const totalPages = Math.ceil(filteredAndSortedTickets.length / TICKETS_PER_PAGE);
  const paginatedTickets = shouldPaginate
    ? filteredAndSortedTickets.slice((currentPage - 1) * TICKETS_PER_PAGE, currentPage * TICKETS_PER_PAGE)
    : filteredAndSortedTickets;

  const hasActiveRoute = tickets.some(t => t.technicianId === user?.id && t.enRoute);

  if (loading) {
    return (
        <div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center gap-4 text-center">
            <div className="space-y-4">
                <div className="mx-auto h-24 w-48 animate-pulse rounded-md bg-muted" />
                <h2 className="text-xl font-semibold">Carregando Chamados...</h2>
                <p className="text-muted-foreground">Por favor, aguarde enquanto buscamos os dados.</p>
                <p className="text-sm font-bold text-muted-foreground pt-2">Nexus Service</p>
            </div>
        </div>
    );
  }

  return (
    <>
    <Dialog open={isNewTicketDialogOpen} onOpenChange={setIsNewTicketDialogOpen}>
      <PageHeader title="Chamados Externos" description="Gerencie os chamados de clientes externos.">
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} title="Exportar para Excel" className="hidden sm:flex">
              <Download className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            {!isMobile && (
                <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)}>
                    <ToggleGroupItem value="kanban" aria-label="Kanban view"><LayoutDashboard className="h-4 w-4" /></ToggleGroupItem>
                    <ToggleGroupItem value="list" aria-label="List view"><List className="h-4 w-4" /></ToggleGroupItem>
                </ToggleGroup>
            )}
            <DialogTrigger asChild>
                <Button className="hidden sm:flex">
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo Chamado
                </Button>
            </DialogTrigger>
        </div>
      </PageHeader>

      <div
        className="w-full min-w-0"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'pan-y' }}
      >
        <div
            className="flex items-center justify-center overflow-hidden text-muted-foreground transition-all duration-300"
            style={{ height: pullDistance / 2, opacity: Math.min(pullDistance / 100, 1) }}
        >
            <RefreshCcw className={`h-6 w-6 ${pullDistance > 100 ? 'animate-spin' : ''}`} />
        </div>

        <div className="space-y-3 pb-4">
          <TicketsStatsBar tickets={tickets} />

          <ExternalTicketsFilterBar
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            technicianFilter={technicianFilter}
            onTechnicianChange={setTechnicianFilter}
            sectorFilter={sectorFilter}
            onSectorChange={setSectorFilter}
            contractOnly={contractOnly}
            onContractOnlyChange={setContractOnly}
            myTicketsOnly={myTicketsOnly}
            onMyTicketsOnlyChange={setMyTicketsOnly}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            dateFrom={dateFrom}
            onDateFromChange={setDateFrom}
            dateTo={dateTo}
            onDateToChange={setDateTo}
            currentUser={user}
            sectors={sectors}
          />
        </div>

        {viewMode === 'kanban' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-w-0">
                {paginatedTickets.map(ticket => (
                <ExternalTicketCard
                    key={ticket.id}
                    ticket={ticket}
                    users={users}
                    sectors={sectors}
                    currentUser={user}
                    hasActiveRoute={hasActiveRoute}
                    onViewDetails={() => handleViewDetails(ticket.id)}
                    onConfirmAction={handleConfirmAction}
                    onAssignToMe={() => handleConfirmAction('take', ticket)}
                    onSetEnRoute={() => handleSetEnRoute(ticket.id)}
                    onStatusChange={handleStatusChange}
                />
                ))}
                {paginatedTickets.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-10">
                    Nenhum chamado encontrado com os filtros selecionados.
                </div>
                )}
            </div>
        ) : (
            <ExternalTicketsTable
              data={paginatedTickets}
              users={users}
              sectors={sectors}
              currentUser={user}
              hasActiveRoute={hasActiveRoute}
              onSetEnRoute={handleSetEnRoute}
              onViewDetails={handleViewDetails}
            />
        )}

        {shouldPaginate && totalPages > 1 && (
            <div className="flex items-center justify-between py-4">
                <span className="text-sm text-muted-foreground">
                    {currentPage} / {totalPages}
                </span>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" className="h-10 w-10 md:h-8 md:w-auto md:px-3 p-0" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
                        <ChevronLeft className="h-4 w-4" />
                        <span className="sr-only md:not-sr-only md:ml-1.5 text-sm">Anterior</span>
                    </Button>
                    <Button variant="outline" className="h-10 w-10 md:h-8 md:w-auto md:px-3 p-0" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>
                        <span className="sr-only md:not-sr-only md:mr-1.5 text-sm">Próximo</span>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        )}
      </div>

       <DialogContent className="w-full max-w-full sm:max-w-4xl h-[100dvh] sm:h-auto overflow-y-auto">
            <DialogHeader>
            <DialogTitle>Novo Chamado Externo</DialogTitle>
            </DialogHeader>
            <NewExternalTicketForm
                onFinished={() => setIsNewTicketDialogOpen(false)}
                onSave={async (values) => { await handleAddTicket(values); }}
            />
        </DialogContent>

        <div className="fixed bottom-[5.5rem] md:bottom-6 right-6 z-50">
            <DialogTrigger asChild>
                <Button size="icon" className="rounded-full h-14 w-14 shadow-lg">
                    <PlusCircle className="h-6 w-6" />
                    <span className="sr-only">Novo Chamado</span>
                </Button>
            </DialogTrigger>
        </div>

       <AlertDialog open={confirmation.isOpen} onOpenChange={(open) => !open && setConfirmation({isOpen: false, action: null, ticket: null})}>
        <AlertDialogContent>
            <AlertDialogHeader>
                {getConfirmationContent()}
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={executeConfirmedAction}
                  disabled={
                    ((confirmation.action === 'reopen' || confirmation.action === 'cancel') && !confirmation.reason) ||
                    (confirmation.action === 'reassign' && !confirmation.reassignTechnicianId)
                  }
                >
                  Confirmar
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
    </>
  );
}
