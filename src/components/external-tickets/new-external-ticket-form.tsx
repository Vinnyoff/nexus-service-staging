
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, ArrowLeft, ArrowRight, Loader2, List, Check, Search, ChevronsUpDown, AlertTriangle } from "lucide-react";
import { format, addHours } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo, useCallback } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Client, Sector, User, Technician } from "@/lib/types";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "@/components/ui/separator";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import React from "react";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";

const formSchema = z.object({
  clientId: z.string().optional(),
  clientName: z.string().min(2, { message: "O nome do cliente é obrigatório." }),
  requesterName: z.string().optional(),
  contact: z.string().optional(),
  isWhatsapp: z.boolean().default(false),
  description: z.string().min(5, { message: "A descrição é obrigatória." }),
  isContract: z.boolean().default(false),
  isUrgent: z.boolean().default(false),
  address: z.object({
    street: z.string().optional(),
    number: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
  }).optional(),
  sectorId: z.string().min(1, { message: "O setor é obrigatório." }),
  assigneeId: z.string().optional(),
  scheduledToDate: z.date().optional(),
  scheduledToTime: z.string().optional(),
  hasCustomSla: z.boolean().default(false),
  customSlaHours: z.coerce.number().optional(),
});

export type NewExternalTicketFormValues = z.infer<typeof formSchema>;

interface NewExternalTicketFormProps {
  onFinished: () => void;
  onSave: (values: NewExternalTicketFormValues & { type: 'padrão' | 'contrato' | 'urgente' | 'agendado' | 'retorno', slaExpiresAt?: string }) => void;
}

const steps = [
    { step: 1, title: "Cliente e Problema" },
    { step: 2, title: "Contato e Endereço" },
    { step: 3, title: "Atribuição e Agendamento" },
];

