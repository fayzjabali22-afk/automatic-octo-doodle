import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-lg font-bold tracking-tighter text-primary h-[40px]',
        className
      )}
    >
      {/* The logo has been removed as requested. */}
    </div>
  );
}
