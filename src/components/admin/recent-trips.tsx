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
import { ArrowRight } from 'lucide-react';

const trips = [
  { id: '1', from: 'عمّان', to: 'الرياض', carrier: 'فايز الحربي', seats: 3, status: 'مكتملة' },
  { id: '2', from: 'دمشق', to: 'جدة', carrier: 'أحمد المصري', seats: 1, status: 'قيد التنفيذ' },
  { id: '3', from: 'القاهرة', to: 'عمّان', carrier: 'سيد محمود', seats: 4, status: 'مجدولة' },
  { id: '4', from: 'إربد', to: 'حلب', carrier: 'محمد الشمالي', seats: 2, status: 'ملغاة' },
];

export function RecentTrips() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>آخر الرحلات المسجلة</CardTitle>
        <CardDescription>
            نظرة سريعة على آخر 4 رحلات في النظام.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الرحلة</TableHead>
              <TableHead>الناقل</TableHead>
              <TableHead className="text-center">المقاعد</TableHead>
              <TableHead className="text-left">الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trips.map(trip => (
                <TableRow key={trip.id}>
                    <TableCell>
                        <div className="font-medium flex items-center gap-1">{trip.from} <ArrowRight className="h-3 w-3"/> {trip.to}</div>
                    </TableCell>
                    <TableCell>{trip.carrier}</TableCell>
                    <TableCell className="text-center">{trip.seats}</TableCell>
                    <TableCell className="text-left">
                        <Badge variant={
                            trip.status === 'مكتملة' ? 'default' :
                            trip.status === 'قيد التنفيذ' ? 'secondary' :
                            trip.status === 'ملغاة' ? 'destructive' :
                            'outline'
                        }>{trip.status}</Badge>
                    </TableCell>
                </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
