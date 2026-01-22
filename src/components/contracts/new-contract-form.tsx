
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Client, Sector, Checklist } from "@/lib/types";
import { useState, useMemo } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Separator } from "../ui/separator";


const formSchema = z.object({
  clientId: z.string({ required_error: "Selecione um cliente." }),
  description: z.string().optional(),
  frequencyDays: z.coerce.number().positive({ message: "A frequência deve ser maior que zero." }),
  sectorIds: z.array(z.string()).min(1, { message: "Selecione pelo menos um setor." }),
  defaultChecklists: z.record(z.string().optional()).optional(),
});

export type NewContractFormValues = z.infer<typeof formSchema>;

interface NewContractFormProps {
  clients: Client[];
  sectors: Sector[];
  checklists: Checklist[];
  onSave: (values: NewContractFormValues) => void;
  onFinished: () => void;
}

export function NewContractForm({ clients, sectors, checklists, onSave, onFinished }: NewContractFormProps) {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [openClientSelector, setOpenClientSelector] = useState(false);

  const form = useForm<NewContractFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        clientId: undefined,
        description: "",
        frequencyDays: 30,
        sectorIds: [],
        defaultChecklists: {},
    },
  });
  
  const selectedSectors = form.watch("sectorIds");

  async function onSubmit(values: NewContractFormValues) {
    setIsSaving(true);
    const finalChecklists: Record<string, string> = {};
    if (values.defaultChecklists) {
        for (const sectorId of values.sectorIds) {
            if (values.defaultChecklists[sectorId] && values.defaultChecklists[sectorId] !== '_none_') {
                finalChecklists[sectorId] = values.defaultChecklists[sectorId]!;
            }
        }
    }
    
    const valuesToSave = { ...values, defaultChecklists: finalChecklists };
    await onSave(valuesToSave);
    setIsSaving(false);
  }

  const sortedClients = [...clients].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-4">
            <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Cliente</FormLabel>
                    <Popover open={openClientSelector} onOpenChange={setOpenClientSelector}>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                            )}
                            >
                            {field.value
                                ? clients.find(
                                    (client) => client.id === field.value
                                )?.name
                                : "Selecione um cliente"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Buscar cliente..." />
                            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                            <CommandGroup>
                                <CommandList>
                                {sortedClients.map((client) => (
                                    <CommandItem
                                        value={client.name}
                                        key={client.id}
                                        onSelect={() => {
                                            form.setValue("clientId", client.id)
                                            setOpenClientSelector(false)
                                        }}
                                    >
                                    <Check
                                        className={cn(
                                        "mr-2 h-4 w-4",
                                        client.id === field.value
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                    />
                                    {client.name}
                                    </CommandItem>
                                ))}
                                </CommandList>
                            </CommandGroup>
                        </Command>
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
            />

             <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Descrição (Opcional)</FormLabel>
                    <FormControl>
                    <Textarea placeholder="Ex: Contrato de Impressoras, Contrato de Rede..." {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="frequencyDays"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Frequência da Visita (em dias)</FormLabel>
                    <FormControl>
                    <Input type="number" placeholder="Ex: 30" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="sectorIds"
                render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Setores do Contrato</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
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
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                            <CommandInput placeholder="Buscar setor..." />
                            <CommandEmpty>Nenhum setor encontrado.</CommandEmpty>
                            <CommandGroup>
                                <CommandList>
                                {sectors.map((sector) => (
                                    <CommandItem
                                    value={sector.name}
                                    key={sector.id}
                                    onSelect={() => {
                                        const currentIds = field.value || [];
                                        const newIds = currentIds.includes(sector.id)
                                        ? currentIds.filter((id) => id !== sector.id)
                                        : [...currentIds, sector.id];
                                        field.onChange(newIds);
                                    }}
                                    >
                                    <Check
                                        className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value?.includes(sector.id)
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                    />
                                    {sector.name}
                                    </CommandItem>
                                ))}
                                </CommandList>
                            </CommandGroup>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
                )}
            />
            
            {selectedSectors && selectedSectors.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                     <h3 className="text-md font-medium text-foreground">Checklists Padrão por Setor</h3>
                     {selectedSectors.map(sectorId => {
                         const sector = sectors.find(s => s.id === sectorId);
                         if (!sector) return null;
                         const availableChecklists = checklists.filter(c => c.sectorId === sectorId && c.status === 'active');
                         return (
                              <FormField
                                key={sectorId}
                                control={form.control}
                                name={`defaultChecklists.${sectorId}`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{sector.name}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || '_none_'} disabled={availableChecklists.length === 0}>
                                            <FormControl>
                                                <SelectTrigger>
                                                <SelectValue placeholder={availableChecklists.length === 0 ? "Nenhum checklist para este setor" : "Nenhum"} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="_none_">Nenhum</SelectItem>
                                                {availableChecklists.map((checklist) => (
                                                <SelectItem key={checklist.id} value={checklist.id}>
                                                    {checklist.name}
                                                </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                         )
                     })}
                </div>
            )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={onFinished} disabled={isSaving}>Cancelar</Button>
            <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Contrato
            </Button>
        </div>
      </form>
    </Form>
  );
}
