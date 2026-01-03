
"use client"

import * as React from "react"
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, CheckCircle, Loader2, ChevronLeft, ChevronsLeft, ChevronsRight, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { User, Sector, UserStatus, ModulePermissions } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog"
import { UserDetails } from "./user-details"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { EditUserForm, EditUserFormValues } from "./edit-user-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

// --- In-file Permissions Form Component ---

const permissionSchema = z.enum(['none', 'read', 'write']);
const permissionsFormSchema = z.object({
  dashboard: permissionSchema,
  external_tickets: permissionSchema,
  internal_tickets: permissionSchema,
  routes: permissionSchema,
  planning: permissionSchema,
  location: permissionSchema,
  reports: permissionSchema,
  history: permissionSchema,
  clients: permissionSchema,
  technicians: permissionSchema,
  monitoring: permissionSchema,
});

type PermissionsFormValues = z.infer<typeof permissionsFormSchema>;

const moduleLabels: Record<keyof ModulePermissions, string> = {
    dashboard: "Dashboard",
    external_tickets: "Chamados Externos",
    internal_tickets: "Atendimentos Internos",
    routes: "Otimizar Rotas",
    planning: "Planejamento",
    location: "Localização",
    reports: "Relatórios",
    history: "Histórico",
    clients: "Clientes",
    technicians: "Técnicos",
    monitoring: "Monitoramento",
};

const defaultEncarregadoPermissions: PermissionsFormValues = {
    dashboard: 'read',
    external_tickets: 'write',
    internal_tickets: 'write',
    routes: 'write',
    planning: 'read',
    location: 'write',
    reports: 'read',
    history: 'read',
    clients: 'read',
    technicians: 'read',
    monitoring: 'none',
};

const defaultGerentePermissions: PermissionsFormValues = {
    dashboard: 'write',
    external_tickets: 'write',
    internal_tickets: 'write',
    routes: 'write',
    planning: 'write',
    location: 'write',
    reports: 'write',
    history: 'write',
    clients: 'write',
    technicians: 'write',
    monitoring: 'write',
};


interface PermissionsFormProps {
  user: User;
  onSave: (userId: string, values: PermissionsFormValues) => void;
  onFinished: () => void;
}

