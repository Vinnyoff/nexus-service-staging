
"use client"

import { useState, useEffect, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ServiceContract, Client, Sector, ExternalTicket, Checklist } from "@/lib/types";
import { collection, addDoc, onSnapshot, doc, updateDoc, writeBatch, getDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ContractsTable } from "@/components/contracts/contracts-table";
import { NewContractForm, NewContractFormValues } from "@/components/contracts/new-contract-form";
import { EditContractFormValues } from "@/components/contracts/edit-contract-form";
import { generatePreventiveTickets } from "@/lib/services/preventive-maintenance-service";


export default function ContractsPage() {
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    setLoading(true);
    
    const unsubContracts = onSnapshot(collection(db, "serviceContracts"), (snapshot) => {
        setContracts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceContract)));
    });
    const unsubClients = onSnapshot(collection(db, "clients"), (snapshot) => {
        setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
    });
    const unsubSectors = onSnapshot(collection(db, "sectors"), (snapshot) => {
        setSectors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sector)));
    });
    const unsubChecklists = onSnapshot(collection(db, "checklists"), (snapshot) => {
        setChecklists(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Checklist)));
    });


    // Simple timeout to avoid UI shift on fast connections
    const timer = setTimeout(() => setLoading(false), 500);

    return () => {
        unsubContracts();
        unsubClients();
        unsubSectors();
        unsubChecklists();
        clearTimeout(timer);
    };
  }, []);

  const filteredContracts = useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin' || user.role === 'gerente') {
      return contracts;
    }
    if (user.role === 'encarregado' && user.sectorIds) {
      return contracts.filter(contract => 
        contract.sectorIds.some(sectorId => user.sectorIds!.includes(sectorId))
      );
    }
    return []; // Return empty for other roles like 'tecnico'
  }, [contracts, user]);

  const handleAddContract = useCallback(async (values: NewContractFormValues) => {
    if (!user) {
        toast({ variant: 'destructive', title: "Erro de Autenticação"});
        return;
    }
    const client = clients.find(c => c.id === values.clientId);
    if (!client || !client.address) {
        toast({ variant: 'destructive', title: "Cliente ou endereço não encontrado"});
        return;
    }
    
    try {
      const batch = writeBatch(db);
      const now = new Date();

      const newContractData: Omit<ServiceContract, 'id'> = {
        clientId: values.clientId,
        clientName: client.name,
        description: values.description,
        sectorIds: values.sectorIds,
        frequencyDays: values.frequencyDays,
        status: 'active',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        ...(values.defaultChecklists && { defaultChecklists: values.defaultChecklists }),
      };
      
      const contractRef = doc(collection(db, "serviceContracts"));
      batch.set(contractRef, newContractData);
      
      // Cria 1 chamado inicial para o contrato — sem setor definido (visível para todos os setores)
      const ticketRef = doc(collection(db, "external-tickets"));
      const newTicketData: Omit<ExternalTicket, 'id'> = {
        client: {
          id: client.id,
          name: client.name,
          phone: client.phone,
          address: `${client.address.street}, ${client.address.number || 'S/N'}`,
          isWhats: false,
        },
        requesterName: 'Sistema (Criação de Contrato)',
        contractId: contractRef.id,
        // sectorId não definido — qualquer setor pode assumir
        creatorId: user.id,
        description: 'Manutenção preventiva de contrato.',
        type: 'contrato',
        status: 'pendente',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      batch.set(ticketRef, newTicketData);

      await batch.commit();
      
      toast({
        title: "Contrato criado!",
        description: `O contrato para ${client.name} foi criado com 1 chamado inicial disponível para todos os setores.`,
      });
      setIsNewDialogOpen(false);

    } catch (error) {
      console.error("Error adding contract and tickets: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao adicionar contrato",
        description: "Ocorreu um erro ao salvar os dados. Tente novamente.",
      });
    }
  }, [user, clients, checklists, toast]);

  const handleUpdateContract = useCallback(async (contractId: string, values: EditContractFormValues, newStatus: 'active' | 'inactive') => {
    const contractRef = doc(db, "serviceContracts", contractId);
    
    try {
        const updatedData = { 
            ...values,
            status: newStatus,
            updatedAt: new Date().toISOString(),
        };

        await updateDoc(contractRef, updatedData);
        toast({ title: "Contrato atualizado com sucesso!" });
        return true;
    } catch (error) {
        console.error("Error updating contract: ", error);
        toast({ variant: 'destructive', title: "Erro ao atualizar contrato" });
        return false;
    }
  }, [toast]);

  const handleManualCheck = useCallback(async () => {
    setIsChecking(true);
    toast({ title: "Verificando preventivas...", description: "Aguarde, o sistema está buscando por chamados vencidos."});
    try {
      const result = await generatePreventiveTickets();
      if (result.createdTicketsCount > 0) {
        toast({
          title: "Verificação Concluída!",
          description: `${result.createdTicketsCount} novo(s) chamado(s) preventivo(s) foram criados.`
        });
      } else {
        toast({
          title: "Nenhuma Pendência",
          description: "Não há chamados preventivos vencidos para serem criados no momento."
        });
      }
    } catch (error) {
      console.error("Error during manual check:", error);
      toast({ variant: 'destructive', title: "Erro na verificação", description: "Ocorreu um erro ao executar a verificação manual." });
    } finally {
      setIsChecking(false);
    }
  }, [toast]);

  return (
    <>
      <PageHeader title="Contratos de Serviço" description="Gerencie os contratos de manutenção preventiva dos clientes.">
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleManualCheck} disabled={isChecking}>
                {isChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Verificar Preventivas Agora
            </Button>
            <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo Contrato
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                <DialogTitle>Novo Contrato de Serviço</DialogTitle>
                </DialogHeader>
                <NewContractForm 
                    clients={clients.filter(c => c.status === 'active')} 
                    sectors={sectors.filter(s => s.status === 'active')}
                    checklists={checklists}
                    onSave={handleAddContract} 
                    onFinished={() => setIsNewDialogOpen(false)} 
                />
            </DialogContent>
            </Dialog>
        </div>
      </PageHeader>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <ContractsTable 
          data={filteredContracts}
          sectors={sectors}
          checklists={checklists}
          onUpdateContract={handleUpdateContract}
        />
      )}
    </>
  );
}
