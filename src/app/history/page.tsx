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
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import type { Trip } from '@/lib/data';

export default function HistoryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const tripsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'trips'), where('userId', '==', user.uid));
  }, [firestore, user]);

  const { data: trips, isLoading } = useCollection<Trip>(tripsQuery);

  const renderSkeleton = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 grid gap-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-4 w-32 pt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (isUserLoading || isLoading) {
    return (
      <AppLayout>
        <div className="bg-[#130609] p-4 md:p-8 rounded-lg">
          <Card>
            <CardHeader>
              <CardTitle>My Bookings</CardTitle>
              <CardDescription>View and manage your current and past trip bookings.</CardDescription>
            </CardHeader>
            <CardContent>
              {renderSkeleton()}
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!trips || trips.length === 0) {
    return (
        <AppLayout>
          <div className="bg-[#130609] p-4 md:p-8 rounded-lg">
            <Card>
                <CardHeader>
                    <CardTitle>My Bookings</CardTitle>
                    <CardDescription>View and manage your current and past trip bookings.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12">
                        <p className="text-lg text-muted-foreground">You have no bookings yet.</p>
                    </div>
                </CardContent>
            </Card>
          </div>
        </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="bg-[#130609] p-4 md:p-8 rounded-lg">
        <Card>
          <CardHeader>
            <CardTitle>My Bookings</CardTitle>
            <CardDescription>View and manage your current and past trip bookings.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* For larger screens, use a table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Origin</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Departure Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((trip) => (
                    <TableRow key={trip.id}>
                      <TableCell className="font-medium">{trip.id.substring(0,7).toUpperCase()}</TableCell>
                      <TableCell>{trip.origin}</TableCell>
                      <TableCell>{trip.destination}</TableCell>
                      <TableCell>{new Date(trip.departureDate).toLocaleDateString()}</TableCell>
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
                          <span className="font-medium text-lg">{trip.id.substring(0,7).toUpperCase()}</span>
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
                          <p>Departure: {new Date(trip.departureDate).toLocaleDateString()}</p>
                      </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
