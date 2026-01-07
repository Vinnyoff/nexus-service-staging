
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
import { Sector, ServiceContract } from "@/lib/types";
import { useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Textarea } from "../ui/textarea";
import { Separator } from "../ui/separator";
import { Checkbox } from "../ui/checkbox";

const formSchema = z.object({
  description: z.string().optional(),
  frequencyDays: z.coerce.number().positive({ message: "A frequência deve ser maior que zero." }),
  sectorIds: z.array(z.string()).min(1, { message: "Selecione pelo menos um setor." }),
  status: z.enum(['active', 'inactive']),
});

export type EditContractFormValues = Omit<z.infer<typeof formSchema>, 'status'>;

interface EditContractFormProps {
  contract: ServiceContract;
  sectors: Sector[];
  onSave: (contractId: string, values: EditContractFormValues, newStatus: 'active' | 'inactive') => Promise<boolean>;
  onFinished: () => void;
}

export function EditContractForm({ contract, sectors, onSave, onFinished }: EditContractFormProps) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        description: contract.description || "",
        frequencyDays: contract.frequencyDays,
        sectorIds: contract.sectorIds,
        status: contract.status,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    const { status, ...otherValues } = values;
    await onSave(contract.id, otherValues, status);
    setIsSaving(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-4">
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
            <Separator className="my-4" />
            
             <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                        <Checkbox
                            checked={field.value === 'active'}
                            onCheckedChange={(checked) => field.onChange(checked ? 'active' : 'inactive')}
                        />
                    </FormControl>
                    <FormLabel className="text-base">
                        Contrato {field.value === 'active' ? 'Ativo' : 'Inativo'}
                    </FormLabel>
                  </FormItem>
                )}
              />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={onFinished} disabled={isSaving}>Cancelar</Button>
            <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
            </Button>
        </div>
      </form>
    </Form>
  );
}
