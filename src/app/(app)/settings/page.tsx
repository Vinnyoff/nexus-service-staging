
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { storage, db } from '@/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { ClipboardList, Loader2, Map, Wrench, LayoutGrid, Calendar, CalendarCheck, History, LineChart, MapPinned, CheckCircle } from 'lucide-react';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import type { MobileNavPreferences } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { useDebounce } from '@/hooks/use-debounce';

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  email: z.string().email(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const passwordFormSchema = z.object({
    currentPassword: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
    newPassword: z.string().min(6, { message: "A nova senha deve ter pelo menos 6 caracteres." }),
    confirmPassword: z.string().min(6, { message: "A confirmação deve ter pelo menos 6 caracteres." }),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

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


export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const { setTheme, theme } = useTheme();
  const { toast } = useToast();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSavingNav, setIsSavingNav] = useState(false);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
    },
  });

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

  useDebounce(() => {
    if (mobileNavForm.formState.isDirty) {
        onMobileNavSubmit(mobileNavFormValues);
    }
  }, 1000, [mobileNavFormValues, mobileNavForm.formState.isDirty]);
  
  useEffect(() => {
    if (user) {
        profileForm.reset(user);
        mobileNavForm.reset({
            dashboard: user.mobileNavPreferences?.dashboard ?? true,
            schedule: user.mobileNavPreferences?.schedule ?? true,
            external_tickets: user.mobileNavPreferences?.external_tickets ?? true,
            internal_tickets: user.mobileNavPreferences?.internal_tickets ?? true,
            routes: user.mobileNavPreferences?.routes ?? true,
            location: user.mobileNavPreferences?.location ?? true,
            planning: user.mobileNavPreferences?.planning ?? false,
            history: user.mobileNavPreferences?.history ?? false,
            reports: user.mobileNavPreferences?.reports ?? false,
        });
    }
  }, [user, profileForm, mobileNavForm]);

  const passwordForm = useForm<PasswordFormValues>({
      resolver: zodResolver(passwordFormSchema),
      defaultValues: {
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
      }
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const newPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(newPreviewUrl);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile || !user) return;

    setIsUploading(true);
    const storageRef = ref(storage, `avatars/${user.id}/${avatarFile.name}`);

    try {
      await uploadBytes(storageRef, avatarFile);
      const downloadURL = await getDownloadURL(storageRef);
      const userDocRef = doc(db, "users", user.id);
      await updateDoc(userDocRef, { avatarUrl: downloadURL });
      
      setUser((prevUser) => (prevUser ? { ...prevUser, avatarUrl: downloadURL } : null));

      toast({
        title: "Avatar atualizado!",
        description: "Sua foto de perfil foi alterada com sucesso.",
      });

      setAvatarFile(null);
      setPreviewUrl(null);

    } catch (error) {
      console.error("Falha no Upload do Avatar:", error);
      toast({
        variant: "destructive",
        title: "Falha no Upload",
        description: "Não foi possível salvar seu novo avatar. Verifique as regras de segurança do Storage e tente novamente.",
      });
    } finally {
      setIsUploading(false);
    }
  };


  async function onProfileSubmit(values: ProfileFormValues) {
    if(!user) return;
    
    const userDocRef = doc(db, "users", user.id);
    try {
        await updateDoc(userDocRef, { name: values.name });
        setUser((prev) => (prev ? { ...prev, name: values.name } : null));
        toast({ title: "Perfil salvo!", description: "Seu nome foi atualizado." });
    } catch(error) {
        console.error("Error updating profile:", error);
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível atualizar seu nome.'});
    }
  }

  async function onPasswordSubmit(values: PasswordFormValues) {
    if (!user) return;
    setIsChangingPassword(true);

    const auth = getAuth();
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
        toast({ variant: "destructive", title: "Erro de autenticação" });
        setIsChangingPassword(false);
        return;
    }

    try {
        const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
        await reauthenticateWithCredential(firebaseUser, credential);

        await updatePassword(firebaseUser, values.newPassword);

        toast({ title: "Senha alterada com sucesso!" });
        passwordForm.reset();
    } catch (error: any) {
        console.error("Error changing password:", error);
        if (error.code === 'auth/wrong-password') {
            toast({ variant: "destructive", title: "Senha atual incorreta." });
        } else {
            toast({ variant: "destructive", title: "Erro ao alterar senha", description: "Tente novamente mais tarde." });
        }
    } finally {
        setIsChangingPassword(false);
    }
  }

  async function onMobileNavSubmit(values: MobileNavFormValues) {
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
        mobileNavForm.reset(values); // Mark form as pristine
        setTimeout(() => setIsSavingNav(false), 500); // Keep saved state for a moment
    }
  }

  if (!user) return null;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

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
    if (user.role === 'tecnico') {
        return !['planning', 'reports'].includes(option.name);
    }
    return true;
  });

  return (
    <>
      <PageHeader title="Configurações" description="Gerencie as configurações da sua conta e preferências." />
      
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="appearance">Aparência</TabsTrigger>
          <TabsTrigger value="mobile">Mobile</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Perfil</CardTitle>
              <CardDescription>
                Atualize suas informações pessoais.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                  <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20">
                          <AvatarImage src={previewUrl || user.avatarUrl} alt={user.name} />
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <Input type="file" accept="image/*" onChange={handleFileChange} className="max-w-xs" disabled={isUploading}/>
                      {avatarFile && (
                        <Button onClick={handleAvatarUpload} disabled={isUploading}>
                          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar Foto"}
                        </Button>
                      )}
                  </div>
                   <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-8">
                      <FormField
                        control={profileForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome</FormLabel>
                            <FormControl>
                              <Input placeholder="Seu nome" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="Seu email" {...field} disabled />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                        {profileForm.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Salvar Alterações de Nome
                      </Button>
                    </form>
                  </Form>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
            <Card>
                <CardHeader>
                    <CardTitle>Segurança</CardTitle>
                    <CardDescription>
                        Altere sua senha de acesso.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...passwordForm}>
                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-8">
                            <FormField
                                control={passwordForm.control}
                                name="currentPassword"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Senha Atual</FormLabel>
                                    <FormControl>
                                    <Input type="password" {...field} disabled={isChangingPassword} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={passwordForm.control}
                                name="newPassword"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nova Senha</FormLabel>
                                    <FormControl>
                                    <Input type="password" {...field} disabled={isChangingPassword} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={passwordForm.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirmar Nova Senha</FormLabel>
                                    <FormControl>
                                    <Input type="password" {...field} disabled={isChangingPassword} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isChangingPassword}>
                                {isChangingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                {isChangingPassword ? 'Alterando...' : 'Alterar Senha'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="appearance">
            <Card>
                <CardHeader>
                    <CardTitle>Aparência</CardTitle>
                    <CardDescription>
                        Personalize a aparência da aplicação.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Tema</Label>
                        <p className="text-sm text-muted-foreground pb-2">
                            Selecione o tema para o dashboard.
                        </p>
                        <RadioGroup
                            onValueChange={setTheme}
                            defaultValue={theme}
                            className="grid max-w-md grid-cols-1 md:grid-cols-3 gap-8 pt-2"
                        >
                            <div>
                                <Label className="[&:has([data-state=checked])>div]:border-primary">
                                <RadioGroupItem value="light" className="sr-only" />
                                <div className="items-center rounded-md border-2 border-muted p-1 hover:border-accent">
                                    <div className="space-y-2 rounded-sm bg-[#ecedef] p-2">
                                    <div className="space-y-2 rounded-md bg-white p-2 shadow-sm">
                                        <div className="h-2 w-[80px] rounded-lg bg-[#ecedef]" />
                                        <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                                    </div>
                                    <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                                        <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                                        <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                                    </div>
                                    <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                                        <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                                        <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                                    </div>
                                    </div>
                                </div>
                                <span className="block w-full p-2 text-center font-normal">
                                    Claro
                                </span>
                                </Label>
                            </div>
                             <div>
                                <Label className="[&:has([data-state=checked])>div]:border-primary">
                                <RadioGroupItem value="dark" className="sr-only" />
                                <div className="items-center rounded-md border-2 border-muted bg-popover p-1 hover:bg-accent hover:text-accent-foreground">
                                    <div className="space-y-2 rounded-sm bg-slate-950 p-2">
                                    <div className="space-y-2 rounded-md bg-slate-800 p-2 shadow-sm">
                                        <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
                                        <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                                    </div>
                                    <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                                        <div className="h-4 w-4 rounded-full bg-slate-400" />
                                        <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                                    </div>
                                    <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                                        <div className="h-4 w-4 rounded-full bg-slate-400" />
                                        <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                                    </div>
                                    </div>
                                </div>
                                <span className="block w-full p-2 text-center font-normal">
                                    Escuro
                                </span>
                                </Label>
                            </div>
                             <div>
                                <Label className="[&:has([data-state=checked])>div]:border-primary">
                                <RadioGroupItem value="system" className="sr-only" />
                                <div className="items-center rounded-md border-2 border-muted p-1 hover:border-accent">
                                    <div className="space-y-2 rounded-sm bg-[#ecedef] p-2">
                                        <p className="text-center text-xs text-black">Sistema</p>
                                    </div>
                                </div>
                                <span className="block w-full p-2 text-center font-normal">
                                    Sistema
                                </span>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="mobile">
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
        </TabsContent>

      </Tabs>
    </>
  );
}

    

    