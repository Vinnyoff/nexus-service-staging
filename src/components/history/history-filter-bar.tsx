
'use client';

import { useMemo } from 'react';
import { DatePicker } from '@/components/history/date-picker';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Technician, User } from '@/lib/types';

export interface HistoryFilters {
  startDate?: Date;
  endDate?: Date;
  technicianId?: string;
}

interface HistoryFilterBarProps {
  filters: HistoryFilters;
  onFilterChange: (filters: HistoryFilters) => void;
  allTechnicians: Technician[];
  allUsers: User[];
}

export function HistoryFilterBar({ 
  filters, 
  onFilterChange, 
  allTechnicians,
  allUsers
}: HistoryFilterBarProps) {
  const { user } = useAuth();
  
  const canFilterByTechnician = user?.role === 'admin' || user?.role === 'gerente' || user?.role === 'encarregado';

  const visibleTechnicians = useMemo(() => {
    const fieldStaff = allUsers.filter(u => u.role === 'tecnico' || u.role === 'encarregado');
    if (!user) return [];
    if (user.role === 'admin' || user.role === 'gerente') {
        return fieldStaff;
    }
    if (user.role === 'encarregado' && user.sectorIds) {
        return fieldStaff.filter(tech => 
            tech.sectorIds && tech.sectorIds.some(techSectorId => user.sectorIds!.includes(techSectorId))
        );
    }
    return [];
  }, [user, allUsers]);


  const handleFilter = () => {
    // This function could trigger a search if filtering was async.
    // For now, it's handled by the parent component's useMemo.
  };

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
      <DatePicker
        date={filters.startDate}
        onDateChange={(date) => onFilterChange({ ...filters, startDate: date })}
        label="Data de início"
      />
      <DatePicker
        date={filters.endDate}
        onDateChange={(date) => onFilterChange({ ...filters, endDate: date })}
        label="Data de fim"
      />
      {canFilterByTechnician && (
        <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Técnico</label>
            <Select
                value={filters.technicianId}
                onValueChange={(value) => onFilterChange({ ...filters, technicianId: value })}
            >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um técnico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os técnicos</SelectItem>
              {visibleTechnicians.map(tech => (
                  <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <Button onClick={handleFilter}>
        <Search className="mr-2 h-4 w-4" />
        Buscar
      </Button>
    </div>
  );
}