function UserPermissionsForm({ user, onSave, onFinished }: PermissionsFormProps) {
  const [loading, setLoading] = React.useState(true);
  const defaultPermissions = user.role === 'gerente' ? defaultGerentePermissions : defaultEncarregadoPermissions;

  const form = useForm<PermissionsFormValues>({
    resolver: zodResolver(permissionsFormSchema),
    defaultValues: defaultPermissions
  });

  React.useEffect(() => {
    const fetchPermissions = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const userDocRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const userData = userSnap.data() as User;
          const currentPermissions = { ...defaultPermissions, ...userData.permissions };
          form.reset(currentPermissions);
        }
      } catch (error) {
        console.error("Error fetching permissions:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPermissions();
  }, [user, form, defaultPermissions]);

  const handleSave = (values: PermissionsFormValues) => {
    onSave(user.id, values);
    onFinished();
  }

  if (loading) {
    return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
        <div className="max-h-[60vh] overflow-y-auto pr-4 space-y-4">
          {Object.keys(moduleLabels).map((moduleKey) => {
            const key = moduleKey as keyof ModulePermissions;
            if (user.role === 'encarregado' && (key === 'reports' || key === 'technicians' || key === 'monitoring')) {
                // Simplifica a UI para encarregado, limitando opções
                return null;
            }
            return (
              <FormField
                key={key}
                control={form.control}
                name={key}
                render={({ field }) => (
                  <FormItem className="space-y-3 rounded-md border p-4">
                    <FormLabel className="font-semibold">{moduleLabels[key]}</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center space-x-4">
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="none" /></FormControl>
                          <FormLabel className="font-normal">Nenhum</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="read" /></FormControl>
                          <FormLabel className="font-normal">Leitura</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="write" /></FormControl>
                          <FormLabel className="font-normal">Escrita</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
            );
          })}
        </div>
        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={onFinished}>Cancelar</Button>
            <Button type="submit">Salvar Permissões</Button>
        </div>
      </form>
    </Form>
  );
}


// --- Original Table Component ---


const getStatusVariant = (status: UserStatus) => {
    switch (status) {
        case 'active': return 'default';
        case 'inactive': return 'destructive';
        case 'pending_invitation': return 'secondary';
        default: return 'outline';
    }
}

const getStatusText = (status: UserStatus) => {
    switch (status) {
        case 'active': return 'Ativo';
        case 'inactive': return 'Inativo';
        case 'pending_invitation': return 'Pendente';
        default: return status;
    }
}

const ActionsCell = ({ row, currentUser, onEdit, onEditPermissions, onStatusChange, onViewDetails }: { row: any, currentUser: User | null, onEdit: (user: User) => void, onEditPermissions: (user: User) => void, onStatusChange: (user: User, newStatus: UserStatus) => void, onViewDetails: (user: User) => void }) => {
  const user = row.original as User;
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [actionType, setActionType] = React.useState<'activate' | 'deactivate' | null>(null);

  const isGerenteManagingGerente = currentUser?.role === 'gerente' && user.role === 'gerente' && currentUser.id !== user.id;
  const isAdminManagingAdmin = currentUser?.role === 'admin' && user.role === 'admin' && currentUser.id !== user.id;
  const isSelf = currentUser?.id === user.id;
  
  const canManage = !isGerenteManagingGerente && !isAdminManagingAdmin && !isSelf;
  
  const handleActionClick = (e: React.MouseEvent, type: 'activate' | 'deactivate') => {
    e.stopPropagation();
    setActionType(type);
    setIsAlertOpen(true);
  }
  
  const handleConfirmAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (actionType) {
      onStatusChange(user, actionType === 'activate' ? 'active' : 'inactive');
    }
    setIsAlertOpen(false);
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(user);
  };

  const handlePermissionsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditPermissions(user);
  };

  const handleViewDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetails(user);
  };

  const handleCopyIdClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(user.id);
  };

  return (
    <>
      <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ações</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleViewDetailsClick}>Ver Detalhes</DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyIdClick}>
              Copiar ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleEditClick} disabled={!canManage}>
                Editar Usuário
            </DropdownMenuItem>
             <DropdownMenuItem onClick={handlePermissionsClick} disabled={!canManage}>
                Editar Permissões
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {user.status === 'active' ? (
                <DropdownMenuItem onClick={(e) => handleActionClick(e, 'deactivate')} disabled={!canManage} className="text-destructive focus:text-destructive">
                    Desativar
                </DropdownMenuItem>
            ) : (
                <DropdownMenuItem onClick={(e) => handleActionClick(e, 'activate')} disabled={!canManage}>
                    Reativar
                </DropdownMenuItem>
            )}
        </DropdownMenuContent>
        </DropdownMenu>
      </div>
         <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                Você deseja {actionType === 'activate' ? 'reativar' : 'desativar'} o usuário {user.name}?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmAction}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  )
}

interface UsersTableProps {
    data: User[];
    sectors: Sector[];
    onSaveUser: (userId: string, values: EditUserFormValues) => Promise<boolean>;
    onSavePermissions: (userId: string, permissions: Partial<ModulePermissions>) => Promise<void>;
    onStatusChange: (user: User, newStatus: UserStatus) => void;
}

