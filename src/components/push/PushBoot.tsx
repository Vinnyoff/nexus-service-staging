'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { saveDeviceToken } from '@/lib/services/push-notification-service';
import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = 'push_device_id';

export function PushBoot() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) {
      return;
    }

    const initPush = async () => {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('User denied push notification permissions.');
        return;
      }

      // Now register for push
      await PushNotifications.register();
    };

    const addListeners = () => {
      PushNotifications.addListener('registration', (token: Token) => {
        console.log('Push registration success, token:', token.value);
        
        let deviceId = localStorage.getItem(DEVICE_ID_KEY);
        if (!deviceId) {
            deviceId = uuidv4();
            localStorage.setItem(DEVICE_ID_KEY, deviceId);
        }

        const platform = Capacitor.getPlatform() as 'android' | 'ios' | 'web';
        saveDeviceToken(user.id, deviceId, token.value, platform).catch(err => {
            console.error("Failed to save device token to Firestore", err);
        });
      });

      PushNotifications.addListener('registrationError', (err: any) => {
        console.error('Push registration error:', err);
      });

      PushNotifications.addListener(
        'pushNotificationReceived',
        (notification: PushNotificationSchema) => {
          console.log('Push received in foreground:', notification);
          toast({
            title: notification.title,
            description: notification.body,
          });
        }
      );

      PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (notification: ActionPerformed) => {
          console.log('Push action performed:', notification);
          const link = notification.notification.data?.link;
          if (link) {
            router.push(link);
          }
        }
      );
    };
    
    initPush();
    addListeners();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [user, router, toast]);

  return null; // This component doesn't render anything
}
