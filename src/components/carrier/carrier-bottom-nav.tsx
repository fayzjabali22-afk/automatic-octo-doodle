'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Archive, FilePlus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// تم تحديث القائمة لتشمل ثلاثة عناصر أساسية فقط
const navItems = [
  { href: '/carrier/requests', label: 'الطلبات', icon: FilePlus },
  { href: '/carrier/trips', label: 'رحلاتي', icon: Home },
  { href: '/carrier/archive', label: 'الأرشيف', icon: Archive },
];

interface CarrierBottomNavProps {
  onAddTripClick: () => void;
}

export function CarrierBottomNav({ onAddTripClick }: CarrierBottomNavProps) {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-card border-t border-border/50 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-50">
      <div className="relative h-full">
        {/* Floating Action Button for Add Trip */}
        <div className="absolute left-1/2 -top-7 -translate-x-1/2 flex items-center justify-center">
            <Button
                size="icon"
                className="w-16 h-16 rounded-full bg-accent text-accent-foreground shadow-lg hover:bg-accent/90 focus:ring-4 focus:ring-accent/50"
                onClick={onAddTripClick}
                aria-label="تأسيس رحلة جديدة"
            >
                <Plus className="h-8 w-8" />
            </Button>
        </div>

        {/* تم تحديث الشبكة لتوزيع ثلاثة عناصر بشكل متساوٍ */}
        <nav className="grid grid-cols-3 h-full items-center px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <div 
                key={item.href}
                className="flex flex-col items-center justify-center h-full"
              >
                <Link href={item.href} className="flex flex-col items-center gap-1 w-full py-2">
                  <item.icon
                    className={cn(
                      'h-6 w-6 transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                  <span
                    className={cn(
                      'text-[10px] font-bold transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
