
// Este arquivo contém a lógica que será usada em uma Cloud Function para
// automatizar a criação de chamados de manutenção preventiva.

import { collection, getDocs, addDoc, query, where, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Client, ExternalTicket, ServiceContract } from '@/lib/types';
import { differenceInDays, parseISO } from 'date-fns';

/**
 * Busca o último chamado preventivo para um cliente específico e um setor específico.
 * @param clientId - ID do cliente.
 * @param sectorId - ID do setor.
 * @returns O último chamado preventivo ou null se não houver.
 */
async function findLastPreventiveTicket(clientId: string, sectorId: string): Promise<ExternalTicket | null> {
  const ticketsRef = collection(db, 'external-tickets');
  const q = query(
    ticketsRef,
    where('client.id', '==', clientId),
    where('sectorId', '==', sectorId),
    where('type', '==', 'contrato'),
    orderBy('createdAt', 'desc'),
    limit(1)
  );

  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const lastTicketDoc = querySnapshot.docs[0];
    return { id: lastTicketDoc.id, ...lastTicketDoc.data() } as ExternalTicket;
  }
  return null;
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
      
      // Se não houver nenhum chamado anterior (primeira preventiva após o inicial),
      // use a data de criação do contrato como base.
      const lastEventDate = lastTicket?.updatedAt ? new Date(lastTicket.updatedAt) : new Date(contract.createdAt);
      const daysSinceLastEvent = differenceInDays(today, lastEventDate);

      if (daysSinceLastEvent >= contract.frequencyDays) {
        console.log(`Gerando chamado preventivo para ${clientData.name} no setor ${sectorId}.`);

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
          description: "visita de manutenção preventiva de contrato de serviço",
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
