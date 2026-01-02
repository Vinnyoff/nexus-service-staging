
'use server';

import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/firebase/config';

const instanceId = process.env.ZAPI_INSTANCE_ID;
const instanceToken = process.env.ZAPI_INSTANCE_TOKEN;
const clientToken = process.env.ZAPI_CLIENT_TOKEN;

if (!instanceId || !instanceToken || !clientToken) {
  console.warn('Z-API credentials (Instance ID, Instance Token, or Client Token) are not fully set in .env file. WhatsApp sending will be disabled.');
}

const logEvent = async (status: 'success' | 'failure', details: Record<string, any>) => {
  try {
    await addDoc(collection(db, "system-logs"), {
      event: 'WHATSAPP_SENT',
      timestamp: new Date().toISOString(),
      details: {
        status,
        ...details,
      }
    });
  } catch (error) {
    console.warn("Could not log WhatsApp event to Firestore:", error);
  }
};

/**
 * Sends a WhatsApp message using the Z-API.
 * @param to - The recipient's phone number or group ID.
 * @param body - The text content of the message.
 */
export async function sendWhatsappMessage(to: string, body: string): Promise<void> {
  if (!instanceId || !instanceToken || !clientToken) {
    const message = `Z-API Service disabled. Would have sent to ${to}: "${body}"`;
    console.log(message);
    await logEvent('failure', { to, body, error: 'Z-API client not configured.' });
    return;
  }
  
  // Se 'to' contém '-', é um ID de grupo e não deve ser formatado.
  // Caso contrário, é um número de telefone e removemos os caracteres não numéricos.
  const destination = to.includes('-') ? to : to.replace(/\D/g, '');

  const apiUrl = `https://api.z-api.io/instances/${instanceId}/token/${instanceToken}/send-text`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': clientToken,
      },
      body: JSON.stringify({
        phone: destination,
        message: body,
      }),
    });

    const responseData = await response.json();

    if (response.ok && (responseData.zaapId || responseData.id)) {
        const zapiId = responseData.zaapId || responseData.id;
        console.log(`WhatsApp message sent successfully to ${destination} with Z-API ID: ${zapiId}`);
        await logEvent('success', { to: destination, body, zapiId });
    } else {
        throw new Error(responseData.error || responseData.value?.message || responseData.message || 'Unknown error from Z-API');
    }

  } catch (error: any) {
    console.error('Failed to send WhatsApp message via Z-API:', error);
    await logEvent('failure', { to: destination, body, error: error.message });
  }
}
