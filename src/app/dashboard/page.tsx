import { AppLayout } from '@/components/app-layout';
import { MapPlaceholder } from '@/components/map-placeholder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="grid h-full grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <MapPlaceholder />
        </div>
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-medium">
                        Manage Trips
                    </CardTitle>
                    <Button size="sm">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Trip
                    </Button>
                </CardHeader>
                <CardContent>
                    <CardDescription>
                        Create and manage your international transport trips.
                    </CardDescription>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-medium">Active Trip</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">No active trip.</p>
                </CardContent>
            </Card>
        </div>
      </div>
    </AppLayout>
  );
}
