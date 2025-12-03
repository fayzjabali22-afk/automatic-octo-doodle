'use client';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

// Ensure Firebase is initialized
if (!getApps().length) {
  try {
    initializeApp();
  } catch {
    initializeApp(firebaseConfig);
  }
}

const firestore = getFirestore();
const analyticsCollection = collection(firestore, 'analytics_events');

type EventName = 'TRIP_SEARCH' | 'TRIP_PUBLISHED' | 'BOOKING_CONFIRMED' | 'OFFER_SUBMITTED';

interface EventDetails {
  [key: string]: any;
}

/**
 * Logs a specific analytics event to Firestore in a non-blocking "fire-and-forget" manner.
 * @param eventName The name of the event to log.
 * @param details An object containing details about the event.
 */
export function logEvent(eventName: EventName, details: EventDetails): void {
  // We do not await this promise, making it a "fire-and-forget" operation.
  // This ensures that the user's flow is not blocked by analytics logging.
  addDoc(analyticsCollection, {
    eventName,
    details,
    loggedAt: serverTimestamp(),
  }).catch(error => {
    // Log errors to the console for debugging, but don't let it crash the app.
    console.error("Analytics logging failed:", error);
  });
}
