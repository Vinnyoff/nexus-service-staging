
"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronLeft, ChevronsLeft, ChevronsRight, ChevronRight, MoreHorizontal, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { ExternalTicket, Sector, User } from "@/lib/types"
import { format, parseISO, isPast, differenceInHours, formatDistanceToNowStrict } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"

const ActionsCell = ({ row, currentUser, hasActiveRoute, onSetEnRoute, onViewDetails }: {
  row: any;
  currentUser: User | null;
  hasActiveRoute: boolean;
  onSetEnRoute: (ticketId: string) => void;
  onViewDetails: (ticketId: string) => void;
}) => {
  const ticket = row.original as ExternalTicket;
  const isCurrentUserAssigned = currentUser?.id === ticket.technicianId;
  const isEnRoute = ticket.enRoute === true;
  const showEnRouteButton = isCurrentUserAssigned && ticket.status === 'em andamento' && !ticket.checkIn && !hasActiveRoute && !isEnRoute;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Abrir menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Ações</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onViewDetails(ticket.id)}>
          Ver Detalhes
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(ticket.id)}>
          Copiar ID
        </DropdownMenuItem>
        {showEnRouteButton && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSetEnRoute(ticket.id)}>
              <Truck className="mr-2 h-4 w-4" />
              A Caminho
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const SlaCell = ({ ticket }: { ticket: ExternalTicket }) => {
  if (!ticket.slaExpiresAt) return <span className="text-xs text-muted-foreground">—</span>;

  const exp = parseISO(ticket.slaExpiresAt);
  const isActive = ticket.status === 'pendente' || ticket.status === 'em andamento';

  if (isActive && isPast(exp)) {
    return <Badge variant="destructive" className="text-xs font-semibold animate-pulse">Vencido</Badge>;
  }

  if (isActive) {
    const hours = differenceInHours(exp, new Date());
    const dist = formatDistanceToNowStrict(exp, { locale: ptBR, addSuffix: true });
    if (hours <= 4) {
      return <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{dist}</span>;
    }
    return <span className="text-xs text-muted-foreground">{dist}</span>;
  }

  return <span className="text-xs text-muted-foreground">{format(exp, 'dd/MM HH:mm')}</span>;
};

const getTypeVariant = (type: ExternalTicket['type']): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
        case 'contrato': return 'secondary';
        case 'urgente':  return 'destructive';
        case 'retorno':  return 'outline';
        case 'agendado': return 'default';
        case 'padrão':
        default:         return 'default';
    }
}

const getRowClasses = (type: ExternalTicket['type']) => {
    const typeClass = {
        'padrão':   'bg-card hover:bg-muted/50 border-l-4 border-l-transparent',
        'contrato': 'bg-brand-navy/5 dark:bg-brand-navy/15 hover:bg-brand-navy/10 dark:hover:bg-brand-navy/25 border-l-4 border-l-brand-navy',
        'urgente':  'bg-red-100/50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border-l-4 border-l-red-500 dark:border-l-red-400',
        'agendado': 'bg-violet-100/50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 border-l-4 border-l-violet-500 dark:border-l-violet-400',
        'retorno':  'bg-brand-orange/5 dark:bg-brand-orange/10 hover:bg-brand-orange/10 dark:hover:bg-brand-orange/20 border-l-4 border-l-brand-orange',
    }[type];
    return cn("cursor-pointer", typeClass);
}

const PRIORITY_ORDER: Record<string, number> = { 'Extrema': 0, 'Alta': 1, 'Normal': 2 };
const STATUS_ORDER: Record<string, number> = { 'pendente': 0, 'em andamento': 1, 'concluído': 2, 'cancelado': 3 };

