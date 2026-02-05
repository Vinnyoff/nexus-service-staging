
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Sector, Technician, UserStatus, ModulePermissions } from "@/lib/types";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Separator } from "../ui/separator";
import { Checkbox } from "../ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

// --- In-file Permissions Form Component ---
const permissionSchema = z.enum(['none', 'read', 'write']);
const permissionsFormSchema = z.object({
  dashboard: permissionSchema,
  external_tickets: permissionSchema,
  internal_tickets: permissionSchema,
  routes: permissionSchema,
  planning: permissionSchema,
  reports: permissionSchema,
  history: permissionSchema,
  clients: permissionSchema,
  technicians: permissionSchema,
  location: permissionSchema,
  monitoring: permissionSchema,
});

type PermissionsFormValues = z.infer<typeof permissionsFormSchema>;

const moduleLabels: Record<keyof ModulePermissions, string> = {
    dashboard: "Dashboard",
    external_tickets: "Chamados Externos",
    internal_tickets: "Atendimentos Internos",
    routes: "Otimizar Rotas",
    planning: "Planejamento",
    reports: "Relatórios",
    history: "Histórico",
    clients: "Clientes",
    technicians: "Técnicos",
    location: "Localização",
    monitoring: "Monitoramento",
};

const defaultPermissions: PermissionsFormValues = {
    dashboard: 'read',
    external_tickets: 'write',
    internal_tickets: 'write',
    routes: 'write',
    planning: 'none',
    location: 'read',
    reports: 'none',
    history: 'read',
    clients: 'read',
    technicians: 'none',
    monitoring: 'none',
};

interface PermissionsSubFormProps {
  form: any;
}

function TechnicianPermissionsSubForm({ form }: PermissionsSubFormProps) {
    return (
        <div className="space-y-4 pt-4">
             <h3 className="text-lg font-medium border-b pb-2 pt-4">Permissões do Módulo</h3>
            {Object.keys(moduleLabels).map((moduleKey) => {
            const key = moduleKey as keyof ModulePermissions;
            if (key === 'reports' || key === 'technicians' || key === 'monitoring' || key === 'planning') return null; // Hide non-applicable modules for techs
            return (
              <FormField
                key={key}
                control={form.control}
                name={`permissions.${key}`}
                render={({ field }) => (
                  <FormItem className="space-y-3 rounded-md border p-4">
                    <FormLabel className="font-semibold">{moduleLabels[key]}</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center space-x-4">
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="none" /></FormControl>
                          <FormLabel className="font-normal">Nenhum</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="read" /></FormControl>
                          <FormLabel className="font-normal">Leitura</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="write" /></FormControl>
                          <FormLabel className="font-normal">Escrita</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
            );
          })}
        </div>
    )
}

// ---- Main Form ----

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome é obrigatório." }),
  phone: z.string().optional(),
  sectorIds: z.array(z.string()).min(1, { message: "Selecione pelo menos um setor." }),
  euroInfoId: z.string().optional(),
  rondoInfoId: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  permissions: permissionsFormSchema,
});

export type EditTechnicianFormValues = Omit<z.infer<typeof formSchema>, 'status' | 'permissions'>;

interface EditTechnicianFormProps {
  technician: Technician;
  onSave: (technicianId: string, values: EditTechnicianFormValues, newStatus: UserStatus) => Promise<boolean>;
  onSavePermissions: (userId: string, permissions: Partial<ModulePermissions>) => Promise<void>;
  onFinished: () => void;
  sectors: Sector[];
}

export function EditTechnicianForm({ technician, onSave, onSavePermissions, onFinished, sectors }: EditTechnicianFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: technician.name,
      phone: (technician as any).phone || "",
      sectorIds: technician.sectorIds || [],
      euroInfoId: technician.euroInfoId || "",
      rondoInfoId: technician.rondoInfoId || "",
      status: technician.status as 'active' | 'inactive',
      permissions: { ...defaultPermissions, ...technician.permissions },
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    const { status, permissions, ...otherValues } = values;
    const infoSaved = await onSave(technician.id, otherValues, status);
    if(infoSaved) {
        await onSavePermissions(technician.id, permissions);
    }
    setIsSaving(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-4">
            <h3 className="text-lg font-medium border-b pb-2">Dados do Técnico</h3>
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
            
            <TechnicianPermissionsSubForm form={form} />
            
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
                        Técnico {field.value === 'active' ? 'Ativo' : 'Inativo'}
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
