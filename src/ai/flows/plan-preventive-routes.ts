
'use server';

/**
 * @fileOverview Um fluxo de IA para planejar rotas de manutenção preventiva.
 *
 * - planPreventiveRoutes - Agrupa clientes em rotas diárias otimizadas.
 * - PlanPreventiveRoutesInput - O tipo de entrada para a função.
 * - PreventiveRoutePlan - O tipo de retorno (plano de rotas).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/firebase/config';

// Define o esquema para a entrada do fluxo.
const PlanPreventiveRoutesInputSchema = z.object({
  clients: z.array(z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
  })).describe('Lista de clientes que precisam de visita preventiva.'),
  startAddress: z.string().describe('O endereço de partida para o início da rota.'),
  period: z.object({
    start: z.string().describe('Data de início do período de planejamento.'),
    end: z.string().describe('Data de fim do período de planejamento.'),
  }).describe('O período para o qual o planejamento deve ser feito.'),
  sectorName: z.string().describe('Nome do setor para o qual o planejamento está sendo feito.'),
  userId: z.string().describe('ID do usuário que está solicitando o planejamento.'),
});
export type PlanPreventiveRoutesInput = z.infer<typeof PlanPreventiveRoutesInputSchema>;

// Define o esquema para a saída do fluxo.
const PreventiveRoutePlanSchema = z.object({
  suggestedRoutes: z.array(z.object({
    day: z.number().describe('O número do dia no plano (Dia 1, Dia 2, etc.).'),
    clients: z.array(z.object({
      id: z.string(),
      name: z.string(),
      address: z.string(),
    })).describe('Lista de clientes para visitar neste dia, em ordem otimizada.'),
  })).describe('Uma lista de rotas diárias sugeridas.'),
  summary: z.string().describe('Um breve resumo em markdown explicando a lógica do agrupamento e quantos dias serão necessários.'),
});
export type PreventiveRoutePlan = z.infer<typeof PreventiveRoutePlanSchema>;

// Função exportada que a UI chamará.
export async function planPreventiveRoutes(input: PlanPreventiveRoutesInput): Promise<PreventiveRoutePlan> {
  return planPreventiveRoutesFlow(input);
}

// Define o prompt da IA.
const prompt = ai.definePrompt({
  name: 'planPreventiveRoutesPrompt',
  input: { schema: PlanPreventiveRoutesInputSchema },
  output: { schema: PreventiveRoutePlanSchema },
  prompt: `
    Você é um planejador de logística mestre para uma empresa de serviços técnicos. Sua tarefa é criar um plano de rotas de manutenção preventiva.

    INFORMAÇÕES GERAIS:
    - Setor de Análise: {{sectorName}}
    - Período de Planejamento: de {{period.start}} a {{period.end}}
    - Ponto de Partida: {{startAddress}}

    O objetivo principal é agrupar os clientes em rotas diárias que sejam geograficamente eficientes, minimizando o deslocamento total. Cada item em 'suggestedRoutes' deve representar um dia de trabalho. A rota do Dia 1 deve começar a partir do endereço de partida fornecido.

    Considere uma capacidade média de 4 a 6 visitas por dia por equipe, dependendo da proximidade dos clientes. Agrupe clientes que estão na mesma região ou na mesma direção para o mesmo dia.

    Liste os clientes para cada dia na ordem de visita otimizada, iniciando a primeira visita do Dia 1 o mais próximo possível do ponto de partida.

    No campo 'summary', forneça uma breve explicação em markdown sobre sua estratégia de agrupamento. Por exemplo: "O plano foi criado para {{suggestedRoutes.length}} dias, partindo de {{startAddress}}. O Dia 1 foca na Zona Leste, enquanto o Dia 2 cobre a Zona Sul."

    Clientes a serem visitados:
    {{#each clients}}
    - ID: {{id}}, Nome: {{name}}, Endereço: {{address}}
    {{/each}}
  `,
});

// Define o fluxo Genkit.
const planPreventiveRoutesFlow = ai.defineFlow(
  {
    name: 'planPreventiveRoutesFlow',
    inputSchema: PlanPreventiveRoutesInputSchema,
    outputSchema: PreventiveRoutePlanSchema,
  },
  async (input) => {
    try {
        await addDoc(collection(db, "system-logs"), {
            userId: input.userId,
            event: 'AI_CALL',
            flowName: 'planPreventiveRoutesFlow',
            timestamp: new Date().toISOString(),
            details: {
                clientCount: input.clients.length,
                period: input.period,
            }
        });
    } catch (error) {
        console.warn("Could not log AI call to Firestore:", error);
    }
    
    const { output } = await prompt(input);
    return output!;
  }
);
