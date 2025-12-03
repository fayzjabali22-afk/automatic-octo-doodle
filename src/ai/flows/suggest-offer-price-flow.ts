'use server';
/**
 * @fileOverview An AI flow to suggest a competitive price for a trip offer.
 *
 * - suggestOfferPrice - A function that calls the Genkit flow to get a price suggestion.
 * - SuggestOfferPriceInput - The input type for the flow.
 * - SuggestOfferPriceOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SuggestOfferPriceInputSchema = z.object({
  origin: z.string().describe('The starting city of the trip.'),
  destination: z.string().describe('The destination city of the trip.'),
  passengers: z.number().describe('The number of passengers for the trip.'),
  departureDate: z.string().describe('The departure date of the trip in ISO format.'),
});
export type SuggestOfferPriceInput = z.infer<typeof SuggestOfferPriceInputSchema>;

const SuggestOfferPriceOutputSchema = z.object({
  suggestedPrice: z.number().describe('The suggested competitive price for the trip in Jordanian Dinars (JOD).'),
  justification: z.string().describe('A brief justification for the suggested price, mentioning factors like distance, demand, and date.'),
});
export type SuggestOfferPriceOutput = z.infer<typeof SuggestOfferPriceOutputSchema>;

// This is the function that will be called from the UI
export async function suggestOfferPrice(input: SuggestOfferPriceInput): Promise<SuggestOfferPriceOutput> {
  return suggestOfferPriceFlow(input);
}

const suggestOfferPricePrompt = ai.definePrompt({
    name: 'suggestOfferPricePrompt',
    input: { schema: SuggestOfferPriceInputSchema },
    output: { schema: SuggestOfferPriceOutputSchema },
    prompt: `You are a logistics and pricing expert for a ride-sharing app in the Middle East, specifically operating between Jordan, Syria, KSA, and Egypt. Your task is to suggest a competitive but profitable price in Jordanian Dinars (JOD) for a carrier making an offer for a requested trip.

Analyze the following trip details:
- Origin: {{{origin}}}
- Destination: {{{destination}}}
- Number of Passengers: {{{passengers}}}
- Departure Date: {{{departureDate}}}

Consider these factors:
- Distance between cities.
- Typical fuel and operational costs.
- Demand (e.g., weekends, holidays might be higher).
- Number of passengers (more passengers might slightly reduce the per-seat cost but increase the total price).

Based on your analysis, provide a suggested total price and a short, encouraging justification for the carrier. The price should be a single numeric value.
`,
});

const suggestOfferPriceFlow = ai.defineFlow(
  {
    name: 'suggestOfferPriceFlow',
    inputSchema: SuggestOfferPriceInputSchema,
    outputSchema: SuggestOfferPriceOutputSchema,
  },
  async (input) => {
    const { output } = await suggestOfferPricePrompt(input);
    if (!output) {
      throw new Error('The AI model did not return a valid output.');
    }
    return output;
  }
);
