
'use server';

/**
 * @fileOverview A flow to fetch WhatsApp groups from the Z-API.
 *
 * - fetchWhatsappGroups - A function that calls the Z-API and returns a list of groups.
 * - WhatsappGroup - The type for a single group object.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const instanceId = process.env.ZAPI_INSTANCE_ID;
const instanceToken = process.env.ZAPI_INSTANCE_TOKEN;
const clientToken = process.env.ZAPI_CLIENT_TOKEN;

const WhatsappGroupSchema = z.object({
  id: z.string().describe("The unique ID of the WhatsApp group."),
  name: z.string().describe("The name of the WhatsApp group."),
});
export type WhatsappGroup = z.infer<typeof WhatsappGroupSchema>;

const FetchGroupsOutputSchema = z.array(WhatsappGroupSchema);

export async function fetchWhatsappGroups(): Promise<WhatsappGroup[]> {
  return fetchWhatsappGroupsFlow();
}

const fetchWhatsappGroupsFlow = ai.defineFlow(
  {
    name: 'fetchWhatsappGroupsFlow',
    inputSchema: z.void(),
    outputSchema: FetchGroupsOutputSchema,
  },
  async () => {
    if (!instanceId || !instanceToken || !clientToken) {
      throw new Error('Z-API credentials are not configured in the environment.');
    }

    const apiUrl = `https://api.z-api.io/instances/${instanceId}/token/${instanceToken}/groups`;

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': clientToken,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Z-API error: ${errorData.error || response.statusText}`);
      }
      
      const responseData = await response.json();
      
      // A Z-API pode retornar um objeto com uma propriedade 'groups' ou um array diretamente
      const groups = responseData.groups || responseData;

      if (!Array.isArray(groups)) {
          throw new Error('Invalid response format from Z-API. Expected an array of groups.');
      }
      
      // Mapeia para o schema esperado, garantindo que apenas os campos necessários sejam retornados.
      const parsedGroups = groups.map((group: any) => ({
          id: group.id,
          name: group.subject, // O nome do grupo vem no campo 'subject'
      }));

      return FetchGroupsOutputSchema.parse(parsedGroups);

    } catch (error: any) {
      console.error('Failed to fetch WhatsApp groups from Z-API:', error);
      throw new Error(`Failed to fetch WhatsApp groups: ${error.message}`);
    }
  }
);
