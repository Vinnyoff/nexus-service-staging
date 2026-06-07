

'use client';

import { useMemo } from 'react';
import { DatePicker } from '@/components/history/date-picker';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { User } from '@/lib/types';

export interface HistoryFilters {
  startDate?: Date;
  endDate?: Date;
  technicianId?: string;
}

interface HistoryFilterBarProps {
  filters: HistoryFilters;
  onFilterChange: (filters: HistoryFilters) => void;
  allUsers: User[];
}

export function HistoryFilterBar({ 
  filters, 
  onFilterChange, 
  allUsers
}: HistoryFilterBarProps) {
  const { user } = useAuth();
  
  const canFilterByTechnician = user?.role === 'admin' || user?.role === 'gerente';

  const visibleTechnicians = useMemo(() => {
    return allUsers.filter(u => u.role === 'tecnico' || u.role === 'encarregado');
  }, [allUsers]);


  const handleFilter = () => {
    // This function could trigger a search if filtering was async.
    // For now, it's handled by the parent component's useMemo.
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end sm:gap-4">
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
          <div className="col-span-2 sm:flex-1 sm:min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Técnico</label>
            <Select
              value={filters.technicianId}
              onValueChange={(value) => onFilterChange({ ...filters, technicianId: value })}
            >
              <SelectTrigger className="w-full">
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
      </div>
    </div>
  );
}
