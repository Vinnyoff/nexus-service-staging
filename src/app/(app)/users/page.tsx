
"use client"

import { useState, useEffect, useMemo } from "react";
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
import { NewUserForm, NewUserFormValues } from "@/components/users/new-user-form";
import { UsersTable } from "@/components/users/users-table";
import { User, Sector, ModulePermissions, UserStatus } from "@/lib/types";
import { collection, onSnapshot, setDoc, doc, updateDoc } from "firebase/firestore";
import { db, firebaseConfig } from "@/firebase/config";
import { useToast } from "@/hooks/use-toast";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { useAuth } from "@/hooks/use-auth";
import { EditUserFormValues } from "@/components/users/edit-user-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function UsersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const { toast } = useToast();
  const { user: adminUser } = useAuth();

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
        if (loading) setLoading(false);
    }, (error) => {
        console.error("Error fetching users:", error);
        setUsers([]);
        if (loading) setLoading(false);
    });

    const unsubSectors = onSnapshot(collection(db, "sectors"), (snapshot) => {
        setSectors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sector)));
    }, (error) => {
        console.error("Error fetching sectors:", error);
        setSectors([]);
    });

    return () => {
        unsubUsers();
        unsubSectors();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const filteredUsers = useMemo(() => {
    const baseUsers = users.filter(u => u.role !== 'tecnico');
    if (sectorFilter === 'all') {
      return baseUsers;
    }
    return baseUsers.filter(user => user.sectorIds?.includes(sectorFilter));
  }, [users, sectorFilter]);

  const handleAddUser = async (values: NewUserFormValues) => {
    if (!adminUser) {
        toast({ variant: 'destructive', title: "Erro de autenticação", description: "Administrador não está logado."});
        return;
    }

    const secondaryApp = initializeApp(firebaseConfig, `create-user-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);
    try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, values.email, values.password);
        const newUserId = userCredential.user.uid;

        const newUser: User = {
            id: newUserId,
            name: values.name,
            email: values.email,
            phone: values.phone,
            role: values.role,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sectorIds: [],
            avatarUrl: "",
            ...(values.sectorIds && values.sectorIds.length > 0 && { sectorIds: values.sectorIds }),
            ...(values.euroInfoId && { euroInfoId: values.euroInfoId }),
            ...(values.rondoInfoId && { rondoInfoId: values.rondoInfoId }),
        };

        await setDoc(doc(db, "users", newUserId), newUser);

        setIsDialogOpen(false);
        toast({
            title: "Usuário Criado com Sucesso!",
            description: `${values.name} agora pode acessar o sistema.`
        });

    } catch (error: any) {
        console.error("Error adding user:", error);
        const errorMessage = error.code === 'auth/email-already-in-use'
            ? "Este email já está em uso por outra conta."
            : "Ocorreu um erro ao criar o usuário.";
        toast({
            variant: 'destructive',
            title: "Erro ao criar usuário",
            description: errorMessage
        });
    } finally {
        await deleteApp(secondaryApp);
    }
  };

  const handleUpdateUser = async (userId: string, values: EditUserFormValues, newStatus: UserStatus) => {
    const userDocRef = doc(db, "users", userId);
    try {
      const updateData: Partial<User> = {
        name: values.name,
        phone: values.phone,
        role: values.role,
        sectorIds: values.role === 'encarregado' ? values.sectorIds : [],
        status: newStatus,
        updatedAt: new Date().toISOString(),
        euroInfoId: values.euroInfoId,
        rondoInfoId: values.rondoInfoId,
      };

      await updateDoc(userDocRef, updateData as { [key: string]: any });

      toast({ title: "Usuário atualizado com sucesso!" });
      return true;
    } catch (error) {
      console.error("Error updating user:", error);
      toast({ variant: "destructive", title: "Erro ao atualizar usuário" });
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
      <PageHeader title="Usuários" description="Gerencie gerentes e encarregados.">
         <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Usuário</DialogTitle>
            </DialogHeader>
            <NewUserForm sectors={sectors} onSave={handleAddUser} onFinished={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </PageHeader>
      
      <div className="py-4">
        <div className="flex items-center gap-4 rounded-lg border bg-card p-3 w-fit">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Filtrar por Setor:</span>
                <Select value={sectorFilter} onValueChange={setSectorFilter}>
                    <SelectTrigger className="w-[250px]">
                        <SelectValue placeholder="Selecione um setor..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Setores</SelectItem>
                        {sectors.map(sector => (
                            <SelectItem key={sector.id} value={sector.id}>{sector.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <UsersTable 
          data={filteredUsers} 
          sectors={sectors} 
          onSavePermissions={handleUpdatePermissions}
          onSaveUser={handleUpdateUser}
        />
      )}
    </>
  );
}
