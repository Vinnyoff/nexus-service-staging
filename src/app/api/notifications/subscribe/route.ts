
import { NextResponse } from 'next/server';
import { db } from '@/firebase/config';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import type { PushSubscription, User } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subscription, userId } = body;

    if (!subscription || !userId) {
      return NextResponse.json({ error: 'Subscription and userId are required.' }, { status: 400 });
    }

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }
    
    const userData = userDoc.data() as User;
    const existingSubscriptions = userData.pushSubscriptions || [];
    
    // Verifica se a inscrição já existe para evitar duplicatas
    const alreadySubscribed = existingSubscriptions.some(
        sub => sub.endpoint === subscription.endpoint
    );

    if (alreadySubscribed) {
        console.log(`User ${userId} is already subscribed with endpoint ${subscription.endpoint}.`);
        return NextResponse.json({ message: 'User already subscribed.' }, { status: 200 });
    }
    
    // Adiciona a nova inscrição ao array
    await updateDoc(userRef, {
      pushSubscriptions: arrayUnion(subscription as PushSubscription)
    });

    console.log(`Subscription saved for user ${userId}.`);
    return NextResponse.json({ message: 'Subscription saved successfully.' }, { status: 201 });

  } catch (error) {
    console.error('Error saving push subscription:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to save subscription.', details: errorMessage }, { status: 500 });
  }
}
