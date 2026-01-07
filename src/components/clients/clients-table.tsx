
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
import { ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Copy, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { EditClientForm, EditClientFormValues } from "./edit-client-form"
import { useToast } from "@/hooks/use-toast"


interface ClientsTableProps {
    data: Client[];
    onUpdateClient: (clientId: string, values: EditClientFormValues, newStatus: 'active' | 'inactive') => Promise<boolean>;
}

export function ClientsTable({ data, onUpdateClient }: ClientsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'name', desc: false } // Default sort by name ascending
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [editingClient, setEditingClient] = React.useState<Client | null>(null);
  const [showInactive, setShowInactive] = React.useState(false);
  const { toast } = useToast();

  const handleSaveEdit = async (clientId: string, values: EditClientFormValues, newStatus: 'active' | 'inactive') => {
      const success = await onUpdateClient(clientId, values, newStatus);
      if (success) {
          setEditingClient(null);
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
    ];
    return columns;
  }, []);

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

  const handleRowDoubleClick = (client: Client) => {
    setEditingClient(client);
  }


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
                  onDoubleClick={() => handleRowDoubleClick(row.original)}
                  className="cursor-pointer"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
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
      <Dialog open={!!editingClient} onOpenChange={(isOpen) => !isOpen && setEditingClient(null)}>
        <DialogContent className="sm:max-w-4xl">
            {editingClient && (
              <>
                <DialogHeader>
                  <DialogTitle>Editando Cliente: {editingClient.name}</DialogTitle>
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                      ID: {editingClient.id}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => {
                        navigator.clipboard.writeText(editingClient.id);
                        toast({ title: "ID copiado para a área de transferência." });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </DialogHeader>
                <EditClientForm 
                    client={editingClient} 
                    onSave={handleSaveEdit} 
                    onFinished={() => setEditingClient(null)} 
                />
              </>
            )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
