'use client';
import Link from "next/link";
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { User, Ship } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const bgImage = PlaceHolderImages.find(
    (img) => img.id === 'login-background'
  );

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center text-center text-white">
      {bgImage && (
        <Image
          src={bgImage.imageUrl}
          alt={bgImage.description}
          fill
          className="absolute inset-0 -z-10 h-full w-full object-cover"
          data-ai-hint={bgImage.imageHint}
        />
      )}
      <div className="absolute inset-0 -z-10 bg-black/70" />
      
      <div className="flex flex-col items-center p-4">
        <Logo />
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
          بوابتك للسفر البري الآمن
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-white/80">
          منصة تجمع الناقلين والمسافرين لتجربة نقل بري موثوقة وسهلة بين الدول.
        </p>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
          <Button
            size="lg"
            variant="secondary"
            className="text-lg h-16 flex-col gap-1 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm border border-white/20"
            onClick={() => router.push('/signup')}
          >
            <User className="mb-1 h-5 w-5" />
            أنا مسافر
          </Button>
           <Button
            size="lg"
            className="text-lg h-16 flex-col gap-1"
            onClick={() => router.push('/carrier-signup')}
          >
            <Ship className="mb-1 h-5 w-5" />
            أنا ناقل
          </Button>
        </div>
         <div className="mt-6">
            <p className="text-sm text-white/70">
                لديك حساب بالفعل؟{' '}
                <Link href="/login" className="font-bold underline hover:text-primary">
                    سجل دخولك من هنا
                </Link>
            </p>
        </div>
      </div>
    </div>
  );
}
