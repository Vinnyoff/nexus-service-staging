
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Sector } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "../ui/scroll-area";

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome é obrigatório." }),
  email: z.string().email({ message: "Email inválido." }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
  phone: z.string().optional(),
  sectorIds: z.array(z.string()).min(1, { message: "Selecione pelo menos um setor." }),
  euroInfoId: z.string().optional(),
  rondoInfoId: z.string().optional(),
});

export type NewTechnicianFormValues = z.infer<typeof formSchema>;

interface NewTechnicianFormProps {
  onSave: (values: NewTechnicianFormValues) => void;
  onFinished: () => void;
  sectors: Sector[];
}

export function NewTechnicianForm({ onSave, onFinished, sectors }: NewTechnicianFormProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [sectorSearch, setSectorSearch] = useState('');
  
  const form = useForm<NewTechnicianFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      sectorIds: user?.role === 'encarregado' && user.sectorIds?.length === 1 ? user.sectorIds : [],
      euroInfoId: "",
      rondoInfoId: "",
    },
  });

  function onSubmit(values: NewTechnicianFormValues) {
    onSave(values);
  }
  
  // Determine which sectors should be visible in the dropdown
  const visibleSectors = useMemo(() => {
    if (user?.role === 'admin' || user?.role === 'gerente') {
      return sectors.filter(s => s.status === 'active');
    }
    if (user?.role === 'encarregado' && user.sectorIds) {
      return sectors.filter(s => user.sectorIds?.includes(s.id) && s.status === 'active');
    }
    return [];
  }, [user, sectors]);

  const filteredSectors = useMemo(() => {
    if (!sectorSearch) return visibleSectors;
    return visibleSectors.filter(s => s.name.toLowerCase().includes(sectorSearch.toLowerCase()));
  }, [sectorSearch, visibleSectors]);

  const SectorSelectorContent = ({ onSelect }: { onSelect: (id: string) => void }) => (
    <Command>
      <CommandInput 
        placeholder="Buscar setor..."
        value={sectorSearch}
        onValueChange={setSectorSearch}
      />
      <CommandEmpty>Nenhum setor encontrado.</CommandEmpty>
      <CommandGroup>
        <ScrollArea className="h-48">
          {filteredSectors.map((sector) => (
            <CommandItem
              value={sector.name}
              key={sector.id}
              onSelect={() => onSelect(sector.id)}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  form.watch('sectorIds')?.includes(sector.id)
                    ? "opacity-100"
                    : "opacity-0"
                )}
              />
              {sector.name}
            </CommandItem>
          ))}
        </ScrollArea>
      </CommandGroup>
    </Command>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Completo</FormLabel>
                <FormControl>
                  <Input placeholder="Nome do técnico" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@exemplo.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone (para notificações)</FormLabel>
                <FormControl>
                  <Input placeholder="+5569999999999" {...field} />
                </FormControl>
                <FormDescription>
                    Use o formato internacional (Ex: +55 DDD Numero).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
             <FormField
                control={form.control}
                name="euroInfoId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>ID EuroInfo</FormLabel>
                    <FormControl>
                    <Input placeholder="ID do sistema legado" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="rondoInfoId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>ID RondoInfo</FormLabel>
                    <FormControl>
                    <Input placeholder="ID do sistema legado" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
          </div>
            <FormField
              control={form.control}
              name="sectorIds"
              render={({ field }) => (
                 <FormItem className="flex flex-col">
                    <FormLabel>Setores</FormLabel>
                    
                    <FormControl>
                        <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            className={cn(
                            "w-full justify-between",
                            !field.value?.length && "text-muted-foreground"
                            )}
                        >
                            {field.value && field.value.length > 0
                            ? `${field.value.length} setor(es) selecionado(s)`
                            : "Selecione os setores"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </FormControl>
                    
                    </FormItem>
              )}
            />
        </div>
        <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onFinished}>Cancelar</Button>
            <Button type="submit">Salvar Técnico</Button>
        </div>
      </form>
    </Form>
  );
}

