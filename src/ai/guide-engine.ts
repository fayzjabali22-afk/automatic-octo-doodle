
/**
 * @file src/ai/guide-engine.ts
 * @description The Logic Engine for the Contextual Guide.
 * This engine provides a fast, zero-cost, non-LLM way to retrieve the
 * correct guide from the knowledge base based on the user's context.
 */

import { knowledgeBase, type Guide } from './knowledge-base';

/**
 * Retrieves the most relevant guide from the knowledge base.
 * In this version, it's a direct lookup based on context. Future versions
 * could use an LLM for more complex query matching.
 *
 * @param context - A string representing the user's current location in the app (e.g., 'carrier_dashboard').
 * @param query - An optional user query. Currently unused, for future enhancement.
 * @returns The most relevant Guide object, or null if no specific guide is found.
 */
export function getRelevantGuide(context: string, query?: string): Guide | null {
  // For now, we perform a simple, direct lookup.
  // We can map multiple page contexts to a single guide.
  const contextMap: { [key: string]: string } = {
    'carrier_dashboard': 'carrier_add_trip',
    'carrier_trips': 'carrier_add_trip',
    'dashboard': 'traveler_booking_process',
    'history_payment': 'payment_process',
  };

  const guideId = contextMap[context];

  if (guideId && knowledgeBase[guideId]) {
    return knowledgeBase[guideId];
  }

  // If no specific guide matches, we can return a default or null.
  return null;
}
