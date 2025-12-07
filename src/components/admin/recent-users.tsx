'use client';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '../ui/badge';

const users = [
    { name: 'فايز الحربي', email: 'fayez@example.com', role: 'carrier'},
    { name: 'علي حسن', email: 'ali@example.com', role: 'traveler'},
    { name: 'سارة عبدالله', email: 'sara@example.com', role: 'traveler'},
    { name: 'محمد الشمالي', email: 'mohammed@example.com', role: 'carrier'},
    { name: 'خالد المصري', email: 'khaled@example.com', role: 'traveler'},
]

export function RecentUsers() {
  return (
    <Card>
        <CardHeader>
            <CardTitle>آخر المستخدمين المسجلين</CardTitle>
            <CardDescription>
                قائمة بآخر 5 مستخدمين انضموا للنظام.
            </CardDescription>
        </CardHeader>
      <CardContent className="grid gap-8">
        {users.map((user, i) => (
            <div key={i} className="flex items-center gap-4">
                <Avatar className="hidden h-9 w-9 sm:flex">
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="grid gap-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div className="ml-auto font-medium">
                    <Badge variant={user.role === 'carrier' ? 'secondary' : 'outline'}>
                        {user.role === 'carrier' ? 'ناقل' : 'مسافر'}
                    </Badge>
                </div>
            </div>
        ))}
      </CardContent>
    </Card>
  );
}
