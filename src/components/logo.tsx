import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 text-lg font-bold tracking-tighter text-primary',
        className
      )}
    >
    </div>
  );
}
