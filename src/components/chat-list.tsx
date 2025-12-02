'use client';

import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { Chat, UserProfile } from '@/lib/data';
import { collection, query, where, doc, orderBy } from 'firebase/firestore';
import { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { Skeleton } from './ui/skeleton';

function ChatListItem({ chat }: { chat: Chat }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const pathname = usePathname();

  const otherParticipantId = useMemo(() => {
    if (!user) return null;
    return chat.participants.find(p => p !== user.uid);
  }, [chat.participants, user]);

  const otherUserRef = useMemoFirebase(() => {
    if (!firestore || !otherParticipantId) return null;
    return doc(firestore, 'users', otherParticipantId);
  }, [firestore, otherParticipantId]);

  const { data: otherUser, isLoading } = useDoc<UserProfile>(otherUserRef);

  if (isLoading) {
    return (
        <div className="flex items-center p-4 space-x-4 rtl:space-x-reverse">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-4 w-[100px]" />
            </div>
        </div>
    );
  }
  
  const isActive = pathname === `/chats/${chat.id}`;

  return (
    <Link href={`/chats/${chat.id}`}>
        <div className={cn(
            "flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/30",
            isActive && "bg-muted"
        )}>
            <Avatar>
                <AvatarImage src={otherUser?.photoURL} alt={otherUser?.firstName || 'User'}/>
                <AvatarFallback>{otherUser?.firstName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
                <p className="font-bold truncate">{otherUser?.firstName} {otherUser?.lastName}</p>
                <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
            </div>
        </div>
    </Link>
  );
}


export function ChatList() {
  const { user } = useUser();
  const firestore = useFirestore();

  const chatsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
        collection(firestore, 'chats'), 
        where('participants', 'array-contains', user.uid),
        orderBy('updatedAt', 'desc')
    );
  }, [firestore, user]);

  const { data: chats, isLoading } = useCollection<Chat>(chatsQuery);
  
  if (isLoading) {
    return (
        <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold px-4">المحادثات</h2>
             {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center p-2 space-x-4 rtl:space-x-reverse">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-[150px]" />
                        <Skeleton className="h-4 w-[100px]" />
                    </div>
                </div>
            ))}
        </div>
    )
  }
  
  return (
    <div className="h-full flex flex-col bg-card" dir="rtl">
        <header className="p-4 border-b">
            <h2 className="text-xl font-bold">المحادثات</h2>
        </header>
      <div className="flex-1 overflow-y-auto">
        {chats && chats.length > 0 ? (
          chats.map(chat => <ChatListItem key={chat.id} chat={chat} />)
        ) : (
          <p className="p-4 text-center text-muted-foreground">لا توجد محادثات حتى الآن.</p>
        )}
      </div>
    </div>
  );
}