export function NewExternalTicketForm({ onFinished, onSave }: NewExternalTicketFormProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState(1);
    const [addressMode, setAddressMode] = useState<'api' | 'manual' | 'none'>('none');
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [openClientSelector, setOpenClientSelector] = useState(false);
    const [clientSearch, setClientSearch] = useState("");

    // SLA State
    const [selectedClientSla, setSelectedClientSla] = useState<number | undefined>(undefined);
    const [hasCustomSla, setHasCustomSla] = useState(false);
    
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [sectorsSnapshot, usersSnapshot, clientsSnapshot, techsSnapshot] = await Promise.all([
                    getDocs(collection(db, "sectors")),
                    getDocs(collection(db, "users")),
                    getDocs(collection(db, "clients")),
                    getDocs(collection(db, "technicians")),
                ]);

                const sectorsData = sectorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sector));
                const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                const clientsData = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client))
                  .sort((a, b) => a.name.localeCompare(b.name));
                const techsData = techsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Technician));

                setSectors(sectorsData);
                setUsers(usersData);
                setClients(clientsData);
                setTechnicians(techsData);

            } catch (error) {
                console.error("Error fetching form data: ", error);
            }
        };

        fetchInitialData();
    }, []);

    const filteredClients = useMemo(() => {
        if (!clientSearch) {
            return clients.filter(c => c.status === 'active');
        }
        const lowercasedQuery = clientSearch.toLowerCase();
        return clients.filter(client =>
            client.status === 'active' && (
            client.name.toLowerCase().includes(lowercasedQuery) ||
            (client.document && client.document.replace(/[^\d]/g, '').includes(lowercasedQuery)) ||
            (client.address?.city && client.address.city.toLowerCase().includes(lowercasedQuery))
            )
        );
    }, [clientSearch, clients]);

    const form = useForm<NewExternalTicketFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            clientName: "",
            requesterName: "",
            contact: "",
            isWhatsapp: false,
            description: "",
            isContract: false,
            isUrgent: false,
            address: {
                street: "",
                number: "",
                neighborhood: "",
                city: "Ji-Paraná",
                state: "RO",
            },
            sectorId: user?.role === 'tecnico' && user.sectorIds?.length === 1 ? user.sectorIds[0] : undefined,
            scheduledToTime: "",
            hasCustomSla: false,
            customSlaHours: undefined,
        },
    });

    const selectedSectorId = form.watch("sectorId");
    
    const filteredTechnicians = useMemo(() => {
        if (!selectedSectorId) return [];
        return technicians.filter(t => t.sectorIds && t.sectorIds.includes(selectedSectorId));
    }, [technicians, selectedSectorId]);
        
    const visibleSectors = useMemo(() => {
        if (!user) return [];
        // Allow all active sectors for all roles capable of creating tickets
        return sectors.filter(s => s.status === 'active');
    }, [sectors]);
  
    const handleClientSelect = (clientId?: string) => {
        const client = clients.find(c => c.id === clientId);
        if (client) {
            form.setValue('clientId', client.id);
            form.setValue('clientName', client.name);
            form.setValue('contact', client.phone);
            setSelectedClientSla(client.slaHours);
            
            if (client.address && client.address.street) {
                form.setValue('address.street', client.address.street);
                form.setValue('address.number', client.address.number || '');
                form.setValue('address.neighborhood', client.address.neighborhood);
                form.setValue('address.city', client.address.city);
                form.setValue('address.state', client.address.state);
                setAddressMode('api');
            } else {
                setAddressMode('manual');
            }
        } else {
            // Logic for when a client is deselected or not found
            form.reset({
                ...form.getValues(),
                clientId: undefined,
                clientName: "",
                contact: "",
                address: {
                    street: "",
                    number: "",
                    neighborhood: "",
                    city: "Ji-Paraná",
                    state: "RO",
                },
            });
            setSelectedClientSla(undefined);
            setAddressMode('manual'); // Default to manual for a new entry
        }
    }

    const handleAddressModeChange = (value: 'api' | 'manual' | 'none') => {
        setAddressMode(value);
    }

    async function handleNextStep() {
        let fieldsToValidate: (keyof NewExternalTicketFormValues)[] = [];
    
        if (currentStep === 1) {
            fieldsToValidate = ['clientName', 'description'];
        } else if (currentStep === 2) {
            if (addressMode === 'manual') {
                fieldsToValidate.push('address.street', 'address.neighborhood', 'address.city', 'address.state');
            }
        } else if (currentStep === 3) {
            fieldsToValidate = ['sectorId'];
        }
    
        const isValid = await form.trigger(fieldsToValidate as any);
        if (isValid) {
            if (currentStep < 3) {
                setCurrentStep(currentStep + 1);
            }
        }
    }

    function handlePreviousStep() {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    }

    function onSubmit(values: NewExternalTicketFormValues) {
        let type: 'padrão' | 'contrato' | 'urgente' | 'agendado' | 'retorno' = 'padrão';

        if (values.scheduledToDate) {
            type = 'agendado';
        } else if (values.isUrgent) {
            type = 'urgente';
        } else if (values.isContract) {
            type = 'contrato';
        }

        const finalValues: any = { ...values, type };
        if (addressMode === 'none') {
            finalValues.address = undefined;
        } else if (addressMode === 'api') {
            const client = clients.find(c => c.id === values.clientId);
            if (client && client.address) {
                finalValues.address = client.address;
            }
        }

        let slaHours: number | undefined = undefined;
        if (values.hasCustomSla && values.customSlaHours) {
            slaHours = values.customSlaHours;
        } else if (selectedClientSla) {
            slaHours = selectedClientSla;
        }

        if (slaHours) {
            const now = new Date();
            finalValues.slaExpiresAt = addHours(now, slaHours).toISOString();
        }
        
        onSave(finalValues);
    }

    const isAddressVisible = addressMode === 'manual';


    return (
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="flex items-center justify-center space-x-2 md:space-x-4 mb-6 p-2 rounded-lg bg-muted">
                {steps.map((item, index) => (
                    <React.Fragment key={item.step}>
                        <div className="flex items-center">
                            <div
                                className={cn(
                                "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all",
                                currentStep > item.step ? "bg-primary text-primary-foreground" :
                                currentStep === item.step ? "bg-primary text-primary-foreground scale-110" : "bg-muted-foreground/30 text-muted-foreground"
                                )}
                            >
                               {currentStep > item.step ? <Check className="w-4 h-4" /> : item.step}
                            </div>
                            <div
                                className={cn(
                                "ml-2 text-sm hidden md:block",
                                currentStep === item.step ? "font-semibold text-foreground" : "text-muted-foreground"
                                )}
                            >
                                {item.title}
                            </div>
                        </div>
                        {index < steps.length - 1 && (
                             <div className={cn(
                                 "flex-1 h-1 rounded-full",
                                 currentStep > item.step ? "bg-primary" : "bg-muted-foreground/30"
                                 )} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            <div className="space-y-6 max-h-[60vh] md:max-h-[65vh] overflow-y-auto pr-4">
            
            {/* Step 1: Client & Problem */}
            {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in-0 duration-300">
                    <h3 className="text-lg font-medium">Informações do Cliente e Problema</h3>
                    
                     <FormField
                        control={form.control}
                        name="clientId"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Buscar Cliente (Banco Interno)</FormLabel>
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
                                        : "Selecione um cliente cadastrado"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput 
                                      placeholder="Buscar por nome, CNPJ/CPF ou cidade..." 
                                      value={clientSearch}
                                      onValueChange={setClientSearch}
                                    />
                                    <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                                    <CommandGroup>
                                    <ScrollArea className="h-48">
                                    {filteredClients.map((client) => (
                                        <CommandItem
                                            value={client.name + client.document + (client.address && client.address.city)}
                                            key={client.id}
                                            onSelect={() => {
                                                handleClientSelect(client.id);
                                                setOpenClientSelector(false);
                                                setClientSearch("");
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
                                            <div>
                                                <p>{client.name}</p>
                                                <p className="text-xs text-muted-foreground">{client.document} - {client.address?.city}</p>
                                            </div>
                                        </CommandItem>
                                    ))}
                                    </ScrollArea>
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
                        name="clientName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Cliente</FormLabel>
                            <FormControl>
                            <Input placeholder="Nome da empresa ou cliente" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    <div className="space-y-3">
                        <FormLabel>Tipo de Atendimento</FormLabel>
                        <div className="flex flex-col sm:flex-row gap-4">
                             <FormField
                                control={form.control}
                                name="isContract"
                                render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                        Contrato
                                    </FormLabel>
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="isUrgent"
                                render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                        Urgente
                                    </FormLabel>
                                </FormItem>
                                )}
                            />
                        </div>
                    </div>
                    
                    <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Descrição do Problema</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Descreva o problema relatado pelo cliente..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
            )}
            
            {/* Step 2: Address & Contact */}
            {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in-0 duration-300">
                    <h3 className="text-lg font-medium">Informações de Contato e Endereço</h3>
                     <FormField
                        control={form.control}
                        name="requesterName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nome do Solicitante (Opcional)</FormLabel>
                            <FormControl>
                            <Input placeholder="Quem abriu o chamado" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <FormField
                            control={form.control}
                            name="contact"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Contato (Opcional)</FormLabel>
                                <FormControl>
                                <Input placeholder="(99) 99999-9999" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="isWhatsapp"
                            render={({ field }) => (
                            <FormItem className="flex flex-row items-end space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                <FormLabel>
                                    O contato é WhatsApp?
                                </FormLabel>
                                </div>
                            </FormItem>
                            )}
                        />
                    </div>
                    <Separator className="my-4"/>
                    <RadioGroup
                        onValueChange={handleAddressModeChange}
                        value={addressMode}
                        className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 py-2"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="api" id="api" />
                            <label htmlFor="api">Usar endereço do cliente</label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="manual" id="manual" />
                            <label htmlFor="manual">Preencher manualmente</label>
                        </div>
                         <div className="flex items-center space-x-2">
                            <RadioGroupItem value="none" id="none" />
                            <label htmlFor="none">Deixar sem endereço</label>
                        </div>
                    </RadioGroup>

                    {isAddressVisible && form.getValues('address') && (
                    <div className="space-y-4 pt-2 border-t mt-2">
                        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
                        <FormField
                            control={form.control}
                            name="address.street"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Rua</FormLabel>
                                <FormControl>
                                <Input placeholder="Av. Brasil" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="address.number"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Número</FormLabel>
                                <FormControl>
                                <Input placeholder="1234" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_80px] gap-4">
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
                        <FormField
                            control={form.control}
                            name="address.city"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cidade</FormLabel>
                                <FormControl>
                                <Input placeholder="Porto Velho" {...field} />
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
                                <Input placeholder="RO" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        </div>
                    </div>
                    )}
                </div>
            )}

            {/* Step 3: Assignment & Scheduling */}
            {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in-0 duration-300">
                    <h3 className="text-lg font-medium">Atribuição e Agendamento</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="sectorId"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Setor</FormLabel>
                                <Select 
                                    onValueChange={(value) => {
                                        field.onChange(value)
                                        form.setValue('assigneeId', undefined)
                                    }} 
                                    value={field.value}
                                >
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Selecione o setor" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {visibleSectors.map((sector) => (
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
                        <FormField
                            control={form.control}
                            name="assigneeId"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Técnico (Opcional)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={!selectedSectorId}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder={!selectedSectorId ? "Selecione um setor primeiro" : "Selecione um técnico"} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {filteredTechnicians.map((technician) => (
                                    <SelectItem key={technician.id} value={technician.id}>
                                        {technician.name}
                                    </SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                    <Separator className="my-4"/>
                     <div className="space-y-4 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
                        <h4 className="text-md font-semibold text-amber-800 dark:text-amber-300 flex items-center">
                            <AlertTriangle className="h-5 w-5 mr-2"/>
                            SLA (Acordo de Nível de Serviço)
                        </h4>
                         {selectedClientSla !== undefined ? (
                            <div className="p-3 rounded-md bg-muted text-muted-foreground text-sm">
                                Este cliente possui um SLA padrão de <strong>{selectedClientSla} horas</strong>. O cronômetro será iniciado automaticamente.
                            </div>
                        ) : (
                             <FormField
                                control={form.control}
                                name="hasCustomSla"
                                render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 bg-background/50">
                                    <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={(checked) => {
                                            field.onChange(checked);
                                            setHasCustomSla(!!checked);
                                        }}
                                    />
                                    </FormControl>
                                    <FormLabel className="font-normal text-foreground">
                                        Definir um SLA customizado para este chamado?
                                    </FormLabel>
                                </FormItem>
                                )}
                            />
                        )}
                        {hasCustomSla && (
                            <FormField
                                control={form.control}
                                name="customSlaHours"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tempo de Atendimento (em horas)</FormLabel>
                                    <FormControl>
                                    <Input type="number" placeholder="Ex: 4" {...field} value={field.value ?? ""} className="bg-background/80"/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        )}
                    </div>
                    <Separator className="my-4"/>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        <FormField
                            control={form.control}
                            name="scheduledToDate"
                            render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Agendar Data (Opcional)</FormLabel>
                                <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                        )}
                                    >
                                        {field.value ? (
                                        format(field.value, "PPP", { locale: ptBR })
                                        ) : (
                                        <span>Escolha uma data</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                    locale={ptBR}
                                    />
                                </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="scheduledToTime"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Agendar Hora (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input type="time" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
            )}
            </div>

            <div className="flex justify-between gap-2 pt-4 border-t">
                <div>
                  {currentStep > 1 && (
                      <Button type="button" variant="outline" onClick={handlePreviousStep}>
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Anterior
                      </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={onFinished}>Cancelar</Button>
                  {currentStep < 3 && (
                      <Button type="button" onClick={handleNextStep}>
                          Próximo
                          <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                  )}
                  {currentStep === 3 && (
                      <Button type="submit">Salvar Chamado</Button>
                  )}
                </div>
            </div>
        </form>
        </Form>
    );
}
