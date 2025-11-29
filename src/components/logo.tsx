import { Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-lg font-bold tracking-tighter text-primary',
        className
      )}
    >
      <Truck className="h-6 w-6" />
      <h1 className="font-headline">Safar Carrier</h1>
    </div>
  );
}
