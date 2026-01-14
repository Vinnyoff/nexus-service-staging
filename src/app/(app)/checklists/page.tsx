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
import { NewChecklistForm, NewChecklistFormValues } from "@/components/checklists/new-checklist-form";
import { Checklist, Sector } from "@/lib/types";
import { collection, addDoc, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ChecklistsTable } from "@/components/checklists/checklists-table";
import { EditChecklistFormValues } from "@/components/checklists/edit-checklist-form";

export default function ChecklistsPage() {
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    setLoading(true);
    const unsubChecklists = onSnapshot(collection(db, "checklists"), 
      (snapshot) => {
        setChecklists(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Checklist)));
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching checklists in real-time:", error);
        toast({ variant: 'destructive', title: "Erro ao buscar checklists"});
        setLoading(false);
      }
    );
     const unsubSectors = onSnapshot(collection(db, "sectors"), 
      (snapshot) => {
        setSectors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sector)));
      },
      (error) => {
        console.error("Error fetching sectors in real-time:", error);
      }
    );

    return () => {
        unsubChecklists();
        unsubSectors();
    }
  }, [toast]);

  const handleAddChecklist = async (values: NewChecklistFormValues) => {
    try {
      const now = new Date().toISOString();
      const newChecklistData: Omit<Checklist, 'id'> = {
        name: values.name,
        description: values.description,
        sectorId: values.sectorId,
        tasks: values.tasks,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };
      await addDoc(collection(db, "checklists"), newChecklistData);
      toast({ title: "Checklist adicionado com sucesso!" });
      setIsNewDialogOpen(false);
    } catch (error) {
      console.error("Error adding checklist: ", error);
      toast({ variant: 'destructive', title: "Erro ao adicionar checklist" });
    }
  };

  const handleUpdateChecklist = async (checklistId: string, values: EditChecklistFormValues, newStatus: 'active' | 'archived') => {
    const checklistRef = doc(db, "checklists", checklistId);
    try {
      const updateData = {
        ...values,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(checklistRef, updateData);
      toast({ title: "Checklist atualizado com sucesso!" });
      return true; // Indicate success to close dialog
    } catch (error) {
      console.error("Error updating checklist: ", error);
      toast({ variant: 'destructive', title: "Erro ao atualizar checklist" });
      return false;
    }
  };
  
  const visibleSectors = sectors.filter(s => {
      if(user?.role === 'admin' || user?.role === 'gerente') return true;
      if(user?.role === 'encarregado') return user.sectorIds?.includes(s.id);
      return false;
  });

  return (
    <>
      <PageHeader title="Modelos de Checklist" description="Crie e gerencie os checklists para os atendimentos.">
        <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Checklist
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Novo Modelo de Checklist</DialogTitle>
            </DialogHeader>
            <NewChecklistForm 
              sectors={visibleSectors}
              onSave={handleAddChecklist} 
              onFinished={() => setIsNewDialogOpen(false)} 
            />
          </DialogContent>
        </Dialog>
      </PageHeader>
      {loading ? (
          <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
          </div>
      ) : (
        <ChecklistsTable 
            data={checklists} 
            sectors={sectors}
            onUpdateChecklist={handleUpdateChecklist}
        />
      )}
    </>
  );
}