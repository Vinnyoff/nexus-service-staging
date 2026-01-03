
'use server';

import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { User } from '@/lib/types';
import webpush from 'web-push';

const instanceId = process.env.ZAPI_INSTANCE_ID;
const instanceToken = process.env.ZAPI_INSTANCE_TOKEN;
const clientToken = process.env.ZAPI_CLIENT_TOKEN;
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!instanceId || !instanceToken || !clientToken) {
  console.warn('Z-API credentials (Instance ID, Instance Token, or Client Token) are not fully set in .env file. WhatsApp sending will be disabled.');
}

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(
        'mailto:dev@nexus.com',
        vapidPublicKey,
        vapidPrivateKey
    );
} else {
    console.warn('VAPID keys are not set in .env file. Web push notifications will be disabled.');
}


const logEvent = async (service: 'WHATSAPP' | 'WEBPUSH', status: 'success' | 'failure', details: Record<string, any>) => {
  try {
    await addDoc(collection(db, "system-logs"), {
      event: 'NOTIFICATION_SENT',
      timestamp: new Date().toISOString(),
      details: {
        service,
        status,
        ...details,
      }
    });
  } catch (error) {
    console.warn(`Could not log ${service} event to Firestore:`, error);
  }
};

const sendWebPushNotification = async (userId: string, title: string, body: string, href: string) => {
    if (!vapidPublicKey || !vapidPrivateKey) {
        await logEvent('WEBPUSH', 'failure', { userId, title, body, error: 'VAPID keys not configured.' });
        return;
    }

    try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists() || !userDoc.data().pushSubscriptions) {
            await logEvent('WEBPUSH', 'failure', { userId, title, body, error: 'User not found or has no push subscriptions.' });
            return;
        }

        const userData = userDoc.data() as User;
        const subscriptions = userData.pushSubscriptions!;

        const notificationPayload = JSON.stringify({
            title,
            body,
            icon: '/icon-192x192.png',
            data: { href },
        });

        const sendPromises = subscriptions.map(subscription =>
            webpush.sendNotification(subscription, notificationPayload)
        );

        await Promise.all(sendPromises);
        await logEvent('WEBPUSH', 'success', { userId, title, body, subscriptionsCount: subscriptions.length });

    } catch (error: any) {
        console.error('Failed to send web push notification:', error);
        await logEvent('WEBPUSH', 'failure', { userId, title, body, error: error.message });
    }
};


/**
 * Sends a WhatsApp message using the Z-API and optionally a web push notification.
 * @param to - The recipient's phone number or group ID.
 * @param body - The text content of the message.
 * @param userId - Optional. The ID of the user to send a web push notification to.
 * @param href - Optional. The URL to open when the push notification is clicked.
 */
export async function sendWhatsappMessage(to: string, body: string, userId?: string, href?: string): Promise<void> {
  // Send Web Push Notification if userId is provided
  if (userId && href) {
      const title = body.split('\n\n')[0]; // Use the first line as title
      await sendWebPushNotification(userId, title, body, href);
  }

  // Send WhatsApp Message
  if (!instanceId || !instanceToken || !clientToken) {
    const message = `Z-API Service disabled. Would have sent to ${to}: "${body}"`;
    console.log(message);
    await logEvent('WHATSAPP', 'failure', { to, body, error: 'Z-API client not configured.' });
    return;
  }
  
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
        await logEvent('WHATSAPP', 'success', { to: destination, body, zapiId });
    } else {
        throw new Error(responseData.error || responseData.value?.message || responseData.message || 'Unknown error from Z-API');
    }

  } catch (error: any) {
    console.error('Failed to send WhatsApp message via Z-API:', error);
    await logEvent('WHATSAPP', 'failure', { to: destination, body, error: error.message });
  }
}
