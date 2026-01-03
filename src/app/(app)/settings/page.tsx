
'use client';

import { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from '@/hooks/use-toast';
import { storage, db } from '@/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from 'lucide-react';

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  email: z.string().email(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
    },
  });

  useEffect(() => {
    if (user) {
        profileForm.reset({
            name: user.name,
            email: user.email,
        });
    }
  }, [user, profileForm]);

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

  if (!user) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  return (
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
  );
}
