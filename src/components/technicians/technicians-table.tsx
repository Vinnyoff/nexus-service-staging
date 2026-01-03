
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
import { ArrowUpDown, ChevronLeft, ChevronsLeft, ChevronsRight, ChevronRight, MoreHorizontal, Loader2 } from "lucide-react"

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
import type { ModulePermissions, Sector, Technician, User, UserStatus } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog"
import { TechnicianDetails } from "./technician-details"
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { EditTechnicianForm, EditTechnicianFormValues } from "./edit-technician-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";


// --- In-file Permissions Form Component ---

const permissionSchema = z.enum(['none', 'read', 'write']);
const permissionsFormSchema = z.object({
  dashboard: permissionSchema,
  external_tickets: permissionSchema,
  internal_tickets: permissionSchema,
  routes: permissionSchema,
  planning: permissionSchema,
  reports: permissionSchema,
  history: permissionSchema,
  clients: permissionSchema,
  technicians: permissionSchema,
  location: permissionSchema,
  monitoring: permissionSchema,
});

type PermissionsFormValues = z.infer<typeof permissionsFormSchema>;

const moduleLabels: Record<keyof ModulePermissions, string> = {
    dashboard: "Dashboard",
    external_tickets: "Chamados Externos",
    internal_tickets: "Atendimentos Internos",
    routes: "Otimizar Rotas",
    planning: "Planejamento",
    reports: "Relatórios",
    history: "Histórico",
    clients: "Clientes",
    technicians: "Técnicos",
    location: "Localização",
    monitoring: "Monitoramento",
};

const defaultPermissions: PermissionsFormValues = {
    dashboard: 'read',
    external_tickets: 'write',
    internal_tickets: 'write',
    routes: 'write',
    planning: 'none',
    location: 'read',
    reports: 'none',
    history: 'read',
    clients: 'read',
    technicians: 'none',
    monitoring: 'none',
};

interface PermissionsFormProps {
  technician: Technician;
  onFinished: () => void;
  onSave: (userId: string, permissions: Partial<ModulePermissions>) => Promise<void>;
}

