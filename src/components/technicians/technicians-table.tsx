
"use client"

import * as React from "react"
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
import { ArrowUpDown, ChevronLeft, ChevronsLeft, ChevronsRight, ChevronRight, MoreHorizontal, Copy } from "lucide-react"

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
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { EditTechnicianForm, EditTechnicianFormValues } from "./edit-technician-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";


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
}

const ActionsCell: React.FC<ActionsCellProps> = ({ row }) => {
  const technician = row.original as Technician;
  const { toast } = useToast();

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(technician.id);
    toast({ title: "ID do técnico copiado!" });
  };


  return (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleCopyId}>
              <Copy className="mr-2 h-4 w-4" />
            Copiar ID
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
  )
}

interface TechniciansTableProps {
    data: Technician[];
    sectors: Sector[];
    onSavePermissions: (userId: string, permissions: Partial<ModulePermissions>) => Promise<void>;
    onUpdateTechnician: (technicianId: string, values: EditTechnicianFormValues, newStatus: UserStatus) => Promise<boolean>;
}

export function TechniciansTable({ data, sectors, onSavePermissions, onUpdateTechnician }: TechniciansTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [selectedTechnician, setSelectedTechnician] = React.useState<Technician | null>(null);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [showInactive, setShowInactive] = React.useState(false);

  const handleEdit = (technician: Technician) => {
    setSelectedTechnician(technician);
    setIsEditOpen(true);
  };
  
  const handleSaveEdit = async (technicianId: string, values: EditTechnicianFormValues, newStatus: UserStatus) => {
      const success = await onUpdateTechnician(technicianId, values, newStatus);
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
          const sectorNames = sectorIds.map(id => sectors.find(s => s.id === id)?.name).filter(Boolean);
          return (
            <div className="flex flex-wrap gap-1">
                {sectorNames.map(name => <Badge key={name} variant="secondary">{name}</Badge>)}
            </div>
          )
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
      cell: (props) => <ActionsCell {...props} />,
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
                  onDoubleClick={() => handleEdit(row.original)}
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
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-xl">
            {selectedTechnician && (
              <>
                 <DialogHeader>
                    <DialogTitle>Editar Técnico: {selectedTechnician.name}</DialogTitle>
                     <DialogDescription>
                        <div className="flex items-center gap-2 pt-2">
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                                ID: {selectedTechnician.id}
                            </span>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => {
                                    navigator.clipboard.writeText(selectedTechnician.id);
                                    useToast().toast({ title: "ID copiado para a área de transferência." });
                                }}
                                >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <EditTechnicianForm
                    technician={selectedTechnician}
                    sectors={sectors}
                    onSave={handleSaveEdit}
                    onSavePermissions={onSavePermissions}
                    onFinished={() => setIsEditOpen(false)}
                />
              </>
            )}
          </DialogContent>
        </Dialog>
    </div>
  )
}
