"use client"

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NewClientForm, NewClientFormValues } from "@/components/clients/new-client-form";
import { Client, ExternalTicket } from "@/lib/types";
import { collection, addDoc, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useToast } from "@/hooks/use-toast";
import { ClientsTable } from "@/components/clients/clients-table";
import { EditClientFormValues } from "@/components/clients/edit-client-form";
import { useAuth } from "@/hooks/use-auth";

export default function ClientsPage() {
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();


  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, "clients"), 
      (querySnapshot) => {
        const clientsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
        setClients(clientsData);
        setLoading(false);
      }, 
      (error) => {
        console.error("Error fetching clients in real-time:", error);
        toast({ variant: 'destructive', title: "Erro ao buscar clientes"});
        setLoading(false);
      }
    );

    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, [toast]);

  const handleAddClient = async (values: NewClientFormValues) => {
    if (!user) {
        toast({ variant: 'destructive', title: "Erro de Autenticação"});
        return;
    }
    try {
      const newClientData: Omit<Client, 'id'> = {
        name: values.name,
        document: values.document,
        phone: values.phone,
        address: values.address,
        status: 'active',
        ...(values.slaHours && { slaHours: values.slaHours }),
        ...(values.euroInfoId && { euroInfoId: values.euroInfoId }),
        ...(values.rondoInfoId && { rondoInfoId: values.rondoInfoId }),
      };
      
      const docRef = await addDoc(collection(db, "clients"), newClientData);
      
      toast({
        title: "Cliente adicionado com sucesso!",
        description: `O cliente ${values.name} foi cadastrado.`,
      });
      setIsNewDialogOpen(false);

    } catch (error) {
      console.error("Error adding client: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao adicionar cliente",
        description: "Ocorreu um erro ao salvar os dados. Tente novamente.",
      });
    }
  };

  const handleUpdateClient = async (clientId: string, values: EditClientFormValues, newStatus: 'active' | 'inactive') => {
    const clientRef = doc(db, "clients", clientId);
    try {
        const updatedData: { [key: string]: any } = { ...values, status: newStatus };
        
        // Firestore doesn't allow 'undefined' values. We need to remove them before updating.
        Object.keys(updatedData).forEach(key => {
            if (updatedData[key] === undefined) {
                delete updatedData[key];
            }
        });

        await updateDoc(clientRef, updatedData);
        toast({ title: "Cliente atualizado com sucesso!" });
        return true;
    } catch (error) {
        console.error("Error updating client: ", error);
        toast({ variant: 'destructive', title: "Erro ao atualizar cliente" });
        return false;
    }
  };
  

  return (
    <>
      <PageHeader title="Clientes" description="Gerencie os clientes da empresa.">
        <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Novo Cliente</DialogTitle>
            </DialogHeader>
            <NewClientForm onSave={handleAddClient} onFinished={() => setIsNewDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </PageHeader>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <ClientsTable 
          data={clients} 
          onUpdateClient={handleUpdateClient}
        />
      )}
    </>
  );
}