export function UsersTable({ data, sectors, onSaveUser, onSavePermissions, onStatusChange }: UsersTableProps) {
  const { user: currentUser } = useAuth();
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = React.useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = React.useState(false);
  const [showInactive, setShowInactive] = React.useState(false);

  const filteredData = React.useMemo(() => {
    if (showInactive) return data;
    return data.filter(user => user.status === 'active');
  }, [data, showInactive]);


  const handleEditPermissions = (user: User) => {
    setSelectedUser(user);
    setIsPermissionsOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditUserOpen(true);
  };
  
  const handleSaveUser = async (userId: string, values: EditUserFormValues) => {
    const success = await onSaveUser(userId, values);
    if (success) {
      setIsEditUserOpen(false);
    }
  };
  
  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setIsDetailsOpen(true);
  }


  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Nome
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => <div className="capitalize">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "role",
      header: "Cargo",
      cell: ({ row }) => {
        const role = row.getValue("role") as string;
        const roleText = role === 'gerente' ? 'Gerente' : role === 'encarregado' ? 'Encarregado' : role;
        return <Badge variant="outline" className="capitalize">{roleText}</Badge>;
      }
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
          const status = row.getValue("status") as UserStatus;
          return <Badge variant={getStatusVariant(status)} className="capitalize">{getStatusText(status)}</Badge>
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: (props) => <ActionsCell {...props} currentUser={currentUser} onEdit={handleEditUser} onEditPermissions={handleEditPermissions} onStatusChange={onStatusChange} onViewDetails={handleViewDetails} />,
    },
  ]

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  const handleRowDoubleClick = (row: any) => {
    handleEditPermissions(row.original);
  }

  React.useEffect(() => {
    if (!isDetailsOpen) {
      setSelectedUser(null);
    }
  }, [isDetailsOpen]);

  React.useEffect(() => {
    if (!isPermissionsOpen) {
      setSelectedUser(null);
    }
  }, [isPermissionsOpen]);
  
   React.useEffect(() => {
    if (!isEditUserOpen) {
      setSelectedUser(null);
    }
  }, [isEditUserOpen]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        <Input
          placeholder="Filtrar por nome..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
         <div className="flex items-center space-x-2">
          <Checkbox
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={(checked) => setShowInactive(!!checked)}
          />
          <Label htmlFor="show-inactive">Mostrar inativos</Label>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onDoubleClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('button') || target.closest('[role="menu"]')) {
                      return;
                    }
                    handleRowDoubleClick(row);
                  }}
                  className="cursor-pointer"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} onClick={(e) => { if (cell.column.id === 'actions') { e.stopPropagation(); }}}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Nenhum resultado encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} usuário(s) encontrado(s).
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
            <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">Itens por página</p>
                <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                    table.setPageSize(Number(value))
                }}
                >
                <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue placeholder={table.getState().pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
             <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                Página {table.getState().pagination.pageIndex + 1} de{" "}
                {table.getPageCount()}
            </div>
            <div className="flex items-center space-x-2">
                <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                >
                    <span className="sr-only">Ir para a primeira página</span>
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    <span className="sr-only">Ir para a página anterior</span>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    <span className="sr-only">Ir para a próxima página</span>
                    <ChevronRight className="h-4 w-4" />
                </Button>
                 <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                >
                    <span className="sr-only">Ir para a última página</span>
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </div>
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Detalhes do Usuário</DialogTitle>
            </DialogHeader>
            {selectedUser && <UserDetails user={selectedUser} sectors={sectors} />}
          </DialogContent>
        </Dialog>
      <Dialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Editar permissões de {selectedUser?.name}</DialogTitle>
                    <DialogDescription>
                        Controle quais módulos este usuário pode acessar e editar.
                    </DialogDescription>
                </DialogHeader>
                {selectedUser && (
                    <UserPermissionsForm
                        user={selectedUser}
                        onSave={onSavePermissions}
                        onFinished={() => setIsPermissionsOpen(false)}
                    />
                )}
            </DialogContent>
        </Dialog>
       <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <EditUserForm
              user={selectedUser}
              sectors={sectors}
              onSave={handleSaveUser}
              onFinished={() => setIsEditUserOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
