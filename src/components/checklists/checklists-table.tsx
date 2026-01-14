
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
import type { Checklist, Sector } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog"
import { Checkbox } from "../ui/checkbox"
import { Label } from "../ui/label"
import { EditChecklistForm, EditChecklistFormValues } from "./edit-checklist-form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"


const ActionsCell = ({ row }: { row: any }) => {
  const checklist = row.original as Checklist;
  const { toast } = useToast();

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(checklist.id);
    toast({ title: "ID do Checklist copiado!" });
  }

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

interface ChecklistsTableProps {
    data: Checklist[];
    sectors: Sector[];
    onUpdateChecklist: (checklistId: string, values: EditChecklistFormValues, newStatus: 'active' | 'archived') => Promise<boolean>;
}

export function ChecklistsTable({ data, sectors, onUpdateChecklist }: ChecklistsTableProps) {
  const { user } = useAuth();
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'name', desc: false }
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [selectedChecklist, setSelectedChecklist] = React.useState<Checklist | null>(null);
  const [showArchived, setShowArchived] = React.useState(false);

  const handleEdit = (checklist: Checklist) => {
    setSelectedChecklist(checklist);
    setIsEditOpen(true);
  };
  
  const handleSaveEdit = async (checklistId: string, values: EditChecklistFormValues, newStatus: 'active' | 'archived') => {
      const success = await onUpdateChecklist(checklistId, values, newStatus);
      if (success) {
          setIsEditOpen(false);
      }
  };
  
  const columns: ColumnDef<Checklist>[] = [
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
      accessorKey: "sectorId",
      header: "Setor",
      cell: ({ row }) => {
        const sector = sectors.find(s => s.id === row.getValue("sectorId"));
        return sector ? <Badge variant="outline">{sector.name}</Badge> : 'N/A';
      },
    },
    {
      accessorKey: "tasks",
      header: "Nº de Tarefas",
      cell: ({ row }) => <div>{(row.getValue("tasks") as any[]).length}</div>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.getValue("status") === 'active' ? "default" : "destructive"} className="capitalize">
          {row.getValue("status") === 'active' ? 'Ativo' : 'Arquivado'}
        </Badge>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => <ActionsCell row={row} />,
    },
  ]
  
  const userVisibleData = React.useMemo(() => {
    if (!user) return [];
    if (user?.role === 'admin' || user?.role === 'gerente') {
      return data;
    }
    if (user?.role === 'encarregado') {
      return data.filter(checklist => user.sectorIds.includes(checklist.sectorId));
    }
    return [];
  }, [data, user]);

  const filteredData = React.useMemo(() => {
    if (showArchived) return userVisibleData;
    return userVisibleData.filter(checklist => checklist.status === 'active');
  }, [userVisibleData, showArchived]);
  
  const visibleSectors = sectors.filter(s => {
      if(!user) return [];
      if(user?.role === 'admin' || user?.role === 'gerente') return true;
      if(user?.role === 'encarregado') return user.sectorIds.includes(s.id);
      return false;
  });


  const table = useReactTable({
    data: filteredData,
    columns,
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
          placeholder="Filtrar por nome..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <div className="flex items-center space-x-2">
            <Checkbox
                id="show-archived"
                checked={showArchived}
                onCheckedChange={(checked) => setShowArchived(!!checked)}
            />
            <Label htmlFor="show-archived">Mostrar arquivados</Label>
        </div>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
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
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Nenhum checklist encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
       <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} checklist(s) encontrado(s).
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
            {selectedChecklist && (
                <>
                    <DialogHeader>
                        <DialogTitle>Editar Checklist: {selectedChecklist.name}</DialogTitle>
                         <DialogDescription>
                            <div className="flex items-center gap-2 pt-2">
                                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                                    ID: {selectedChecklist.id}
                                </span>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    onClick={() => {
                                        navigator.clipboard.writeText(selectedChecklist.id);
                                        useToast().toast({ title: "ID copiado para a área de transferência." });
                                    }}
                                    >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <EditChecklistForm 
                        checklist={selectedChecklist} 
                        sectors={visibleSectors}
                        onSave={handleSaveEdit} 
                        onFinished={() => setIsEditOpen(false)}
                    />
                </>
            )}
            </DialogContent>
        </Dialog>
    </div>
  )
}
