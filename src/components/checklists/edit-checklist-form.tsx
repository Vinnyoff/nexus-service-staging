"use client";

import { useForm, useFieldArray } from "react-hook-form";
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
import { Sector, Checklist } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Trash, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { useState } from "react";
import { Separator } from "../ui/separator";
import { Checkbox } from "../ui/checkbox";

const taskSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "A tarefa não pode estar vazia."),
});

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  description: z.string().optional(),
  sectorId: z.string({ required_error: "Selecione um setor." }),
  tasks: z.array(taskSchema).min(1, "Adicione pelo menos uma tarefa."),
  status: z.enum(['active', 'archived']),
});

export type EditChecklistFormValues = Omit<z.infer<typeof formSchema>, 'status'>;

interface EditChecklistFormProps {
  checklist: Checklist;
  sectors: Sector[];
  onSave: (checklistId: string, values: EditChecklistFormValues, newStatus: 'active' | 'archived') => Promise<boolean>;
  onFinished: () => void;
}

export function EditChecklistForm({ checklist, sectors, onSave, onFinished }: EditChecklistFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: checklist.name,
      description: checklist.description || "",
      sectorId: checklist.sectorId,
      tasks: checklist.tasks.length > 0 ? checklist.tasks : [{ id: uuidv4(), text: "" }],
      status: checklist.status,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "tasks",
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    const { status, ...otherValues } = values;
    const success = await onSave(checklist.id, otherValues, status);
    // Only set saving to false if it failed, otherwise the dialog closes
    if (!success) {
      setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Modelo</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Checklist de Impressora" {...field} />
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
                <FormLabel>Descrição (Opcional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Descreva quando usar este checklist..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="sectorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Setor</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um setor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sectors.map((sector) => (
                      <SelectItem key={sector.id} value={sector.id}>
                        {sector.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div>
            <h3 className="text-lg font-medium mb-2">Tarefas</h3>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <FormField
                  key={field.id}
                  control={form.control}
                  name={`tasks.${index}.text`}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input placeholder={`Tarefa ${index + 1}`} {...field} />
                        </FormControl>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => remove(index)}
                          disabled={fields.length <= 1}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
             <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => append({ id: uuidv4(), text: "" })}
            >
              Adicionar Tarefa
            </Button>
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
                        Checklist {field.value === 'active' ? 'Ativo' : 'Arquivado'}
                    </FormLabel>
                    </FormItem>
                )}
            />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={onFinished} disabled={isSaving}>Cancelar</Button>
            <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
        </div>
      </form>
    </Form>
  );
}