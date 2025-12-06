
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser, useFirestore, useCollection, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import type { Message, Trip } from '@/lib/data';
import { MessageList } from './message-list';
import { Loader2, Send, Sparkles, Power } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { suggestChatReply, SuggestChatReplyInput } from '@/ai/flows/suggest-chat-reply-flow';
import { useToast } from '@/hooks/use-toast';

interface ChatDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trip: Trip | null;
}

export function ChatDialog({ isOpen, onOpenChange, trip }: ChatDialogProps) {
  const { user } = useUser();
  const { profile } = useUserProfile();
  const firestore = useFirestore();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([]);

  // The chat ID is now the trip ID for group chats.
  const chatId = trip?.id;

  const messagesQuery = useMemo(() => {
    if (!firestore || !chatId) return null;
    return query(
      collection(firestore, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );
  }, [firestore, chatId]);

  const { data: messages, isLoading } = useCollection<Message>(messagesQuery);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => scrollToBottom(), 100);
      setSuggestedReplies([]); // Clear suggestions when opening
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (content?: string) => {
    const messageContent = content || newMessage;
    if (!firestore || !user || !profile || !messageContent.trim() || !chatId) return;

    const messagesCollection = collection(firestore, 'chats', chatId, 'messages');
    const chatDocRef = doc(firestore, 'chats', chatId);
    
    const messageData = {
      content: messageContent,
      senderId: user.uid,
      senderName: profile.firstName,
      timestamp: serverTimestamp(),
    };
    
    addDocumentNonBlocking(messagesCollection, messageData);
    
    // Create or update the chat document metadata
    const chatData = {
        id: chatId,
        tripId: trip?.id,
        isGroupChat: true,
        participants: trip?.bookingIds, // This needs to be populated with real passenger UIDs
        lastMessage: messageContent,
        lastMessageSenderId: user.uid,
        lastMessageTimestamp: serverTimestamp(),
    };
    setDoc(chatDocRef, chatData, { merge: true });

    setNewMessage('');
    setSuggestedReplies([]);
  };

  const handleSuggestReply = async () => {
      if (!messages || messages.length === 0) {
        toast({ title: "لا يمكن إنشاء اقتراح", description: "لا توجد رسائل لتحليلها بعد."});
        return;
      }
      setIsSuggesting(true);
      try {
          const conversationHistory = messages.map(m => `${m.senderName}: ${m.content}`).join('\n');
          const input: SuggestChatReplyInput = {
              conversationHistory,
              userRole: 'carrier'
          };
          const result = await suggestChatReply(input);
          setSuggestedReplies(result.suggestedReplies);
      } catch (error) {
          toast({ variant: 'destructive', title: "فشل إنشاء الاقتراح", description: "حدث خطأ أثناء التواصل مع الذكاء الاصطناعي." });
      } finally {
          setIsSuggesting(false);
      }
  }

  const handleCloseChat = async () => {
    if (!firestore || !chatId) return;
    const chatDocRef = doc(firestore, 'chats', chatId);
    try {
      await updateDocumentNonBlocking(chatDocRef, { isClosed: true });
      toast({ title: "تم إغلاق الدردشة", description: "لن يتمكن المسافرون من إرسال رسائل جديدة." });
      onOpenChange(false);
    } catch (error) {
      toast({ variant: 'destructive', title: "فشل إغلاق الدردشة" });
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>غرفة عمليات الرحلة (مجموعة)</DialogTitle>
           {trip && (
            <DialogDescription>
              الدردشة الجماعية لرحلة {trip.origin} - {trip.destination}
            </DialogDescription>
          )}
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto bg-muted/20">
          <MessageList messages={messages || []} isLoading={isLoading} />
          <div ref={messagesEndRef} />
        </div>
        
        <DialogFooter className="p-4 border-t bg-background flex-col gap-2">
            {profile?.role === 'carrier' && suggestedReplies.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center pb-2">
                    {suggestedReplies.map((reply, index) => (
                        <Button key={index} variant="outline" size="sm" onClick={() => handleSendMessage(reply)}>
                            {reply}
                        </Button>
                    ))}
                </div>
            )}
            <div className="flex w-full items-center space-x-2 rtl:space-x-reverse">
              {profile?.role === 'carrier' && (
                <>
                  <Button variant="outline" size="icon" onClick={handleSuggestReply} disabled={isSuggesting || isLoading}>
                      {isSuggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </Button>
                  <Button variant="destructive" size="icon" onClick={handleCloseChat}>
                      <Power className="h-4 w-4" />
                  </Button>
                </>
              )}
                <Input
                  id="message-input"
                  placeholder="اكتب رسالتك هنا..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button type="submit" size="icon" onClick={() => handleSendMessage()} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                  <span className="sr-only">إرسال</span>
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    