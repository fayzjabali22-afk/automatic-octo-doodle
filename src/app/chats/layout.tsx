'use client';

import { ChatList } from '@/components/chat-list';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ChatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
        <div className="flex h-full items-center justify-center">
            <p>جاري التحميل...</p>
        </div>
    )
  }

  return (
    <div className="flex h-full w-full max-w-7xl mx-auto overflow-hidden" dir="rtl">
      <div className="w-full md:w-1/3 lg:w-1/4 h-full border-s border-border/50">
        <ChatList />
      </div>
      <div className="flex-1 h-full bg-muted/30">
        {children}
      </div>
    </div>
  );
}
