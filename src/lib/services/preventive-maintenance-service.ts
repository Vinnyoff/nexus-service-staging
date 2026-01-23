
// Este arquivo contém a lógica que será usada em uma Cloud Function para
// automatizar a criação de chamados de manutenção preventiva.

import { collection, getDocs, addDoc, query, where, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Client, ExternalTicket, ServiceContract, Checklist, ChecklistTaskState } from '@/lib/types';
import { differenceInDays, parseISO } from 'date-fns';

/**
 * Busca o último chamado preventivo CONCLUÍDO para um cliente específico e um setor específico.
 * @param clientId - ID do cliente.
 * @param sectorId - ID do setor.
 * @returns O último chamado preventivo concluído ou null se não houver.
 */
async function findLastPreventiveTicket(clientId: string, sectorId: string): Promise<ExternalTicket | null> {
  const ticketsRef = collection(db, 'external-tickets');
  // Filtra por chamados concluídos para garantir que a contagem comece da finalização.
  const q = query(
    ticketsRef,
    where('client.id', '==', clientId),
    where('sectorId', '==', sectorId),
    where('type', '==', 'contrato'),
    where('status', '==', 'concluído')
  );

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  // Ordena os tickets pela data de atualização (conclusão) para encontrar o mais recente.
  const tickets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExternalTicket));
  tickets.sort((a, b) => parseISO(b.updatedAt).getTime() - parseISO(a.updatedAt).getTime());
  
  return tickets[0];
}

/**
 * Função principal que verifica os clientes e gera os chamados preventivos necessários.
 * Esta função deve ser chamada por um agendador (cron job) no backend (ex: Firebase Scheduled Function).
 */
export async function generatePreventiveTickets() {
  console.log('Iniciando verificação de manutenções preventivas...');
  const contractsRef = collection(db, 'serviceContracts');
  const q = query(contractsRef, where('status', '==', 'active'));

  const contractsSnapshot = await getDocs(q);
  if (contractsSnapshot.empty) {
    console.log('Nenhum contrato de serviço ativo encontrado.');
    return {
        message: 'Nenhum contrato de serviço ativo encontrado.',
        createdTicketsCount: 0,
        checkedContractsCount: 0,
    };
  }

  const today = new Date();
  const createdTickets: string[] = [];

  for (const contractDoc of contractsSnapshot.docs) {
    const contract = { id: contractDoc.id, ...contractDoc.data() } as ServiceContract;
    
    const clientDoc = await getDoc(doc(db, "clients", contract.clientId));
    if (!clientDoc.exists()) continue;
    const clientData = { id: clientDoc.id, ...clientDoc.data()} as Client;
    

    for (const sectorId of contract.sectorIds) {
      const lastTicket = await findLastPreventiveTicket(clientData.id, sectorId);
      
      // A base para a contagem de dias é a data de finalização (updatedAt) do último chamado preventivo.
      // Se não houver nenhum, a base é a data de criação do contrato.
      const lastEventDate = lastTicket?.updatedAt ? new Date(lastTicket.updatedAt) : new Date(contract.createdAt);
      const daysSinceLastEvent = differenceInDays(today, lastEventDate);

      if (daysSinceLastEvent >= contract.frequencyDays) {
        console.log(`Gerando chamado preventivo para ${clientData.name} no setor ${sectorId}.`);
        
        let checklistState: ChecklistTaskState[] | undefined = undefined;
        let checklistId: string | undefined = undefined;

        const defaultChecklistId = contract.defaultChecklists?.[sectorId];
        if(defaultChecklistId) {
            const checklistDoc = await getDoc(doc(db, "checklists", defaultChecklistId));
             if (checklistDoc.exists()) {
                const checklist = { id: checklistDoc.id, ...checklistDoc.data() } as Checklist;
                checklistId = checklist.id;
                checklistState = checklist.tasks.map(task => ({
                  taskId: task.id,
                  completed: false,
                  observation: '',
                  photo: ''
                }));
            }
        }


        const newTicketData: Omit<ExternalTicket, 'id'> = {
          client: {
            id: clientData.id,
            name: clientData.name,
            phone: clientData.phone,
            isWhats: false, // Pode ser ajustado conforme necessário
            address: (clientData.address && clientData.address.street) 
                ? `${clientData.address.street}, ${clientData.address.number || 'S/N'}` 
                : undefined,
          },
          requesterName: 'Sistema (Preventiva Automática)',
          sectorId: sectorId,
          creatorId: 'system',
          description: "Manutenção preventiva de contrato.",
          type: 'contrato',
          status: 'pendente',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          technicianId: null,
          comments: [],
          technicalReport: null,
          checkIn: null,
          checkOut: null,
          enRoute: null,
          enRouteAt: null,
          slaExpiresAt: null,
          ...(checklistId && { checklistId: checklistId, checklist: checklistState })
        };

        try {
          const docRef = await addDoc(collection(db, 'external-tickets'), newTicketData);
          createdTickets.push(docRef.id);
          console.log(`Chamado ${docRef.id} criado com sucesso.`);
        } catch (error) {
          console.error(`Falha ao criar chamado para o cliente ${clientData.id} e setor ${sectorId}:`, error);
        }
      }
    }
  }

  if (createdTickets.length > 0) {
    console.log(`${createdTickets.length} chamados preventivos foram criados.`);
  } else {
    console.log('Nenhum chamado preventivo precisou ser criado hoje.');
  }

  return {
    message: 'Verificação de manutenção preventiva concluída.',
    createdTicketsCount: createdTickets.length,
    checkedContractsCount: contractsSnapshot.size,
  };
}
