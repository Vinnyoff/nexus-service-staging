
'use client';

import { useParams, useRouter } from 'next/navigation';
import { ExternalTicketDetails } from '@/components/external-tickets/external-ticket-details';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Comment, ExternalTicket, User, Sector, Technician, TechnicalReport } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { doc, onSnapshot, updateDoc, arrayUnion, collection, getDocs, deleteField } from 'firebase/firestore';
import { db, storage } from '@/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { sendWhatsappMessage } from '@/lib/services/notification-service';
import { optimizeImage, optimizeSignature } from '@/lib/image-optimizer';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ExternalTicketDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<ExternalTicket | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [allSectors, setAllSectors] = useState<Sector[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    if (!ticketId) return;
    setLoading(true);

    const ticketRef = doc(db, "external-tickets", ticketId);
    const unsubscribeTicket = onSnapshot(ticketRef, (ticketSnap) => {
        if (ticketSnap.exists()) {
          setTicket({ id: ticketSnap.id, ...ticketSnap.data() } as ExternalTicket);
        } else {
          toast({ variant: 'destructive', title: 'Chamado não encontrado' });
          router.push('/external-tickets');
        }
    });

    const fetchRelatedData = async () => {
        try {
            const [usersSnapshot, sectorsSnapshot, techsSnapshot] = await Promise.all([
                getDocs(collection(db, "users")),
                getDocs(collection(db, "sectors")),
                getDocs(collection(db, "technicians"))
            ]);
            
            setUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
            setAllSectors(sectorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sector)));
            setTechnicians(techsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Technician)));
        } catch (error) {
            console.error("Error fetching related data: ", error);
            toast({ variant: 'destructive', title: 'Erro ao carregar dados de suporte' });
        } finally {
            setLoading(false);
        }
    };
    
    fetchRelatedData();

    return () => {
      unsubscribeTicket();
    };
  }, [ticketId, router, toast]);

  const handleAddComment = async (commentText: string) => {
    if (!ticket || !user) return;

    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      authorId: user.id,
      content: commentText,
      createdAt: new Date().toISOString(),
    };
    
    const ticketRef = doc(db, "external-tickets", ticket.id);

    try {
        await updateDoc(ticketRef, {
            comments: arrayUnion(newComment)
        });
    } catch (error) {
        console.error("Error adding comment: ", error);
        toast({ variant: 'destructive', title: 'Erro ao adicionar comentário' });
    }
  };
  
  const handleDescriptionChange = async (newDescription: string) => {
    if (!ticket) return;
    const ticketRef = doc(db, "external-tickets", ticket.id);
    try {
        await updateDoc(ticketRef, { description: newDescription });
        toast({ title: 'Descrição atualizada com sucesso!' });
    } catch (error) {
        console.error('Error updating description:', error);
        toast({ variant: 'destructive', title: 'Erro ao atualizar descrição' });
    }
  };

  const handleAssignTechnician = async (technicianId: string) => {
    if (!ticket || !user) return;
    const ticketRef = doc(db, "external-tickets", ticket.id);
    try {
        const assignedTechnician = technicians.find(t => t.id === technicianId);
        const techUser = users.find(u => u.id === assignedTechnician?.userId);
        const sector = allSectors.find(s => s.id === ticket.sectorId);
        const sectorName = sector?.name || 'Não informado';
        const sectorGroupId = sector?.whatsappGroupId;
        
        await updateDoc(ticketRef, {
            technicianId: technicianId,
            status: 'em andamento',
            updatedAt: new Date().toISOString(),
        });
        
        const message = `⚠️ Novo Chamado Criado ⚠️\n\n*Setor:* ${sectorName}\n*Cliente:* ${ticket.client.name}\n*Contato:* ${ticket.client.phone || 'N/A'}\n*Endereço:* ${ticket.client.address || 'N/A'}\n*Solicitante:* ${ticket.requesterName || 'N/A'}\n\n*Descrição:* ${ticket.description}\n\n*Prioridade:* ${ticket.type}\n*Status:* Em andamento por ${assignedTechnician?.name}\n*Atribuído por:* ${user.name}`;

        if (techUser?.phone) {
            await sendWhatsappMessage(techUser.phone, message);
        }
        if (sectorGroupId) {
            await sendWhatsappMessage(sectorGroupId, message);
        }

        toast({
            title: 'Chamado Atribuído!',
            description: `Chamado #${ticket.id.substring(0,4)} atribuído a ${assignedTechnician?.name || 'técnico'}.`
        });
    } catch (error) {
        console.error('Error assigning technician:', error);
        toast({ variant: 'destructive', title: 'Erro ao atribuir chamado' });
    }
  };
  
