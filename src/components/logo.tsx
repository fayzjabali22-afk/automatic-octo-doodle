'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 text-lg font-bold tracking-tighter text-primary',
        className
      )}
    >
      <Image
        src="https://i.postimg.cc/rzXN6mS5/lwjw-sfryat.png"
        alt="safaryat Logo"
        width={120}
        height={90}
        priority
        className="object-contain"
      />
    </div>
  );
}
