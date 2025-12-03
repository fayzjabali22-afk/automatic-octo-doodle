'use client';

import { useCollection, useFirestore, useUser } from '@/firebase';
import type { Chat } from '@/lib/data';
import { collection, query, where } from 'firebase/firestore';
import { CarrierChatListItem } from './carrier-chat-list-item';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquareOff } from 'lucide-react';
import { useMemo } from 'react';


export function CarrierChatList() {
  const { user } = useUser();
  const firestore = useFirestore();

  const chatsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    // Removed orderBy to prevent index error. Sorting will be done client-side.
    return query(
        collection(firestore, 'chats'), 
        where('participants', 'array-contains', user.uid)
    );
  }, [firestore, user]);

  const { data: chats, isLoading } = useCollection<Chat>(chatsQuery);

  const sortedChats = useMemo(() => {
    if (!chats) return [];
    return [...chats].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [chats]);
  
  if (isLoading) {
    return (
        <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold px-2">المحادثات</h2>
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
    <div className="h-full flex flex-col bg-card border-s" dir="rtl">
        <header className="p-4 border-b sticky top-0 bg-card z-10">
            <h2 className="text-xl font-bold">محادثاتي</h2>
        </header>
      <div className="flex-1 overflow-y-auto">
        {sortedChats && sortedChats.length > 0 ? (
          sortedChats.map(chat => <CarrierChatListItem key={chat.id} chat={chat} />)
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 text-muted-foreground h-full">
            <MessageSquareOff className="h-12 w-12 mb-4 text-muted-foreground/50"/>
            <p className="font-bold">لا توجد محادثات حتى الآن.</p>
            <p className="text-xs mt-1">عندما تبدأ محادثة مع مسافر، ستظهر هنا.</p>
          </div>
        )}
      </div>
    </div>
  );
}
