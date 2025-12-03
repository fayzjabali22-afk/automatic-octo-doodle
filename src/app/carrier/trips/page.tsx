'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { AddTripDialog } from '@/components/carrier/add-trip-dialog';
import { MyTripsList } from '@/components/carrier/my-trips-list';

export default function CarrierTripsPage() {
    const [isAddTripDialogOpen, setIsAddTripDialogOpen] = useState(false);

    return (
        <div className="space-y-4">
            <header className="flex flex-col sm:flex-row justify-between items-center gap-4 p-2 rounded-lg bg-card shadow">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold">رحلاتي المجدولة</h1>
                    <p className="text-muted-foreground text-xs md:text-sm">
                        أدرْ رحلاتك المنشورة، وأضف رحلات جديدة ليعثر عليها المسافرون.
                    </p>
                </div>
                <Button 
                    className="w-full sm:w-auto"
                    onClick={() => setIsAddTripDialogOpen(true)}
                >
                    <PlusCircle className="ml-2 h-4 w-4" />
                    إضافة رحلة جديدة
                </Button>
            </header>
            
            <main>
                <MyTripsList />
            </main>

            <AddTripDialog 
                isOpen={isAddTripDialogOpen}
                onOpenChange={setIsAddTripDialogOpen}
            />
        </div>
    );
}
