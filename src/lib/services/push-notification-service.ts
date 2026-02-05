import { db } from '@/firebase/config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface DeviceInfo {
    token: string;
    platform: 'android' | 'ios' | 'web';
    enabled: boolean;
    updatedAt: any; // serverTimestamp()
}

export async function saveDeviceToken(userId: string, deviceId: string, token: string, platform: 'android' | 'ios' | 'web'): Promise<void> {
    if (!userId || !deviceId || !token) {
        console.error("Missing userId, deviceId, or token to save device.");
        return;
    }

    const deviceRef = doc(db, 'users', userId, 'devices', deviceId);
    const deviceData: DeviceInfo = {
        token,
        platform,
        enabled: true,
        updatedAt: serverTimestamp(),
    };

    try {
        await setDoc(deviceRef, deviceData, { merge: true });
        console.log(`Device token saved successfully for user ${userId} and device ${deviceId}.`);
    } catch (error) {
        console.error("Error saving device token: ", error);
        throw error;
    }
}
