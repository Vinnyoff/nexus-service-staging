
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
import { Textarea } from "@/components/ui/textarea";
import type { Sector } from "@/lib/types";
import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { fetchWhatsappGroups, WhatsappGroup } from "@/ai/flows/fetch-whatsapp-groups";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "../ui/scroll-area";
import { Command, CommandEmpty, CommandInput, CommandGroup, CommandList, CommandItem } from "../ui/command";
import { Separator } from "../ui/separator";
import { Checkbox } from "../ui/checkbox";

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  code: z.string().min(1, { message: "O código é obrigatório." }),
  description: z.string().optional(),
  whatsappGroupId: z.string().optional(),
  euroInfoId: z.string().optional(),
  rondoInfoId: z.string().optional(),
  status: z.enum(['active', 'archived']),
});

export type EditSectorFormValues = Omit<z.infer<typeof formSchema>, 'status'>;

interface EditSectorFormProps {
  sector: Sector;
  onSave: (sectorId: string, values: EditSectorFormValues, newStatus: 'active' | 'archived') => Promise<boolean>;
  onFinished: () => void;
}

export function EditSectorForm({ sector, onSave, onFinished }: EditSectorFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingGroups, setIsFetchingGroups] = useState(false);
  const [groups, setGroups] = useState<WhatsappGroup[]>([]);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: sector.name,
      code: sector.code,
      description: sector.description || "",
      whatsappGroupId: sector.whatsappGroupId || "",
      euroInfoId: sector.euroInfoId || "",
      rondoInfoId: sector.rondoInfoId || "",
      status: sector.status,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    const { status, ...otherValues } = values;
    await onSave(sector.id, otherValues, status);
    setIsSaving(false);
  }

  const handleFetchGroups = async () => {
    setIsFetchingGroups(true);
    try {
        const fetchedGroups = await fetchWhatsappGroups();
        setGroups(fetchedGroups);
        setIsGroupDialogOpen(true);
    } catch (error) {
        console.error("Failed to fetch WhatsApp groups:", error);
        toast({
            variant: "destructive",
            title: "Erro ao buscar grupos",
            description: "Não foi possível buscar os grupos do WhatsApp. Verifique as credenciais da Z-API.",
        });
    } finally {
        setIsFetchingGroups(false);
    }
  };

  const handleSelectGroup = (groupId: string) => {
    form.setValue("whatsappGroupId", groupId);
    setIsGroupDialogOpen(false);
  };

  const filteredGroups = groups.filter(group => group.name.toLowerCase().includes(groupSearch.toLowerCase()));

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Suporte de TI" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código</FormLabel>
                <FormControl>
                  <Input placeholder="S-TI" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea placeholder="Descreva o setor..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="whatsappGroupId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ID do Grupo no WhatsApp</FormLabel>
                <div className="flex gap-2 items-center">
                    <FormControl>
                      <Input placeholder="ID do grupo para notificações" {...field} />
                    </FormControl>
                    <Button type="button" variant="outline" onClick={handleFetchGroups} disabled={isFetchingGroups}>
                        {isFetchingGroups ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4" />}
                    </Button>
                </div>
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

          <Separator className="my-4" />
            
             <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                        <Checkbox
                            checked={field.value === 'active'}
                            onCheckedChange={(checked) => field.onChange(checked ? 'active' : 'archived')}
                        />
                    </FormControl>
                    <FormLabel className="text-base">
                        Setor {field.value === 'active' ? 'Ativo' : 'Arquivado'}
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

    <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Selecionar Grupo do WhatsApp</DialogTitle>
                <DialogDescription>
                    Escolha um grupo para associar a este setor.
                </DialogDescription>
            </DialogHeader>
            <Command>
                <CommandInput 
                    placeholder="Buscar nome do grupo..."
                    value={groupSearch}
                    onValueChange={setGroupSearch}
                />
                <CommandEmpty>Nenhum grupo encontrado.</CommandEmpty>
                <CommandList>
                <ScrollArea className="h-64">
                    {filteredGroups.map((group) => (
                        <CommandItem key={group.id} onSelect={() => handleSelectGroup(group.id)}>
                            {group.name}
                        </CommandItem>
                    ))}
                </ScrollArea>
                </CommandList>
            </Command>
        </DialogContent>
    </Dialog>
    </>
  );
}
