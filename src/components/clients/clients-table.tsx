
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
import { ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from "lucide-react"

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
import type { Client } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog"
import { ClientDetails } from "./client-details"
import { Checkbox } from "../ui/checkbox"
import { Label } from "../ui/label"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { EditClientForm, EditClientFormValues } from "./edit-client-form"

type ActionType = 'activate' | 'deactivate';

const ActionsCell = ({ row, onStatusChange, onEdit, onViewDetails }: { row: any, onStatusChange: (client: Client, status: 'active' | 'inactive') => void, onEdit: (client: Client) => void, onViewDetails: (client: Client) => void }) => {
  const client = row.original as Client
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [actionType, setActionType] = React.useState<ActionType | null>(null);

  const handleActionClick = (e: React.MouseEvent, type: ActionType) => {
    e.stopPropagation();
    setActionType(type);
    setIsAlertOpen(true);
  }

  const handleConfirmAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (actionType) {
      onStatusChange(client, actionType === 'activate' ? 'active' : 'inactive');
    }
    setIsAlertOpen(false);
  }
  
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(client);
  }

  const handleViewDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetails(client);
  };

  const handleCopyIdClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(client.id);
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
          <DropdownMenuItem onClick={handleViewDetailsClick}>Ver Detalhes</DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleCopyIdClick}
          >
            Copiar ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleEditClick}>Editar</DropdownMenuItem>
          {client.status === 'active' ? (
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
              Você deseja {actionType === 'activate' ? 'reativar' : 'desativar'} o cliente {client.name}?
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

interface ClientsTableProps {
    data: Client[];
    onStatusChange: (client: Client, status: 'active' | 'inactive') => void;
    onUpdateClient: (clientId: string, values: EditClientFormValues) => Promise<boolean>;
}

export function ClientsTable({ data, onStatusChange, onUpdateClient }: ClientsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'name', desc: false } // Default sort by name ascending
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [showInactive, setShowInactive] = React.useState(false);

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setIsEditOpen(true);
  };
  
  const handleViewDetails = (client: Client) => {
    setSelectedClient(client);
    setIsDetailsOpen(true);
  }

  const handleSaveEdit = async (clientId: string, values: EditClientFormValues) => {
      const success = await onUpdateClient(clientId, values);
      if (success) {
          setIsEditOpen(false);
      }
  };

  const tableColumns = React.useMemo(() => {
    const columns: ColumnDef<Client>[] = [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Nome
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="capitalize">{row.getValue("name")}</div>,
      },
      {
        accessorKey: "document",
        header: "Documento",
      },
      {
        accessorKey: "phone",
        header: "Telefone",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.getValue("status") === 'active' ? "default" : "destructive"} className="capitalize">{row.getValue("status") === 'active' ? 'Ativo' : 'Inativo'}</Badge>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => <ActionsCell row={row} onStatusChange={onStatusChange} onEdit={handleEdit} onViewDetails={handleViewDetails} />,
      },
    ];
    return columns;
  }, [onStatusChange]);

  const filteredData = React.useMemo(() => {
    if (showInactive) return data;
    return data.filter(client => client.status === 'active');
  }, [data, showInactive]);

  const table = useReactTable({
    data: filteredData,
    columns: tableColumns,
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
    handleEdit(row.original);
  }

  React.useEffect(() => {
    if (!isDetailsOpen) {
      setSelectedClient(null);
    }
  }, [isDetailsOpen]);

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
                    // Previne que o duplo clique seja acionado se o clique foi em um botão ou dentro de um menu
                    if (target.closest('button') || target.closest('[role="menu"]')) {
                      return;
                    }
                    handleRowDoubleClick(row);
                  }}
                  className="cursor-pointer"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} onClick={(e) => { if(cell.column.id === 'actions') { e.stopPropagation(); }}}>
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
                  colSpan={tableColumns.length}
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
          {table.getFilteredRowModel().rows.length} cliente(s) encontrado(s).
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
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Cliente</DialogTitle>
            </DialogHeader>
            {selectedClient && <ClientDetails client={selectedClient} />}
          </DialogContent>
        </Dialog>
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Editar Cliente</DialogTitle>
              <DialogDescription>Altere as informações do cliente {selectedClient?.name}.</DialogDescription>
            </DialogHeader>
            {selectedClient && <EditClientForm client={selectedClient} onSave={handleSaveEdit} onFinished={() => setIsEditOpen(false)} />}
          </DialogContent>
        </Dialog>
    </div>
  )
}
