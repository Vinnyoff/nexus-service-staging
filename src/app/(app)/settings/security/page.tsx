
'use client';

import { useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from '@/hooks/use-toast';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from 'lucide-react';

const passwordFormSchema = z.object({
    currentPassword: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
    newPassword: z.string().min(6, { message: "A nova senha deve ter pelo menos 6 caracteres." }),
    confirmPassword: z.string().min(6, { message: "A confirmação deve ter pelo menos 6 caracteres." }),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function SecurityPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const passwordForm = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordFormSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        }
    });

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

    return (
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
    );
}
