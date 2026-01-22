

import type { ExternalTicket, User, Technician, Sector, Checklist, ChecklistTaskState } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Calendar, User as UserIcon, Phone, MapPin, AlertCircle, ExternalLink, MessageSquare, Hand, CheckCircle, MapPinned, Undo, History, Camera, Loader2, Edit, Info, Pencil, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { useState, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from '../ui/dialog';
import { SignaturePad } from '../shared/signature-pad';
import { optimizeImage, optimizeSignature } from '@/lib/image-optimizer';
import { useDebounce } from '@/hooks/use-debounce';
import { Checkbox } from '../ui/checkbox';


interface ChecklistItemProps {
    task: ChecklistTaskState;
    taskModel: { id: string; text: string };
    disabled: boolean;
    onUpdate: (taskId: string, updates: Partial<ChecklistTaskState>) => void;
    onUploadPhoto: (file: File, taskId: string) => Promise<boolean>;
}

const ChecklistItem: React.FC<ChecklistItemProps> = ({ task, taskModel, disabled, onUpdate, onUploadPhoto }) => {
    const [observation, setObservation] = useState(task.observation || '');
    const [isUploading, setIsUploading] = useState(false);

    useDebounce(() => {
        if (observation !== task.observation) {
            onUpdate(task.taskId, { observation });
        }
    }, 1000, [observation]);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        await onUploadPhoto(file, task.taskId);
        setIsUploading(false);
    };


    return (
        <div className="space-y-3 p-3 border rounded-md bg-muted/50">
            <div className="flex items-start gap-4">
                <Checkbox
                    id={`task-${task.taskId}`}
                    checked={task.completed}
                    onCheckedChange={(checked) => onUpdate(task.taskId, { completed: !!checked })}
                    disabled={disabled}
                    className="mt-1"
                />
                <Label htmlFor={`task-${task.taskId}`} className={cn("flex-1", task.completed && "line-through text-muted-foreground")}>
                    {taskModel.text}
                </Label>
            </div>
            <div className="pl-8 space-y-2">
                 <Textarea
                    placeholder="Observação (opcional)"
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    disabled={disabled}
                    rows={1}
                    className="text-xs resize-y min-h-0 h-9"
                />
                <div className="flex items-center gap-2">
                    <Input
                        id={`photo-${task.taskId}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                        disabled={disabled || isUploading}
                    />
                     <Label htmlFor={`photo-${task.taskId}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), disabled && "pointer-events-none opacity-50")}>
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Camera className="h-4 w-4 mr-2" />}
                        {task.photo ? "Alterar Foto" : "Anexar Foto"}
                    </Label>

                    {task.photo && (
                         <a href={task.photo} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: 'link', size: 'sm' }))}>
                            Ver Foto
                        </a>
                    )}
                </div>
            </div>
        </div>
    )
}

interface ExternalTicketDetailsProps {
  ticket: ExternalTicket;
  onAddComment: (commentText: string) => void;
  onReopenTicket: (ticketId: string, reason: string) => void;
  onReturnToPending: (ticketId: string, reason: string) => void;
  onAssignToMe: () => void;
  onFinalizeTicket: (ticketId: string, observations: string, photos: File[], signature?: string) => Promise<boolean>;
  onDescriptionChange: (newDescription: string) => void;
  onAssignTechnician: (technicianId: string) => void;
  onCheckIn: () => void;
  onUpdateChecklistTask: (taskId: string, updates: Partial<ChecklistTaskState>) => void;
  onUploadChecklistPhoto: (file: File, taskId: string) => Promise<boolean>;
  currentUser: User | null;
  users: User[];
  allSectors: Sector[];
  allChecklists: Checklist[];
}

