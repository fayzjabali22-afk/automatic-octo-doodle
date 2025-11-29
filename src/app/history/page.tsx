'use client';
import { AppLayout } from '@/components/app-layout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const trips = [
  {
    id: 'TRIP001',
    origin: 'Riyadh, SA',
    destination: 'Dubai, AE',
    departure: '2024-05-20',
    status: 'Completed',
  },
  {
    id: 'TRIP002',
    origin: 'Jeddah, SA',
    destination: 'Cairo, EG',
    departure: '2024-05-22',
    status: 'In-Transit',
  },
  {
    id: 'TRIP003',
    origin: 'Dammam, SA',
    destination: 'Kuwait City, KW',
    departure: '2024-05-25',
    status: 'Planned',
  },
    {
    id: 'TRIP004',
    origin: 'Riyadh, SA',
    destination: 'Manama, BH',
    departure: '2024-05-18',
    status: 'Cancelled',
  },
];


export default function HistoryPage() {
  return (
    <AppLayout>
      <Card>
        <CardHeader>
          <CardTitle>Trip History</CardTitle>
          <CardDescription>View your past and current international trips.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* For larger screens, use a table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trip ID</TableHead>
                  <TableHead>Origin</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Departure Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map((trip) => (
                  <TableRow key={trip.id}>
                    <TableCell className="font-medium">{trip.id}</TableCell>
                    <TableCell>{trip.origin}</TableCell>
                    <TableCell>{trip.destination}</TableCell>
                    <TableCell>{trip.departure}</TableCell>
                    <TableCell>
                      <Badge variant={
                        trip.status === 'Completed' ? 'default' :
                        trip.status === 'In-Transit' ? 'secondary' :
                        trip.status === 'Cancelled' ? 'destructive' :
                        'outline'
                      }>{trip.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* For mobile screens, use a list of cards */}
          <div className="md:hidden space-y-4">
            {trips.map((trip) => (
              <Card key={trip.id} className="w-full">
                <CardContent className="p-4 grid gap-2">
                    <div className="flex justify-between items-center">
                        <span className="font-medium text-lg">{trip.id}</span>
                        <Badge variant={
                          trip.status === 'Completed' ? 'default' :
                          trip.status === 'In-Transit' ? 'secondary' :
                          trip.status === 'Cancelled' ? 'destructive' :
                          'outline'
                        }>{trip.status}</Badge>
                    </div>
                    <div className="text-muted-foreground text-sm">
                        <p>From: {trip.origin}</p>
                        <p>To: {trip.destination}</p>
                    </div>
                    <div className="text-sm pt-2">
                        <p>Departure: {trip.departure}</p>
                    </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
