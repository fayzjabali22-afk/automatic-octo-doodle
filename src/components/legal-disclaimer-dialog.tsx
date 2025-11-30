
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';

interface LegalDisclaimerDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function LegalDisclaimerDialog({ isOpen, onOpenChange }: LegalDisclaimerDialogProps) {
    const router = useRouter();

    const handleContinue = () => {
        // Here we would handle the next step after the user agrees.
        // For now, we'll redirect to the login page as per the flow.
        router.push('/login');
    };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>ملاحظة قانونية هامة</AlertDialogTitle>
          <AlertDialogDescription className="text-right">
            بمجرد قيامك بالضغط على زر "المتابعة"، فإنك تقر وتوافق على أن موقع سفريات يعمل فقط كوسيط تقني لتقريب التواصل بين طرفين: المسافر والناقل.
            <br/><br/>
            ولا يتحمل موقع سفريات أي مسؤولية قانونية أو تعاقدية أو جزائية عن أي فعل أو سلوك أو التزام قد يصدر عن الناقل أو المسافر.
            <br/><br/>
            وتقع جميع الالتزامات والحقوق حصراً على عاتق الأطراف المتعاقدة فيما بينهم، ويظل موقع سفريات خالياً من أي مسؤولية أو تبعة قانونية ذات صلة.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={handleContinue}>متابعة</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
