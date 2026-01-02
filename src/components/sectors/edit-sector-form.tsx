
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
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  code: z.string().min(1, { message: "O código é obrigatório." }),
  description: z.string().optional(),
  whatsappGroupId: z.string().optional(),
  euroInfoId: z.string().optional(),
  rondoInfoId: z.string().optional(),
});

export type EditSectorFormValues = z.infer<typeof formSchema>;

interface EditSectorFormProps {
  sector: Sector;
  onSave: (sectorId: string, values: EditSectorFormValues) => Promise<boolean>;
  onFinished: () => void;
}

export function EditSectorForm({ sector, onSave, onFinished }: EditSectorFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  
  const form = useForm<EditSectorFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: sector.name,
      code: sector.code,
      description: sector.description || "",
      whatsappGroupId: sector.whatsappGroupId || "",
      euroInfoId: sector.euroInfoId || "",
      rondoInfoId: sector.rondoInfoId || "",
    },
  });

  async function onSubmit(values: EditSectorFormValues) {
    setIsSaving(true);
    await onSave(sector.id, values);
    setIsSaving(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-4">
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
                <FormControl>
                  <Input placeholder="ID do grupo para notificações" {...field} />
                </FormControl>
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
        </div>
        <div className="flex justify-end gap-2">
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
