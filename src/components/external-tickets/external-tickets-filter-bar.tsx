
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ExternalTicket, Sector, Technician, User } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useEffect, useState, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import { Input } from "../ui/input";
import { Search } from "lucide-react";

export type StatusFilter = ExternalTicket['status'] | 'all';

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
  currentUser: User | null;
  sectors: Sector[];
}

export function ExternalTicketsFilterBar({
  statusFilter,
  onStatusChange,
  technicianFilter,
  onTechnicianChange,
  sectorFilter,
  onSectorChange,
  contractOnly,
  onContractOnlyChange,
  myTicketsOnly,
  onMyTicketsOnlyChange,
  searchQuery,
  onSearchChange,
  currentUser,
  sectors
}: ExternalTicketsFilterBarProps) {
    const [allUsers, setAllUsers] = useState<User[]>([]);
    
    useEffect(() => {
        const fetchUsers = async () => {
            const querySnapshot = await getDocs(collection(db, "users"));
            const usersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setAllUsers(usersData);
        };
        fetchUsers();
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
        // Se o usuário é um técnico ou um supervisor de um único setor, filtre por esse setor
        if (currentUser.role === 'tecnico' || (currentUser.role === 'encarregado' && currentUser.sectorIds?.length === 1)) {
            techSectorFilter = currentUser.sectorIds?.[0] || 'all';
        }

        return fieldStaff.filter(user => {
            if (techSectorFilter === 'all') {
                if (currentUser.role === 'encarregado') {
                    return user.sectorIds?.some(id => currentUser.sectorIds?.includes(id));
                }
                 if (currentUser.role === 'admin' || currentUser.role === 'gerente') {
                    return true;
                }
                return user.sectorIds?.some(id => currentUser.sectorIds?.includes(id));
            }
            return user.sectorIds?.includes(techSectorFilter);
        });

    }, [currentUser, allUsers, sectorFilter]);

    const isTechnicianFilterDisabled = statusFilter === 'pendente';

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-lg border bg-card p-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">
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
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
             <div className="relative min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Buscar chamado..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-8 sm:w-[200px] md:w-[200px] lg:w-[300px]"
                />
            </div>
            {canFilterBySector && (
                <div className="min-w-[200px]">
                    <Select
                        value={sectorFilter}
                        onValueChange={onSectorChange}
                    >
                    <SelectTrigger>
                    <SelectValue placeholder="Filtrar por setor..." />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">Todos os setores</SelectItem>
                    {userSectors.map(sector => (
                        <SelectItem key={sector.id} value={sector.id}>{sector.name}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                </div>
            )}

            <div className="min-w-[200px]">
                <Select
                    value={isTechnicianFilterDisabled ? 'all' : technicianFilter}
                    onValueChange={onTechnicianChange}
                    disabled={isTechnicianFilterDisabled}
                >
                <SelectTrigger>
                <SelectValue placeholder="Filtrar por técnico..." />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="all">Todos os técnicos</SelectItem>
                {assignableUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                ))}
                </SelectContent>
            </Select>
            </div>
        </div>
      </div>
      <div className="flex items-center space-x-4 shrink-0">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="contract-only"
            checked={contractOnly}
            onCheckedChange={(checked) => onContractOnlyChange(Boolean(checked))}
          />
          <Label htmlFor="contract-only">Apenas Contratos</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="my-tickets-only"
            checked={myTicketsOnly}
            onCheckedChange={(checked) => onMyTicketsOnlyChange(Boolean(checked))}
          />
          <Label htmlFor="my-tickets-only">Apenas Meus</Label>
        </div>
      </div>
    </div>
  );
}

    
