import { cn } from '@/lib/utils';
import Image from 'next/image';

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-lg font-bold tracking-tighter text-primary',
        className
      )}
    >
      <Image 
        src="https://i.postimg.cc/zvbhTsXV/Iwjw-sfryat.png" 
        alt="Safar Carrier Logo"
        width={140}
        height={40}
        className="object-contain"
      />
    </div>
  );
}
