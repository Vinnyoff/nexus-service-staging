"use client"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { LogOut, User as UserIcon } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "./theme-toggle"

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  gerente: 'Gerente',
  encarregado: 'Encarregado',
  tecnico: 'Técnico',
  vendedor: 'Vendedor',
};

const roleColors: Record<string, string> = {
  admin: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  gerente: 'bg-primary/10 text-primary',
  encarregado: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  tecnico: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  vendedor: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
};

export function UserNav() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const roleLabel = roleLabels[user.role] ?? user.role;
  const roleColor = roleColors[user.role] ?? 'bg-muted text-muted-foreground';

  return (
    <div className="flex items-center gap-3">
      <div className="hidden md:flex items-center gap-3">
        <div className="flex flex-col items-end gap-0.5">
          <p className="text-sm font-medium leading-none text-foreground">{user.name}</p>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold leading-none ${roleColor}`}>
            {roleLabel}
          </span>
        </div>
      </div>

      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full ring-2 ring-transparent hover:ring-primary/30 transition-all">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-60" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-semibold leading-none">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              <span className={`self-start text-[10px] px-1.5 py-0.5 rounded font-semibold leading-none ${roleColor}`}>
                {roleLabel}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Perfil & Configurações</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sair</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
