'use client';

import { MessageSquareDashed } from 'lucide-react';

export default function ChatsPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-background/20 p-8 text-center" dir="rtl">
      <MessageSquareDashed className="h-16 w-16 text-muted-foreground/50 mb-4" />
      <h2 className="text-xl font-bold text-foreground">ابدأ محادثة</h2>
      <p className="text-muted-foreground">
        اختر محادثة من القائمة على اليمين لعرض الرسائل.
      </p>
    </div>
  );
}
