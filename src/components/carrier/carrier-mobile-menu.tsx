'use client';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Logo } from '../logo';
import { LayoutDashboard, Search, Route, Archive, User, ListChecks } from 'lucide-react';
import { usePathname } from 'next/navigation';

const menuLinks = [
    { href: '/carrier', label: 'لوحة القيادة', icon: LayoutDashboard, exact: true },
    { href: '/carrier/opportunities', label: 'مركز الفرص', icon: Search, exact: false },
    { href: '/carrier/trips', label: 'رحلاتي وحجوزاتي', icon: Route, exact: false },
    { href: '/carrier/archive', label: 'الأرشيف', icon: Archive, exact: false },
    { href: '/carrier/conditions', label: 'الشروط الدائمة', icon: ListChecks, exact: false },
    { href: '/carrier/profile', label: 'الملف الشخصي', icon: User, exact: true },
];

interface CarrierMobileMenuProps {
    onLinkClick: () => void;
}

export function CarrierMobileMenu({ onLinkClick }: CarrierMobileMenuProps) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b">
                <Logo />
            </div>
            <nav className="flex-grow p-4">
                <ul className="space-y-2">
                    {menuLinks.map(link => {
                        const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href);
                        return (
                            <li key={link.href}>
                                <Link
                                    href={link.href}
                                    onClick={onLinkClick}
                                    className={cn(
                                        "flex items-center gap-4 rounded-lg px-4 py-3 text-lg font-semibold transition-colors hover:bg-muted/50 hover:text-primary",
                                        isActive ? "bg-primary/10 text-primary" : "text-foreground"
                                    )}
                                >
                                    <link.icon className="h-5 w-5" />
                                    <span>{link.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </div>
    );
}
