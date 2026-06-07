
"use client"

import * as React from "react"
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnFiltersState,
} from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, ChevronLeft, ChevronsLeft, ChevronsRight, ChevronRight, Copy } from "lucide-react"

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
import type { ServiceContract, Sector, Checklist } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { EditContractForm, EditContractFormValues } from "./edit-contract-form"
import { ContractHistoryTab } from "./contract-history-tab"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { useToast } from "@/hooks/use-toast"

interface ContractsTableProps {
    data: ServiceContract[];
    sectors: Sector[];
    checklists: Checklist[];
    onUpdateContract: (contractId: string, values: EditContractFormValues, newStatus: 'active' | 'inactive') => Promise<boolean>;
}

export function ContractsTable({ data, sectors, checklists, onUpdateContract }: ContractsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'clientName', desc: false }
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [selectedContract, setSelectedContract] = React.useState<ServiceContract | null>(null);
  const [showInactive, setShowInactive] = React.useState(false);

  const handleEdit = (contract: ServiceContract) => {
    setSelectedContract(contract);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (contractId: string, values: EditContractFormValues, newStatus: 'active' | 'inactive') => {
      const success = await onUpdateContract(contractId, values, newStatus);
      if (success) {
          setIsEditOpen(false);
      }
  };

  const tableColumns: ColumnDef<ServiceContract>[] = React.useMemo(() => [
    {
      accessorKey: "clientName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Cliente
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="capitalize">{row.getValue("clientName")}</div>,
    },
    {
      accessorKey: "description",
      header: "Descrição",
      cell: ({ row }) => <div className="text-muted-foreground truncate max-w-xs">{row.getValue("description") || 'N/A'}</div>,
    },
    {
      accessorKey: "frequencyDays",
      header: "Frequência",
      cell: ({ row }) => <div>{row.getValue("frequencyDays")} dias</div>,
    },
    {
      accessorKey: "sectorIds",
      header: "Setores",
      cell: ({ row }) => {
          const sectorIds = row.getValue("sectorIds") as string[];
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
      cell: ({ row }) => (
        <Badge variant={row.getValue("status") === 'active' ? "default" : "destructive"} className="capitalize">{row.getValue("status") === 'active' ? 'Ativo' : 'Inativo'}</Badge>
      ),
    },
     {
      accessorKey: "createdAt",
      header: "Criado em",
      cell: ({ row }) => <div>{format(new Date(row.getValue("createdAt")), "dd/MM/yyyy")}</div>,
    },
  ], [sectors]);

  const filteredData = React.useMemo(() => {
    if (showInactive) return data;
    return data.filter(contract => contract.status === 'active');
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
    state: {
      sorting,
      columnFilters,
    },
  })

  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        <Input
          placeholder="Filtrar por cliente..."
          value={(table.getColumn("clientName")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("clientName")?.setFilterValue(event.target.value)
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
                  className="cursor-pointer"
                  onDoubleClick={() => handleEdit(row.original)}
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
                  Nenhum contrato encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} contrato(s) encontrado(s).
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
          <DialogContent className="sm:max-w-2xl">
            {selectedContract && (
            <>
                <DialogHeader>
                    <DialogTitle>Contrato: {selectedContract.clientName}</DialogTitle>
                    <div className="flex items-center gap-2 pt-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                            ID: {selectedContract.id}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                                navigator.clipboard.writeText(selectedContract.id);
                                useToast().toast({ title: "ID copiado para a área de transferência." });
                            }}
                            >
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogHeader>
                <Tabs defaultValue="dados">
                    <TabsList className="w-full">
                        <TabsTrigger value="dados" className="flex-1">Dados do Contrato</TabsTrigger>
                        <TabsTrigger value="historico" className="flex-1">Histórico de Atendimentos</TabsTrigger>
                    </TabsList>
                    <TabsContent value="dados">
                        <EditContractForm
                            contract={selectedContract}
                            sectors={sectors}
                            checklists={checklists}
                            onSave={handleSaveEdit}
                            onFinished={() => setIsEditOpen(false)}
                        />
                    </TabsContent>
                    <TabsContent value="historico">
                        <ContractHistoryTab
                            contractId={selectedContract.id}
                            sectors={sectors}
                        />
                    </TabsContent>
                </Tabs>
            </>
            )}
          </DialogContent>
        </Dialog>
    </div>
  )
}