export function ExternalTicketDetails({ 
    ticket, 
    onAddComment, 
    onReopenTicket, 
    onReturnToPending, 
    onAssignToMe, 
    onFinalizeTicket, 
    onDescriptionChange,
    onAssignTechnician,
    onCheckIn,
    onUpdateChecklistTask,
    onUploadChecklistPhoto,
    currentUser, 
    users,
    allSectors,
    allChecklists,
}: ExternalTicketDetailsProps) {
  const [newComment, setNewComment] = useState('');
  const [observations, setObservations] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState(ticket.description);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [reason, setReason] = useState('');
  
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);


  const creator = users.find((u) => u.id === ticket.creatorId);
  const assignee = users.find((u) => u.id === ticket.technicianId);
  const finalizer = users.find((u) => u.id === ticket.finalizedBy);
  const isAssigned = !!ticket.technicianId;
  const isConcluded = ticket.status === 'concluído';
  const isPending = ticket.status === 'pendente';
  const isCancelled = ticket.status === 'cancelado';
  const canTakeAction = !isConcluded && !isCancelled;
  const isCurrentUserAssigned = currentUser?.id === ticket.technicianId;
  const hasCheckedIn = !!ticket.checkIn;
  const checklistModel = ticket.checklistId ? allChecklists.find(c => c.id === ticket.checklistId) : null;
  const isChecklistDisabled = !hasCheckedIn || !isCurrentUserAssigned || isConcluded;

  const canUserIntervene = currentUser && (
    isCurrentUserAssigned ||
    currentUser.role === 'admin' ||
    currentUser.role === 'gerente' ||
    (currentUser.role === 'encarregado' && currentUser.sectorIds?.includes(ticket.sectorId))
  );
  
  const canSupervisorManage = currentUser && (currentUser.role === 'admin' || currentUser.role === 'gerente' || currentUser.role === 'encarregado');
  
  const assignableUsers = useMemo(() => {
    return users.filter(u => (u.role === 'tecnico' || u.role === 'encarregado') && u.sectorIds?.includes(ticket.sectorId));
  }, [users, ticket.sectorId]);

  const getCommentAuthor = (authorId: string) => users.find((u) => u.id === authorId);
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotoFiles(Array.from(e.target.files));
    }
  };
  
  const handleDescriptionSave = () => {
    if (descriptionValue.trim() && descriptionValue.trim() !== ticket.description) {
        onDescriptionChange(descriptionValue);
    }
    setIsEditingDescription(false);
  }
  
  const handleAssignClick = () => {
    if (selectedTechnician) {
        onAssignTechnician(selectedTechnician);
    }
  }

  const handleFinalize = async () => {
    if (!observations.trim() || isFinalizing) return;
    
    setIsFinalizing(true);
    try {
        const optimizedPhotos = await Promise.all(
            photoFiles.map(file => optimizeImage(file))
        );

        let optimizedSignature: string | undefined = undefined;
        if (signatureDataUrl) {
            optimizedSignature = await optimizeSignature(signatureDataUrl);
        }

        const success = await onFinalizeTicket(ticket.id, observations.trim(), optimizedPhotos, optimizedSignature);
        if (success) {
            setIsFinalizeDialogOpen(false); // Close dialog on success
        }
    } catch (error) {
        console.error("Error optimizing images or finalizing ticket:", error);
    } finally {
        setIsFinalizing(false);
    }
  }

  const handleSignatureSave = (signature: string) => {
    setSignatureDataUrl(signature);
    setIsSignatureDialogOpen(false);
  };


  const renderAssigneeStatus = () => {
    if (isConcluded) {
        const finalizerName = finalizer?.name || assignee?.name || 'Sistema'; // Fallback logic
        return (
            <div className="flex items-center text-green-600 dark:text-green-400">
                <CheckCircle className="mr-2 h-4 w-4" />
                <span>Finalizado por: {finalizerName} em {format(parseISO(ticket.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
            </div>
        );
    }
    if (assignee) {
      return (
        <div className="flex items-center">
          <UserIcon className="mr-2 h-4 w-4" />
          <span>Atribuído a: {assignee.name}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center text-amber-500">
        <AlertCircle className="mr-2 h-4 w-4" />
        <span>Aguardando atribuição</span>
      </div>
    );
  };

  const getStatusVariant = (status: ExternalTicket['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'concluído':
        return 'default';
      case 'em andamento':
        return 'secondary';
      case 'cancelado':
        return 'destructive';
      case 'pendente':
      default:
        return 'outline';
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* Coluna Principal */}
      <div className="md:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{ticket.client.name}</CardTitle>
            {isEditingDescription ? (
                <div className="space-y-2">
                    <Textarea 
                        value={descriptionValue}
                        onChange={(e) => setDescriptionValue(e.target.value)}
                        className="text-base"
                    />
                    <div className="flex gap-2">
                        <Button size="sm" onClick={handleDescriptionSave}>Salvar</Button>
                        <Button size="sm" variant="ghost" onClick={() => setIsEditingDescription(false)}>Cancelar</Button>
                    </div>
                </div>
            ) : (
                <div className="flex items-start justify-between">
                     <p className="text-muted-foreground pt-1">{ticket.description}</p>
                     {canSupervisorManage && isPending && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setIsEditingDescription(true)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                     )}
                </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center">
              <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Solicitado por: {ticket.requesterName || 'N/A'}</span>
            </div>
            <div className="flex items-center">
              <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
              <a href={`tel:${ticket.client.phone}`} className="hover:underline">{ticket.client.phone}</a>
              {ticket.client.isWhats && (
                <a 
                    href={`https://wa.me/${ticket.client.phone.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 text-green-500 hover:text-green-600"
                >
                    <MessageSquare className="h-4 w-4" />
                </a>
              )}
            </div>
            {ticket.client.address && (
              <div className="flex items-start">
                <MapPin className="mr-2 mt-1 h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                    <p>{ticket.client.address}</p>
                    <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ticket.client.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center"
                    >
                        Abrir no mapa <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                </div>
              </div>
            )}
             <Separator />
            <div className="flex items-center">
              <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Criado por: {creator?.name || 'Desconhecido'}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Aberto em: {format(new Date(ticket.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
            </div>
            <div className="flex items-center">
                <Badge variant={getStatusVariant(ticket.status)} className="capitalize text-sm">{ticket.status}</Badge>
                 {ticket.type === 'retorno' && <Badge variant="outline" className="capitalize text-sm ml-2 border-orange-500 text-orange-500">Retorno</Badge>}
            </div>
            <div className={cn("flex items-center", !assignee && "text-muted-foreground")}>
              {renderAssigneeStatus()}
            </div>
            {ticket.scheduledTo && (
                <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Agendado para: {format(parseISO(ticket.scheduledTo), 'dd/MM/yyyy HH:mm', {locale: ptBR})}</span>
                </div>
            )}
          </CardContent>
        </Card>
        
        {checklistModel && ticket.checklist && (
             <Card>
                <CardHeader>
                    <CardTitle className='flex items-center'><ListChecks className='mr-2 h-5 w-5'/> Checklist: {checklistModel.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {isChecklistDisabled && !isConcluded && (
                        <Alert variant="destructive">
                            <Info className="h-4 w-4" />
                            <AlertTitle>Check-in Necessário</AlertTitle>
                            <AlertDescription>
                                Você precisa fazer o check-in no cliente para poder preencher o checklist.
                            </AlertDescription>
                        </Alert>
                    )}
                    {checklistModel.tasks.map(taskModel => {
                        const taskState = ticket.checklist!.find(t => t.taskId === taskModel.id);
                        if (!taskState) return null;
                        return (
                            <ChecklistItem
                                key={taskModel.id}
                                task={taskState}
                                taskModel={taskModel}
                                disabled={isChecklistDisabled}
                                onUpdate={onUpdateChecklistTask}
                                onUploadPhoto={onUploadChecklistPhoto}
                            />
                        )
                    })}
                </CardContent>
            </Card>
        )}

        {isConcluded && ticket.technicalReport && (
          <Card>
            <CardHeader>
              <CardTitle>Relatório Técnico Final</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="font-semibold">Observações</Label>
                <p className="text-sm text-muted-foreground">{ticket.technicalReport.observations}</p>
              </div>

              {ticket.technicalReport.photos && ticket.technicalReport.photos.length > 0 && (
                <div>
                  <Label className="flex items-center font-semibold mb-2">
                    <Camera className="mr-2 h-4 w-4" /> Fotos
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {ticket.technicalReport.photos.map((photo, index) => (
                      <a href={photo} key={index} target="_blank" rel="noopener noreferrer">
                        <img src={photo} alt={`Foto ${index + 1}`} className="rounded-md object-cover aspect-square hover:opacity-80 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
               {ticket.technicalReport.signature && (
                <div>
                  <Label className="flex items-center font-semibold mb-2">
                    <Pencil className="mr-2 h-4 w-4" /> Assinatura do Cliente
                  </Label>
                  <div className="rounded-md border p-2 bg-white w-fit">
                    <img src={ticket.technicalReport.signature} alt="Assinatura" className="h-24" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
            <CardHeader>
                <CardTitle>Histórico e Comentários</CardTitle>
            </CardHeader>
            <CardContent className='flex flex-col gap-4'>
                <ScrollArea className="h-64 pr-4">
                    <div className="space-y-4">
                        {ticket.comments && ticket.comments.length > 0 ? (
                        ticket.comments.map((comment) => {
                            const author = getCommentAuthor(comment.authorId);
                            return (
                            <div key={comment.id} className="flex items-start space-x-3">
                                <Avatar className="h-8 w-8">
                                <AvatarImage src={author?.avatarUrl} />
                                <AvatarFallback>{author ? getInitials(author.name) : '?'}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">{author?.name || 'Desconhecido'}</p>
                                    <p className="text-xs text-muted-foreground">
                                    {format(new Date(comment.createdAt), 'dd/MM/yy HH:mm', { locale: ptBR })}
                                    </p>
                                </div>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{comment.content}</p>
                                </div>
                            </div>
                            );
                        })
                        ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhum comentário ainda.</p>
                        )}
                    </div>
                </ScrollArea>
                {currentUser && canTakeAction && (
                <form onSubmit={handleCommentSubmit} className="flex items-start space-x-3 pt-4 border-t">
                    <Avatar className="h-8 w-8">
                    <AvatarImage src={currentUser.avatarUrl} />
                        <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
                    </Avatar>
                    <Textarea
                    placeholder="Adicionar um comentário..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={2}
                    className="flex-1"
                    />
                    <Button type="submit" size="sm" disabled={!newComment.trim()}>Enviar</Button>
                </form>
                )}
            </CardContent>
        </Card>
      </div>

      {/* Coluna de Ações */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Ações</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {isConcluded ? (
                canUserIntervene && (
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button className="w-full" variant="secondary">
                               <History className="mr-2 h-4 w-4" /> Abrir Revisão
                           </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Reabrir Chamado como Revisão</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Por favor, informe o motivo para reabrir este chamado. A justificativa será adicionada aos comentários.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="py-4">
                                <Label htmlFor="reopen-reason">Justificativa</Label>
                                <Textarea 
                                    id="reopen-reason"
                                    placeholder="Ex: O problema persistiu..."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                />
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onReopenTicket(ticket.id, reason)} disabled={!reason.trim()}>
                                    Confirmar e Reabrir
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )
            ) : canTakeAction ? (
              <>
                {isPending && !isAssigned && (currentUser?.role === 'tecnico' || currentUser?.role === 'encarregado') && (
                  <Button className="w-full" onClick={onAssignToMe}>
                      <Hand className="mr-2 h-4 w-4" /> Pegar Chamado
                  </Button>
                )}
                
                {canUserIntervene && ticket.status === 'em andamento' && (
                  <>
                    <Button variant="outline" className="w-full" onClick={onCheckIn} disabled={hasCheckedIn}>
                        {hasCheckedIn ? (
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        ) : (
                            <MapPinned className="mr-2 h-4 w-4" />
                        )}
                        {hasCheckedIn ? 'Check-in Realizado' : 'Check-in no Local'}
                    </Button>
                    
                    <Dialog open={isFinalizeDialogOpen} onOpenChange={setIsFinalizeDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full" disabled={!hasCheckedIn}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Finalizar Atendimento
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-xl">
                        <DialogHeader>
                          <DialogTitle>Finalizar Atendimento</DialogTitle>
                          <DialogDescription>
                            Preencha o relatório técnico para concluir o chamado.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                           <div className="space-y-2">
                              <Label htmlFor="observations">Observações (Obrigatório)</Label>
                              <Textarea 
                                  id="observations" 
                                  placeholder="Descreva o que foi feito..." 
                                  value={observations}
                                  onChange={(e) => setObservations(e.target.value)}
                                  disabled={isFinalizing}
                              />
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="photos">Fotos (Opcional)</Label>
                              <Input id="photos" type="file" multiple accept="image/*" onChange={handlePhotoChange} disabled={isFinalizing}/>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="signature">Assinatura do Cliente</Label>
                            <Button
                              id="signature"
                              variant="outline"
                              className="w-full"
                              onClick={() => setIsSignatureDialogOpen(true)}
                              disabled={isFinalizing || !!signatureDataUrl}
                            >
                              {signatureDataUrl ? <><CheckCircle className="mr-2 h-4 w-4 text-green-500" />Assinatura Coletada</> : <><Pencil className="mr-2 h-4 w-4" />Coletar Assinatura</>}
                            </Button>
                            {signatureDataUrl && (
                                <div className="p-2 border rounded-md bg-muted flex justify-center">
                                  <img src={signatureDataUrl} alt="Assinatura do cliente" className="h-20" />
                                </div>
                            )}
                          </div>
                        </div>
                        <DialogFooter>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button 
                                        className="w-full" 
                                        disabled={!observations.trim() || isFinalizing}
                                    >
                                        {isFinalizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                        {isFinalizing ? 'Salvando...' : 'Confirmar e Finalizar'}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Finalização</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {ticket.checklistId ? 
                                            "Este chamado possui um checklist. Caso queira revisar, clique em Voltar. Se está pronto para concluir, clique em Confirmar." :
                                            "Você tem certeza que deseja finalizar este atendimento? Esta ação não pode ser desfeita (apenas reaberta como revisão)."
                                        }
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleFinalize}>Confirmar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {!hasCheckedIn && (
                        <Alert variant="destructive">
                            <Info className="h-4 w-4" />
                            <AlertTitle>Check-in Necessário</AlertTitle>
                            <AlertDescription>
                                Realize o check-in no local para habilitar a finalização.
                            </AlertDescription>
                        </Alert>
                    )}
                    
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button className="w-full" variant="destructive" onClick={() => onReturnToPending(ticket.id, reason)} disabled={!canUserIntervene}>
                               <Undo className="mr-2 h-4 w-4" /> Devolver para Pendente
                           </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Devolver Chamado para Pendente</AlertDialogTitle>
                                <AlertDialogDescription>
                                   Informe o motivo para devolver este chamado. A justificativa será adicionada como um comentário.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="py-4">
                                <Label htmlFor="return-reason">Justificativa</Label>
                                <Textarea 
                                    id="return-reason"
                                    placeholder="Ex: Não consegui contato com o cliente."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                />
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onReturnToPending(ticket.id, reason)} disabled={!reason.trim()}>
                                    Confirmar e Devolver
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </>
            ) : null}
            {isCancelled && <p className='text-sm text-muted-foreground text-center'>Chamado cancelado. Nenhuma ação disponível.</p>}
          </CardContent>
        </Card>

        {canSupervisorManage && isPending && (
             <Card>
                <CardHeader>
                    <CardTitle>Ações do Encarregado</CardTitle>
                    <CardDescription>Atribua este chamado a um técnico do setor.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div>
                        <Label htmlFor="assign-tech">Técnico</Label>
                        <Select onValueChange={setSelectedTechnician} value={selectedTechnician}>
                            <SelectTrigger id="assign-tech">
                                <SelectValue placeholder="Selecione um técnico..." />
                            </SelectTrigger>
                            <SelectContent>
                                {assignableUsers.map(user => (
                                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                     </div>
                    <Button className="w-full" disabled={!selectedTechnician} onClick={handleAssignClick}>
                        Atribuir Chamado
                    </Button>
                </CardContent>
            </Card>
        )}
      </div>
      
      <Dialog open={isSignatureDialogOpen} onOpenChange={setIsSignatureDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assinatura do Cliente</DialogTitle>
            <DialogDescription>Peça para o cliente assinar no campo abaixo.</DialogDescription>
          </DialogHeader>
          <SignaturePad onSave={handleSignatureSave} onClear={() => setSignatureDataUrl(null)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

    
