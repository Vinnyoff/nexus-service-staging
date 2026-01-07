
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
import { useState } from "react";
import { Client } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { Checkbox } from "../ui/checkbox";
import { Separator } from "../ui/separator";

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome é obrigatório." }),
  document: z.string().optional(),
  phone: z.string().min(10, { message: "O telefone é obrigatório." }),
  address: z.object({
    street: z.string().min(2, { message: "O logradouro é obrigatório."}),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().min(2, { message: "O bairro é obrigatório."}),
    city: z.string().min(2, { message: "A cidade é obrigatória."}),
    state: z.string().min(2, { message: "O estado é obrigatório."}),
  }),
  euroInfoId: z.string().optional(),
  rondoInfoId: z.string().optional(),
  slaHours: z.coerce.number().optional(),
  status: z.enum(['active', 'inactive']),
});


export type EditClientFormValues = Omit<z.infer<typeof formSchema>, 'status'>;

interface EditClientFormProps {
  client: Client;
  onSave: (clientId: string, values: EditClientFormValues, newStatus: 'active' | 'inactive') => Promise<boolean>;
  onFinished: () => void;
}

export function EditClientForm({ client, onSave, onFinished }: EditClientFormProps) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        name: client.name,
        document: client.document,
        phone: client.phone,
        address: client.address,
        euroInfoId: client.euroInfoId,
        rondoInfoId: client.rondoInfoId,
        slaHours: client.slaHours,
        status: client.status,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    const { status, ...otherValues } = values;
    await onSave(client.id, otherValues, status);
    setIsSaving(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-4">
            {/* Dados do Cliente */}
            <h3 className="text-lg font-medium border-b pb-2">Dados do Cliente</h3>
             <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo / Razão Social</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do cliente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF / CNPJ</FormLabel>
                    <FormControl>
                      <Input placeholder="00.000.000/0000-00" {...field} />
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
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(99) 99999-9999" {...field} />
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
            
            <FormField
                control={form.control}
                name="slaHours"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>SLA (em horas)</FormLabel>
                    <FormControl>
                    <Input type="number" placeholder="Deixe em branco para nenhum" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />

            {/* Endereço */}
            <h3 className="text-lg font-medium border-b pb-2 pt-4">Endereço</h3>
            <FormField
                control={form.control}
                name="address.street"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Logradouro</FormLabel>
                    <FormControl>
                    <Input placeholder="Rua, Avenida..." {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="address.number"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                        <Input placeholder="123" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="address.complement"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                        <Input placeholder="Apto, Bloco..." {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
            <FormField
                control={form.control}
                name="address.neighborhood"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                    <Input placeholder="Centro" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <div className="grid grid-cols-[2fr_1fr] gap-4">
                <FormField
                    control={form.control}
                    name="address.city"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                        <Input placeholder="Sua cidade" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="address.state"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>UF</FormLabel>
                        <FormControl>
                        <Input placeholder="SP" {...field} />
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
                            onCheckedChange={(checked) => field.onChange(checked ? 'active' : 'inactive')}
                        />
                    </FormControl>
                    <FormLabel className="text-base">
                        Cliente {field.value === 'active' ? 'Ativo' : 'Inativo'}
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
