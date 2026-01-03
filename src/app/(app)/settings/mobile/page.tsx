
'use client';

import { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, LayoutGrid, Calendar, Wrench, ClipboardList, Map, MapPinned, CalendarCheck, History, LineChart } from 'lucide-react';
import type { MobileNavPreferences } from '@/lib/types';

const mobileNavSchema = z.object({
  dashboard: z.boolean().default(true),
  schedule: z.boolean().default(true),
  external_tickets: z.boolean().default(true),
  internal_tickets: z.boolean().default(true),
  routes: z.boolean().default(true),
  location: z.boolean().default(true),
  planning: z.boolean().default(true),
  history: z.boolean().default(true),
  reports: z.boolean().default(true),
});

type MobileNavFormValues = z.infer<typeof mobileNavSchema>;

export default function MobileSettingsPage() {
    const { user, setUser } = useAuth();
    const { toast } = useToast();
    const [isSavingNav, setIsSavingNav] = useState(false);

    const mobileNavForm = useForm<MobileNavFormValues>({
        resolver: zodResolver(mobileNavSchema),
        defaultValues: {
            dashboard: user?.mobileNavPreferences?.dashboard ?? true,
            schedule: user?.mobileNavPreferences?.schedule ?? true,
            external_tickets: user?.mobileNavPreferences?.external_tickets ?? true,
            internal_tickets: user?.mobileNavPreferences?.internal_tickets ?? true,
            routes: user?.mobileNavPreferences?.routes ?? true,
            location: user?.mobileNavPreferences?.location ?? true,
            planning: user?.mobileNavPreferences?.planning ?? false,
            history: user?.mobileNavPreferences?.history ?? false,
            reports: user?.mobileNavPreferences?.reports ?? false,
        }
    });

    const mobileNavFormValues = mobileNavForm.watch();

    const onMobileNavSubmit = async (values: MobileNavFormValues) => {
        if (!user) return;
        setIsSavingNav(true);
        const userDocRef = doc(db, "users", user.id);
        try {
          const preferencesToSave: MobileNavPreferences = { ...values };
    
          await updateDoc(userDocRef, { mobileNavPreferences: preferencesToSave });
          setUser((prev) => (prev ? { ...prev, mobileNavPreferences: preferencesToSave } : null));
        } catch (error) {
          console.error("Error updating mobile nav preferences:", error);
          toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível salvar suas preferências.' });
        } finally {
            mobileNavForm.reset(values);
            setTimeout(() => setIsSavingNav(false), 500); 
        }
    }

    useDebounce(() => {
        if (mobileNavForm.formState.isDirty) {
            onMobileNavSubmit(mobileNavFormValues);
        }
    }, 1000, [mobileNavFormValues]);

    const mobileNavOptions: { name: keyof MobileNavFormValues, label: string, icon: React.ElementType }[] = [
        { name: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
        { name: 'schedule', label: 'Agenda', icon: Calendar },
        { name: 'external_tickets', label: 'Chamados Externos', icon: Wrench },
        { name: 'internal_tickets', label: 'Atendimentos Internos', icon: ClipboardList },
        { name: 'routes', label: 'Otimizar Rotas', icon: Map },
        { name: 'location', label: 'Localização', icon: MapPinned },
        { name: 'planning', label: 'Planejamento', icon: CalendarCheck },
        { name: 'history', label: 'Histórico', icon: History },
        { name: 'reports', label: 'Relatórios', icon: LineChart },
    ];

    const filteredMobileNavOptions = mobileNavOptions.filter(option => {
        if (user?.role === 'tecnico') {
            return !['planning', 'reports'].includes(option.name);
        }
        return true;
    });

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Navegação Mobile</CardTitle>
                        <CardDescription>
                            Escolha quais itens aparecerão na barra de navegação inferior no seu celular.
                        </CardDescription>
                    </div>
                     <div className="flex items-center text-sm text-muted-foreground transition-opacity duration-300">
                        {isSavingNav && !mobileNavForm.formState.isDirty && <CheckCircle className="mr-2 h-4 w-4 text-green-500"/>}
                        {isSavingNav ? 'Salvando...' : !mobileNavForm.formState.isDirty ? 'Salvo' : ''}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
               <Form {...mobileNavForm}>
                <form className="space-y-8">
                  <div className='space-y-4'>
                    {filteredMobileNavOptions.map((option) => (
                        <FormField
                            key={option.name}
                            control={mobileNavForm.control}
                            name={option.name}
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                    <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel className="flex items-center">
                                    <option.icon className="mr-2 h-4 w-4" /> {option.label}
                                    </FormLabel>
                                </div>
                                </FormItem>
                            )}
                        />
                    ))}
                  </div>
                </form>
              </Form>
            </CardContent>
        </Card>
    );
}
