
"use client"

import { useState, useEffect, useMemo, useCallback } from "react";
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
import { NewTechnicianForm, NewTechnicianFormValues } from "@/components/technicians/new-technician-form";
import { TechniciansTable } from "@/components/technicians/technicians-table";
import { Technician, Sector, User, ModulePermissions, UserStatus } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { collection, getDocs, doc, setDoc, updateDoc, writeBatch, onSnapshot, query } from "firebase/firestore";
import { db, firebaseConfig } from "@/firebase/config";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { useAuth } from "@/hooks/use-auth";
import { TechniciansFilterBar } from "@/components/technicians/technicians-filter-bar";
import { EditTechnicianFormValues } from "@/components/technicians/edit-technician-form";


export default function TechniciansPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const { toast } = useToast();
  const { user: adminUser } = useAuth(); 
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [rawTechnicians, setRawTechnicians] = useState<Technician[]>([]);
  
  useEffect(() => {
    setLoading(true);

    const unsubTechnicians = onSnapshot(query(collection(db, "technicians")), 
        (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Technician[];
            setRawTechnicians(data);
        }
    );

    const unsubUsers = onSnapshot(query(collection(db, "users")),
        (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
            setAllUsers(data);
        }
    );
    
    const unsubSectors = onSnapshot(query(collection(db, "sectors")),
        (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Sector[];
            setSectors(data);
        }
    );

    const timer = setTimeout(() => {
        if (loading) {
            setLoading(false);
        }
    }, 2000);

    return () => {
        unsubTechnicians();
        unsubUsers();
        unsubSectors();
        clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

 const combinedTechnicians = useMemo(() => {
    if (!rawTechnicians.length || !allUsers.length) return [];
    
    return rawTechnicians.map(techData => {
        const correspondingUser = allUsers.find(u => u.id === techData.userId);
        if (!correspondingUser) {
            return null;
        }
        return {
            ...correspondingUser,
            ...techData,
            id: techData.id,
        };
    }).filter(Boolean) as Technician[];
  }, [rawTechnicians, allUsers]);

  const visibleTechnicians = useMemo(() => {
     if (!adminUser) return [];

    if (adminUser.role === 'admin' || adminUser.role === 'gerente') {
        return combinedTechnicians;
    }
    if (adminUser.role === 'encarregado') {
        const userSectorIds = adminUser.sectorIds || [];
        return userSectorIds.length > 0 
            ? combinedTechnicians.filter(tech => tech.sectorIds && tech.sectorIds.some(techSectorId => userSectorIds.includes(techSectorId)))
            : [];
    }
    return []; // Technicians cannot see this page.
  }, [combinedTechnicians, adminUser]);

  
  const filteredTechnicians = useMemo(() => {
    if (sectorFilter === 'all') {
        return visibleTechnicians;
    }
    return visibleTechnicians.filter(tech => tech.sectorIds && tech.sectorIds.includes(sectorFilter));
  }, [visibleTechnicians, sectorFilter]);


  const handleAddTechnician = async (values: NewTechnicianFormValues) => {
    if (!adminUser) {
        toast({ variant: 'destructive', title: "Erro de autenticação", description: "Administrador não está logado."});
        return;
    }
    
    const secondaryApp = initializeApp(firebaseConfig, `create-tech-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);
    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, values.email, values.password);
      const newUserId = userCredential.user.uid;
      
      const newUser: User = {
        id: newUserId,
        name: values.name,
        email: values.email,
        phone: values.phone,
        role: 'tecnico',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        avatarUrl: "",
        sectorIds: values.sectorIds,
        euroInfoId: values.euroInfoId,
        rondoInfoId: values.rondoInfoId,
      };
      await setDoc(doc(db, "users", newUserId), newUser);
      
      const newTechnician: Omit<Technician, 'id'> = {
        userId: newUserId,
        name: values.name,
        email: values.email,
        status: 'active',
        sectorIds: values.sectorIds,
        euroInfoId: values.euroInfoId,
        rondoInfoId: values.rondoInfoId,
      };
      await setDoc(doc(db, "technicians", newUserId), newTechnician);
      
      setIsDialogOpen(false);
      toast({
        title: "Técnico Criado com Sucesso!",
        description: `${values.name} já pode acessar o sistema.`
      });

    } catch (error: any) {
      console.error("Error adding technician:", error);
      const errorMessage = error.code === 'auth/email-already-in-use'
            ? "Este email já está em uso por outra conta."
            : "Ocorreu um erro ao criar o técnico.";
      toast({
        variant: "destructive",
        title: "Erro ao criar técnico",
        description: errorMessage,
      });
    } finally {
      await deleteApp(secondaryApp);
    }
  };
  
  const handleUpdateTechnician = async (technicianId: string, values: EditTechnicianFormValues, newStatus: UserStatus) => {
    const batch = writeBatch(db);
    const techRef = doc(db, "technicians", technicianId);
    const userRef = doc(db, "users", technicianId);

    const updateData = {
        name: values.name,
        phone: values.phone,
        sectorIds: values.sectorIds,
        euroInfoId: values.euroInfoId,
        rondoInfoId: values.rondoInfoId,
        status: newStatus,
        updatedAt: new Date().toISOString(),
    };
    
    batch.update(userRef, updateData);
    batch.update(techRef, { 
        name: values.name, 
        sectorIds: values.sectorIds,
        euroInfoId: values.euroInfoId,
        rondoInfoId: values.rondoInfoId,
        status: newStatus,
    });

    try {
        await batch.commit();
        toast({ title: "Técnico atualizado com sucesso!" });
        return true;
    } catch (error) {
        console.error("Error updating technician:", error);
        toast({ variant: "destructive", title: "Erro ao atualizar técnico" });
        return false;
    }
  };

  const handleUpdatePermissions = async (userId: string, permissions: Partial<ModulePermissions>) => {
    const userDocRef = doc(db, "users", userId);
    try {
        await updateDoc(userDocRef, {
            permissions,
            updatedAt: new Date().toISOString(),
        });
        toast({ title: "Permissões atualizadas com sucesso!" });
    } catch (error) {
        console.error("Error updating permissions:", error);
        toast({ variant: "destructive", title: "Erro ao salvar permissões" });
    }
  };


  return (
    <>
      <PageHeader title="Técnicos" description="Gerencie os técnicos internos e externos.">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Técnico
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Técnico</DialogTitle>
            </DialogHeader>
            <NewTechnicianForm sectors={sectors} onSave={handleAddTechnician} onFinished={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </PageHeader>

       <div className="py-4">
        <TechniciansFilterBar
          allSectors={sectors}
          currentUser={adminUser}
          sectorFilter={sectorFilter}
          onSectorChange={setSectorFilter}
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <TechniciansTable 
          data={filteredTechnicians} 
          sectors={sectors} 
          onSavePermissions={handleUpdatePermissions}
          onUpdateTechnician={handleUpdateTechnician}
        />
      )}
    </>
  );
}
