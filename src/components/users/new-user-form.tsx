
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sector } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useState, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "../ui/scroll-area";


const formSchema = z.object({
  name: z.string().min(2, { message: "O nome é obrigatório." }),
  email: z.string().email({ message: "Email inválido." }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
  phone: z.string().optional(),
  role: z.enum(["admin", "gerente", "encarregado", "vendedor"], { required_error: "Selecione um cargo." }),
  sectorIds: z.array(z.string()).optional(),
  euroInfoId: z.string().optional(),
  rondoInfoId: z.string().optional(),
}).refine(data => !(data.role === 'encarregado' && (!data.sectorIds || data.sectorIds.length === 0)), {
    message: "O setor é obrigatório para encarregados.",
    path: ["sectorIds"],
});


export type NewUserFormValues = z.infer<typeof formSchema>;

interface NewUserFormProps {
  onSave: (values: NewUserFormValues) => void;
  onFinished: () => void;
  sectors: Sector[];
}

export function NewUserForm({ onSave, onFinished, sectors }: NewUserFormProps) {
  const isMobile = useIsMobile();
  const [sectorSearch, setSectorSearch] = useState("");

  const form = useForm<NewUserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      role: undefined,
      sectorIds: [],
      euroInfoId: "",
      rondoInfoId: "",
    },
  });

  const role = form.watch("role");

  function onSubmit(values: NewUserFormValues) {
    onSave(values);
  }

  const filteredSectors = useMemo(() => {
    const activeSectors = sectors.filter(s => s.status === 'active');
    if (!sectorSearch) return activeSectors;
    return activeSectors.filter(s => s.name.toLowerCase().includes(sectorSearch.toLowerCase()));
  }, [sectorSearch, sectors]);

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
                  <Input placeholder="Nome do usuário" {...field} />
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
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cargo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cargo do usuário" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="encarregado">Encarregado</SelectItem>
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {role === 'encarregado' && (
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
                    
                    <FormMessage />
                </FormItem>
                )}
            />
          )}
        </div>
        <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onFinished}>Cancelar</Button>
            <Button type="submit">Salvar Usuário</Button>
        </div>
      </form>
    </Form>
  );
}

