'use client';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { Chat, UserProfile } from '@/lib/data';
import { MessageList } from '@/components/message-list';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Paperclip } from 'lucide-react';

function ChatHeader({ chat }: { chat: Chat }) {
  const { user } = useUser();
  const firestore = useFirestore();

  const otherParticipantId = useMemo(() => {
    return chat.participants.find(p => p !== user?.uid);
  }, [chat, user]);

  const otherUserRef = useMemoFirebase(() => {
    if (!firestore || !otherParticipantId) return null;
    return doc(firestore, 'users', otherParticipantId);
  }, [firestore, otherParticipantId]);

  const { data: otherUser, isLoading } = useDoc<UserProfile>(otherUserRef);

  if (isLoading) {
    return (
      <div className="flex items-center space-x-4 p-4 border-b">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[150px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-3 border-b bg-card" dir="rtl">
       <Avatar>
            <AvatarImage src={otherUser?.photoURL} alt={otherUser?.firstName || 'User'} />
            <AvatarFallback>{otherUser?.firstName?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
      <div className="flex flex-col">
        <span className="font-bold">{otherUser?.firstName} {otherUser?.lastName}</span>
        <span className="text-xs text-muted-foreground">متصل الآن</span>
      </div>
    </div>
  );
}


export default function ChatPage() {
  const { chatId } = useParams() as { chatId: string };
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const [newMessage, setNewMessage] = useState('');

  const chatRef = useMemoFirebase(() => {
    if (!firestore || !chatId) return null;
    return doc(firestore, 'chats', chatId);
  }, [firestore, chatId]);

  const { data: chat, isLoading: isChatLoading } = useDoc<Chat>(chatRef);

  const messagesQuery = useMemoFirebase(() => {
    if (!chatRef) return null;
    return query(collection(chatRef, 'messages'), orderBy('timestamp', 'asc'));
  }, [chatRef]);

  const { data: messages, isLoading: areMessagesLoading } = useCollection(messagesQuery);

  useEffect(() => {
    if (!isChatLoading && chat && user && !chat.participants.includes(user.uid)) {
      router.push('/chats');
    }
  }, [chat, isChatLoading, user, router]);

  const handleSendMessage = async () => {
    if (!chatRef || !user || newMessage.trim() === '') return;
    
    const messageData = {
        senderId: user.uid,
        content: newMessage,
        timestamp: new Date().toISOString(),
    };

    const messagesCollection = collection(chatRef, 'messages');
    await addDocumentNonBlocking(messagesCollection, messageData);
    setNewMessage('');
  };


  if (isChatLoading) {
    return <div>جاري تحميل المحادثة...</div>;
  }

  if (!chat) {
    return <div>لم يتم العثور على المحادثة</div>;
  }

  return (
    <div className="flex flex-col h-full bg-background" dir="rtl">
        <ChatHeader chat={chat} />
        <MessageList messages={messages || []} isLoading={areMessagesLoading} />
        <div className="p-4 border-t bg-card">
            <div className="flex items-center gap-2">
                <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="اكتب رسالتك هنا..."
                    className="flex-1"
                />
                <Button onClick={handleSendMessage} size="icon">
                    <Send className="h-5 w-5" />
                </Button>
                <Button variant="outline" size="icon">
                    <Paperclip className="h-5 w-5" />
                </Button>
            </div>
        </div>
    </div>
  );
}
