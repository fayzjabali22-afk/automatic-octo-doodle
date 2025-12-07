'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const users = [
  { id: '1', name: 'فايز الحربي', email: 'fayez@example.com', role: 'carrier', status: 'Active', trips: 5 },
  { id: '2', name: 'أحمد المصري', email: 'ahmad@example.com', role: 'carrier', status: 'Active', trips: 8 },
  { id: '3', name: 'علي حسن', email: 'ali@example.com', role: 'traveler', status: 'Active', trips: 2 },
  { id: '4', name: 'سارة عبدالله', email: 'sara@example.com', role: 'traveler', status: 'Inactive', trips: 0 },
];

export default function AdminUsersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>إدارة المستخدمين</CardTitle>
        <CardDescription>
            عرض وتعديل جميع المستخدمين في النظام.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>الدور</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="text-center">عدد الرحلات</TableHead>
              <TableHead className="text-left">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(user => (
                <TableRow key={user.id}>
                    <TableCell>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell>
                        <Badge variant={user.role === 'carrier' ? 'secondary' : 'outline'}>
                            {user.role === 'carrier' ? 'ناقل' : 'مسافر'}
                        </Badge>
                    </TableCell>
                    <TableCell>
                        <Badge variant={user.status === 'Active' ? 'default' : 'destructive'}>{user.status}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{user.trips}</TableCell>
                    <TableCell className="text-left">
                        {/* Actions Dropdown Here */}
                    </TableCell>
                </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
