

// Este arquivo contém a lógica que será usada em uma Cloud Function para
// automatizar a criação de chamados de manutenção preventiva.

import { collection, getDocs, addDoc, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Client, ExternalTicket, ServiceContract, Sector } from '@/lib/types';
import { addDays } from 'date-fns';
import { sendWhatsappMessage } from './notification-service';

/**
 * Busca o último chamado preventivo CONCLUÍDO para um contrato específico.
 * Usa contractId como chave de rastreamento (1 ticket por contrato).
 */
async function findLastPreventiveTicket(clientId: string, contractId: string): Promise<ExternalTicket | null> {
  const ticketsRef = collection(db, 'external-tickets');
  const q = query(
    ticketsRef,
    where('client.id', '==', clientId),
    where('status', '==', 'concluído'),
    where('type', '==', 'contrato')
  );

  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;

  const tickets = querySnapshot.docs
    .map(d => ({ id: d.id, ...d.data() } as ExternalTicket))
    .filter(ticket => ticket.contractId === contractId);

  if (tickets.length === 0) return null;

  tickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return tickets[0];
}

/**
 * Verifica se já existe um chamado preventivo aberto (pendente ou em andamento) para este contrato.
 */
async function hasOpenPreventiveTicket(clientId: string, contractId: string): Promise<boolean> {
  const ticketsRef = collection(db, 'external-tickets');
  const q = query(
    ticketsRef,
    where('client.id', '==', clientId),
    where('status', 'in', ['pendente', 'em andamento'])
  );

  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return false;

  return querySnapshot.docs
    .map(d => d.data() as ExternalTicket)
    .some(ticket => ticket.contractId === contractId && ticket.type === 'contrato');
}


/**
 * Função principal que verifica os contratos e gera 1 chamado preventivo por contrato quando necessário.
 * Chamados gerados não têm setor definido — qualquer setor disponível pode assumir.
 */
export async function generatePreventiveTickets() {
  console.log('Iniciando verificação de manutenções preventivas...');
  const contractsRef = collection(db, 'serviceContracts');
  const sectorsRef = collection(db, 'sectors');
  const q = query(contractsRef, where('status', '==', 'active'));

  const [contractsSnapshot, sectorsSnapshot] = await Promise.all([
    getDocs(q),
    getDocs(sectorsRef)
  ]);

  const allSectors = sectorsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Sector));

  if (contractsSnapshot.empty) {
    console.log('Nenhum contrato de serviço ativo encontrado.');
    return {
      message: 'Nenhum contrato de serviço ativo encontrado.',
      createdTicketsCount: 0,
      checkedContractsCount: 0,
    };
  }

  const createdTickets: string[] = [];

  for (const contractDoc of contractsSnapshot.docs) {
    const contract = { id: contractDoc.id, ...contractDoc.data() } as ServiceContract;

    const clientDoc = await getDoc(doc(db, 'clients', contract.clientId));
    if (!clientDoc.exists()) continue;
    const clientData = { id: clientDoc.id, ...clientDoc.data() } as Client;

    // 1 ticket por contrato — verificar se já há um aberto para este contrato
    const isOpen = await hasOpenPreventiveTicket(clientData.id, contract.id);
    if (isOpen) {
      console.log(`Skipping: Chamado preventivo já aberto para contrato ${contract.id} (${clientData.name}).`);
      continue;
    }

    const lastTicket = await findLastPreventiveTicket(clientData.id, contract.id);
    const lastEventDate = lastTicket?.updatedAt
      ? new Date(lastTicket.updatedAt)
      : new Date(contract.createdAt);

    const nextDueDate = addDays(lastEventDate, contract.frequencyDays);
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    if (nextDueDate <= twentyFourHoursFromNow) {
      console.log(`Gerando chamado preventivo para contrato ${contract.id} (${clientData.name}).`);

      const newTicketData: Omit<ExternalTicket, 'id'> = {
        client: {
          id: clientData.id,
          name: clientData.name,
          phone: clientData.phone,
          isWhats: false,
          address: clientData.address?.street
            ? `${clientData.address.street}, ${clientData.address.number || 'S/N'}`
            : undefined,
        },
        requesterName: 'Sistema (Preventiva Automática)',
        contractId: contract.id,
        // sectorId não definido — visível para todos os setores
        creatorId: 'system',
        description: 'Manutenção preventiva de contrato.',
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

        // Notificar TODOS os grupos WhatsApp dos setores do contrato
        const message =
          `⚙️ Nova Preventiva Gerada Automaticamente ⚙️\n\n` +
          `*Cliente:* ${clientData.name}\n` +
          `*Descrição:* Manutenção preventiva de contrato.\n\n` +
          `Este chamado está pendente e disponível para qualquer setor assumir.`;

        for (const sectorId of contract.sectorIds) {
          const sector = allSectors.find(s => s.id === sectorId);
          if (sector?.whatsappGroupId) {
            await sendWhatsappMessage(sector.whatsappGroupId, message);
          }
        }
      } catch (error) {
        console.error(`Falha ao criar chamado para contrato ${contract.id}:`, error);
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