const handleFinalizeTicket = async (id: string, observations: string, photos: File[], signatureDataUrl?: string): Promise<boolean> => {
    if (!user || !ticket) {
        toast({ variant: 'destructive', title: 'Erro: Usuário ou chamado não encontrado.'});
        return false;
    }

    const finalizationTime = new Date().toISOString();
    const ticketRef = doc(db, "external-tickets", id);
    const sector = allSectors.find(s => s.id === ticket.sectorId);
    
    try {
        
        const photoURLs = await Promise.all(
            photos.map(async (photo) => {
                const optimizedPhoto = await optimizeImage(photo);
                const photoRef = ref(storage, `tickets/${id}/${Date.now()}-${optimizedPhoto.name}`);
                await uploadBytes(photoRef, optimizedPhoto);
                return await getDownloadURL(photoRef);
            })
        );
        
        let finalSignatureUrl: string | undefined = undefined;
        if (signatureDataUrl) {
            finalSignatureUrl = await optimizeSignature(signatureDataUrl);
        }

        const newTechnicalReport: TechnicalReport = {
            observations: observations,
            photos: photoURLs,
            ...(finalSignatureUrl && { signature: finalSignatureUrl }),
        };

        await updateDoc(ticketRef, {
            status: 'concluído',
            updatedAt: finalizationTime,
            technicalReport: newTechnicalReport,
            checkOut: {
                ticketId: id,
                timestamp: finalizationTime,
            }
        });

        if (sector?.whatsappGroupId) {
            const finalizationDate = format(parseISO(finalizationTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
            const message = `✅ Chamado Concluido ✅\n\n*Cliente:* ${ticket.client.name}\n*Finalizado em:* ${finalizationDate}\n*Status:* Concluído por ${user.name}`;
            await sendWhatsappMessage(sector.whatsappGroupId, message);
        }

        toast({ title: 'Chamado Finalizado com Sucesso!' });
        router.back();
        return true;

    } catch (error) {
        console.error(`Error finalizing ticket ${id}:`, error);
        toast({
            variant: "destructive",
            title: "Erro ao finalizar chamado",
            description: "Não foi possível salvar o relatório técnico ou enviar a notificação. Verifique as permissões e tente novamente.",
        });
        return false;
    }
};

  
  const handleReopenTicket = async (id: string, reason: string) => {
    if (!user) return;
    const ticketRef = doc(db, "external-tickets", id);
    try {
        await handleAddComment(`**Chamado Reaberto:** ${reason}`);
        await updateDoc(ticketRef, {
            status: 'pendente',
            type: 'retorno',
            technicianId: deleteField(),
            updatedAt: new Date().toISOString(),
        });
        toast({
            title: 'Chamado Reaberto com Sucesso!',
            description: `O chamado #${id.substring(0,4)} foi movido para pendentes como retorno.`,
        });
        router.push('/external-tickets');
    } catch (error) {
        console.error("Error reopening ticket: ", error);
        toast({ variant: 'destructive', title: 'Erro ao reabrir chamado' });
    }
  };

  const handleReturnToPending = async (id: string, reason: string) => {
    if (!user) return;
    const ticketRef = doc(db, "external-tickets", id);
    try {
      await handleAddComment(`**Chamado Devolvido para Pendente:** ${reason}`);
      await updateDoc(ticketRef, {
        status: 'pendente',
        technicianId: deleteField(),
        updatedAt: new Date().toISOString(),
      });
      toast({
        title: 'Chamado Devolvido!',
        description: `O chamado #${id.substring(0,4)} retornou para a fila de pendentes.`,
      });
      router.push('/external-tickets');
    } catch (error) {
      console.error("Error returning ticket to pending:", error);
      toast({ variant: 'destructive', title: 'Erro ao devolver chamado' });
    }
  };

  const handleAssignTicketToCurrentUser = async () => {
    if (!ticket || !user) return;

    const ticketRef = doc(db, "external-tickets", ticket.id);
    const sector = allSectors.find(s => s.id === ticket.sectorId);
    const sectorGroupId = sector?.whatsappGroupId;

    try {
      await updateDoc(ticketRef, {
        technicianId: user.id,
        status: 'em andamento',
        updatedAt: new Date().toISOString(),
      });
      
      const message = `🏃‍♂️ Chamado em Andamento 🏃‍♂️\n\n*Cliente:* ${ticket.client.name}\n*Status:* Em andamento por ${user.name}`;
      
      if (sectorGroupId) {
        await sendWhatsappMessage(sectorGroupId, message);
      }

      toast({
        title: 'Chamado Atribuído!',
        description: `Você pegou o chamado #${ticket.id}.`,
      });
    } catch (error) {
      console.error("Error assigning ticket: ", error);
      toast({ variant: 'destructive', title: 'Erro ao atribuir chamado' });
    }
  };

  const handleCheckIn = async () => {
    if (!ticket) return;
    const ticketRef = doc(db, "external-tickets", ticket.id);
    try {
        await updateDoc(ticketRef, {
            checkIn: {
                ticketId: ticket.id,
                timestamp: new Date().toISOString(),
            }
        });
        toast({ title: 'Check-in realizado!', description: `Você iniciou o atendimento no cliente ${ticket.client.name}.` });
    } catch (error) {
        console.error("Error performing check-in:", error);
        toast({ variant: 'destructive', title: 'Erro ao fazer check-in' });
    }
  };


  if (loading || !ticket || users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-lg text-muted-foreground">Carregando chamado...</p>
        <Button variant="link" onClick={() => router.back()}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <>
        <PageHeader title="Detalhes do Chamado" description={`Chamado #${ticket.id.substring(0, 8)}...`}>
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
            </Button>
        </PageHeader>
        <ExternalTicketDetails 
            ticket={ticket} 
            onAddComment={handleAddComment}
            onReopenTicket={handleReopenTicket}
            onAssignToMe={handleAssignTicketToCurrentUser}
            onFinalizeTicket={handleFinalizeTicket}
            onReturnToPending={handleReturnToPending}
            onDescriptionChange={handleDescriptionChange}
            onAssignTechnician={handleAssignTechnician}
            onCheckIn={handleCheckIn}
            currentUser={user}
            users={users}
            allTechnicians={technicians}
            allSectors={allSectors}
        />
    </>
  );
}