function TechnicianPermissionsForm({ technician, onFinished, onSave }: PermissionsFormProps) {
  const [loading, setLoading] = React.useState(true);
  const form = useForm<PermissionsFormValues>({
    resolver: zodResolver(permissionsFormSchema),
    defaultValues: defaultPermissions
  });

  React.useEffect(() => {
    const fetchPermissions = async () => {
      if (!technician?.id) return;
      setLoading(true);
      try {
        const userDocRef = doc(db, 'users', technician.id);
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
  }, [technician, form]);

  const handleSave = async (values: PermissionsFormValues) => {
    await onSave(technician.id, values);
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
            if (key === 'reports' || key === 'technicians' || key === 'monitoring' || key === 'planning') return null; // Hide non-applicable modules for techs
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

const getStatusVariant = (status: Technician['status']) => {
    switch (status) {
        case 'active': return 'default';
        case 'inactive': return 'destructive';
        case 'pending_invitation': return 'secondary';
        default: return 'outline';
    }
}

const getStatusText = (status: Technician['status']) => {
    switch (status) {
        case 'active': return 'Ativo';
        case 'inactive': return 'Inativo';
        case 'pending_invitation': return 'Pendente';
        default: return status;
    }
}

interface ActionsCellProps {
  row: any;
  onEdit: (technician: Technician) => void;
  onEditPermissions: (technician: Technician) => void;
  onStatusChange: (technician: Technician, status: UserStatus) => void;
  onViewDetails: (technician: Technician) => void;
}

const ActionsCell: React.FC<ActionsCellProps> = ({ row, onEdit, onEditPermissions, onStatusChange, onViewDetails }) => {
  const technician = row.original as Technician;
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [actionType, setActionType] = React.useState<'activate' | 'deactivate' | null>(null);

  const handleActionClick = (e: React.MouseEvent, type: 'activate' | 'deactivate') => {
    e.stopPropagation();
    setActionType(type);
    setIsAlertOpen(true);
  }
  
  const handleConfirmAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (actionType) {
      onStatusChange(technician, actionType === 'activate' ? 'active' : 'inactive');
    }
    setIsAlertOpen(false);
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(technician);
  }

  const handlePermissionsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditPermissions(technician);
  }
  
  const handleViewDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetails(technician);
  }

  const handleCopyIdClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(technician.id);
  };


  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleViewDetailsClick}>
            Ver Detalhes
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleCopyIdClick}
          >
            Copiar ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleEditClick}>
              Editar Técnico
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePermissionsClick} disabled={technician.status !== 'active'}>
              Editar Permissões
          </DropdownMenuItem>
          {technician.status === 'active' ? (
              <DropdownMenuItem onClick={(e) => handleActionClick(e, 'deactivate')} className="text-destructive focus:text-destructive">
                  Desativar
              </DropdownMenuItem>
          ) : (
                <DropdownMenuItem onClick={(e) => handleActionClick(e, 'activate')}>
                  Reativar
              </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
       <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                  Você deseja {actionType === 'activate' ? 'reativar' : 'desativar'} o técnico {technician.name}?
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

interface TechniciansTableProps {
    data: Technician[];
    sectors: Sector[];
    onSavePermissions: (userId: string, permissions: Partial<ModulePermissions>) => Promise<void>;
    onStatusChange: (technician: Technician, status: UserStatus) => void;
    onUpdateTechnician: (technicianId: string, values: EditTechnicianFormValues) => Promise<boolean>;
}

export function TechniciansTable({ data, sectors, onSavePermissions, onStatusChange, onUpdateTechnician }: TechniciansTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [selectedTechnician, setSelectedTechnician] = React.useState<Technician | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [showInactive, setShowInactive] = React.useState(false);


  const handleEditPermissions = (technician: Technician) => {
    setSelectedTechnician(technician);
    setIsPermissionsOpen(true);
  };

  const handleEdit = (technician: Technician) => {
    setSelectedTechnician(technician);
    setIsEditOpen(true);
  };
  
  const handleSavePermissions = async (userId: string, permissions: Partial<ModulePermissions>) => {
    await onSavePermissions(userId, permissions);
    setIsPermissionsOpen(false);
  };

  const handleSaveEdit = async (technicianId: string, values: EditTechnicianFormValues) => {
      const success = await onUpdateTechnician(technicianId, values);
      if (success) {
          setIsEditOpen(false);
      }
  };
  
  const filteredData = React.useMemo(() => {
    if (showInactive) return data;
    return data.filter(tech => tech.status === 'active');
  }, [data, showInactive]);


  const columns: ColumnDef<Technician>[] = [
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
      accessorKey: "sectorIds",
      header: "Setor",
      cell: ({ row }) => {
          const sectorIds = row.getValue("sectorIds") as string[] | undefined;
          if (!sectorIds || sectorIds.length === 0) {
            return <div className="capitalize text-muted-foreground">N/A</div>;
          }
          const sector = sectors.find(s => sectorIds.includes(s.id));
          return <div className="capitalize">{sector?.name || 'N/A'}</div>;
      }
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
          const status = row.getValue("status") as Technician['status'];
          return <Badge variant={getStatusVariant(status)} className="capitalize">{getStatusText(status)}</Badge>
      }
    },
    {
      id: "actions",
      enableHiding: false,
      cell: (props) => <ActionsCell {...props} onEdit={handleEdit} onEditPermissions={handleEditPermissions} onStatusChange={onStatusChange} onViewDetails={handleViewDetails} />,
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

  const handleViewDetails = (technician: Technician) => {
    setSelectedTechnician(technician);
    setIsDetailsOpen(true);
  }

  const handleRowDoubleClick = (row: any) => {
    handleEditPermissions(row.original);
  }

  React.useEffect(() => {
    if (!isDetailsOpen) {
      setSelectedTechnician(null);
    }
  }, [isDetailsOpen]);

  React.useEffect(() => {
    if (!isPermissionsOpen) {
      setSelectedTechnician(null);
    }
  }, [isPermissionsOpen]);
  
  React.useEffect(() => {
    if (!isEditOpen) {
      setSelectedTechnician(null);
    }
  }, [isEditOpen]);

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
      <div className="rounded-md border overflow-x-auto">
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
          {table.getFilteredRowModel().rows.length} técnico(s) encontrado(s).
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
              <DialogTitle>Detalhes do Técnico</DialogTitle>
            </DialogHeader>
            {selectedTechnician && <TechnicianDetails technician={selectedTechnician} sectors={sectors} />}
          </DialogContent>
        </Dialog>
        <Dialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Editar permissões de {selectedTechnician?.name}</DialogTitle>
                    <DialogDescription>
                        Controle quais módulos este técnico pode acessar e editar.
                    </DialogDescription>
                </DialogHeader>
                {selectedTechnician && (
                    <TechnicianPermissionsForm
                        technician={selectedTechnician}
                        onFinished={() => setIsPermissionsOpen(false)}
                        onSave={onSavePermissions}
                    />
                )}
            </DialogContent>
        </Dialog>
         <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Técnico</DialogTitle>
            </DialogHeader>
            {selectedTechnician && (
              <EditTechnicianForm
                technician={selectedTechnician}
                sectors={sectors}
                onSave={handleSaveEdit}
                onFinished={() => setIsEditOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
    </div>
  )
}
