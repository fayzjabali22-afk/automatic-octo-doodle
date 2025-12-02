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
        src="/logo.png"
        alt="Safar Carrier Logo"
        width={145}
        height={110}
        priority
      />
    </div>
  );
}
