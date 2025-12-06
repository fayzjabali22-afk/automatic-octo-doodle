
'use server';
/**
 * @fileOverview An AI flow to suggest replies for a chat conversation.
 *
 * - suggestChatReply - A function that calls the Genkit flow to get reply suggestions.
 * - SuggestChatReplyInput - The input type for the flow.
 * - SuggestChatReplyOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SuggestChatReplyInputSchema = z.object({
  conversationHistory: z.string().describe('The entire chat history, with each message on a new line.'),
  userRole: z.enum(['carrier', 'traveler']).describe('The role of the user for whom we are suggesting a reply.'),
});
export type SuggestChatReplyInput = z.infer<typeof SuggestChatReplyInputSchema>;

const SuggestChatReplyOutputSchema = z.object({
  suggestedReplies: z.array(z.string()).length(3).describe('An array of exactly three concise, relevant, and professional reply suggestions in Arabic.'),
});
export type SuggestChatReplyOutput = z.infer<typeof SuggestChatReplyOutputSchema>;

// This is the function that will be called from the UI
export async function suggestChatReply(input: SuggestChatReplyInput): Promise<SuggestChatReplyOutput> {
  return suggestChatReplyFlow(input);
}

const suggestReplyPrompt = ai.definePrompt({
    name: 'suggestChatReplyPrompt',
    input: { schema: SuggestChatReplyInputSchema },
    output: { schema: SuggestChatReplyOutputSchema },
    prompt: `You are an expert AI assistant for a ride-sharing app. Your task is to suggest three concise, professional, and contextually relevant replies in Arabic for a user based on their role and the conversation history.

The user's role is: {{{userRole}}}

The conversation history is:
---
{{{conversationHistory}}}
---

Analyze the last message in the history and generate three distinct, helpful, and short reply options. The replies should be polite and clear.

Examples for a 'carrier':
- If a user asks "متى سنتحرك؟", suggest: "سننطلق في الموعد المحدد.", "هل أنت في نقطة الالتقاء؟", "بعد قليل، ننتظر راكباً آخر."
- If a user says "شكراً لك", suggest: "على الرحب والسعة.", "أهلاً بك.", "في خدمتك."

Generate the three suggestions now.
`,
});

const suggestChatReplyFlow = ai.defineFlow(
  {
    name: 'suggestChatReplyFlow',
    inputSchema: SuggestChatReplyInputSchema,
    outputSchema: SuggestChatReplyOutputSchema,
  },
  async (input) => {
    const { output } = await suggestReplyPrompt(input);
    if (!output) {
      throw new Error('The AI model did not return a valid output.');
    }
    return output;
  }
);

    