const getColumns = (
  users: User[],
  sectors: Sector[],
  currentUser: User | null,
  hasActiveRoute: boolean,
  onSetEnRoute: (ticketId: string) => void,
  onViewDetails: (ticketId: string) => void
): ColumnDef<ExternalTicket>[] => [
  {
    accessorKey: "client.name",
    header: "Cliente",
    cell: ({ row }) => <div className="font-medium">{row.original.client.name}</div>,
  },
  {
    accessorKey: "description",
    header: "Descrição",
    cell: ({ row }) => <div className="truncate max-w-xs">{row.original.description}</div>,
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <Button variant="ghost" className="-ml-4" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Status <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    sortingFn: (a, b) => (STATUS_ORDER[a.original.status] ?? 9) - (STATUS_ORDER[b.original.status] ?? 9),
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const variant: "default" | "secondary" | "destructive" | "outline" =
        status === 'concluído' ? 'default' :
        status === 'em andamento' ? 'secondary' :
        status === 'cancelado' ? 'destructive' : 'outline';
      return <Badge variant={variant} className="capitalize">{status}</Badge>;
    },
  },
  {
    accessorKey: "type",
    header: "Tipo",
    cell: ({ row }) => {
      const type = row.original.type;
      return <Badge variant={getTypeVariant(type)} className="capitalize">{type}</Badge>;
    },
  },
  {
    accessorKey: "priority",
    header: ({ column }) => (
      <Button variant="ghost" className="-ml-4" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Prioridade <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    sortingFn: (a, b) => (PRIORITY_ORDER[a.original.priority ?? ''] ?? 9) - (PRIORITY_ORDER[b.original.priority ?? ''] ?? 9),
    cell: ({ row }) => {
      const priority = row.original.priority;
      if (!priority) return <span className="text-xs text-muted-foreground">—</span>;
      const variant = priority === 'Extrema' ? 'destructive' : priority === 'Alta' ? 'default' : 'secondary';
      return <Badge variant={variant}>{priority}</Badge>;
    },
  },
  {
    id: "sla",
    header: ({ column }) => (
      <Button variant="ghost" className="-ml-4" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        SLA <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    accessorFn: (row) => row.slaExpiresAt ?? null,
    sortingFn: (a, b) => {
      const va = a.original.slaExpiresAt;
      const vb = b.original.slaExpiresAt;
      if (!va && !vb) return 0;
      if (!va) return 1;
      if (!vb) return -1;
      return new Date(va).getTime() - new Date(vb).getTime();
    },
    cell: ({ row }) => <SlaCell ticket={row.original} />,
  },
  {
    accessorKey: "technicianId",
    header: "Técnico",
    cell: ({ row }) => {
      const u = users.find(u => u.id === row.getValue("technicianId"));
      return <div>{u?.name || <span className="text-muted-foreground text-xs">Não atribuído</span>}</div>;
    },
  },
  {
    accessorKey: "sectorId",
    header: "Setor",
    cell: ({ row }) => {
      const sector = sectors.find(s => s.id === row.getValue("sectorId"));
      return <div>{sector?.name || <span className="text-muted-foreground text-xs">N/A</span>}</div>;
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button variant="ghost" className="-ml-4" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Criado em <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div>{format(new Date(row.getValue("createdAt")), "dd/MM/yyyy")}</div>,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: (props) => <ActionsCell {...props} currentUser={currentUser} hasActiveRoute={hasActiveRoute} onSetEnRoute={onSetEnRoute} onViewDetails={onViewDetails} />,
  },
]

interface ExternalTicketsTableProps {
    data: ExternalTicket[];
    users: User[];
    sectors: Sector[];
    currentUser: User | null;
    hasActiveRoute: boolean;
    onSetEnRoute: (ticketId: string) => void;
    onViewDetails: (ticketId: string) => void;
}

export function ExternalTicketsTable({ data, users, sectors, currentUser, hasActiveRoute, onSetEnRoute, onViewDetails }: ExternalTicketsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const columns = React.useMemo(
    () => getColumns(users, sectors, currentUser, hasActiveRoute, onSetEnRoute, onViewDetails),
    [users, sectors, currentUser, hasActiveRoute, onSetEnRoute, onViewDetails]
  );

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, columnFilters },
  })

  return (
    <div className="w-full">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                  className={getRowClasses(row.original.type)}
                  onClick={() => onViewDetails(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} onClick={(e) => { if (cell.column.id === 'actions') e.stopPropagation(); }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Nenhum chamado encontrado com os filtros selecionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} chamado(s) encontrado(s).
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Itens por página</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>{pageSize}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
              <span className="sr-only">Primeira página</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <span className="sr-only">Página anterior</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <span className="sr-only">Próxima página</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
              <span className="sr-only">Última página</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
