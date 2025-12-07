'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getRelevantGuide, type Guide } from '@/ai/guide-engine';
import { Bot, Loader2, Volume2, StepForward, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface GuideDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function GuideDialog({ isOpen, onOpenChange }: GuideDialogProps) {
  const pathname = usePathname();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);


  // 1. Load Voices & select Arabic voice
  useEffect(() => {
    const loadAndSelectVoice = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
        const arabicVoice = availableVoices.find(v => v.lang === 'ar-SA') || availableVoices.find(v => v.lang.includes('ar'));
        setSelectedVoice(arabicVoice || null);
      }
    };

    loadAndSelectVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadAndSelectVoice;
    }
  }, []);

  // 2. Load Guide Content
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        const context = pathname.split('/').pop() || 'dashboard';
        const relevantGuide = getRelevantGuide(context);
        setGuide(relevantGuide);
        setActiveStep(0);
        setIsLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
        // Cancel speech when dialog closes
        window.speechSynthesis.cancel();
    }
  }, [isOpen, pathname]);

  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) {
      return; // Fail silently or show toast
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // 1. Force Language Intent
    utterance.lang = 'ar-SA'; 
    utterance.rate = 0.9;

    // 2. Try to assign the specific voice if we found one
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // 3. Speak regardless (Browser will use default fallback if voice is null)
    window.speechSynthesis.speak(utterance);
  };


  const nextStep = () => {
    if (guide && activeStep < guide.steps.length - 1) {
      setActiveStep(prev => prev + 1);
    }
  };
  
  const resetGuide = () => {
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            المرشد السياقي الذكي
          </DialogTitle>
          <DialogDescription>
            دعني أرشدك خطوة بخطوة في هذه الشاشة.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 min-h-[200px] flex items-center justify-center">
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : guide ? (
            <div className="text-center space-y-4 w-full">
              <h3 className="font-bold text-lg">{guide.title}</h3>
              <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
                <p className="text-base font-semibold leading-relaxed">
                  {guide.steps[activeStep].text}
                </p>
              </div>
              <div className="flex items-center justify-center gap-4">
                 <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => handleSpeak(guide.steps[activeStep].text)}
                  >
                    <Volume2 className="h-5 w-5" />
                    <span className="sr-only">استمع</span>
                </Button>
                {activeStep < guide.steps.length - 1 ? (
                    <Button onClick={nextStep}>
                        <StepForward className="ml-2 h-4 w-4" />
                        الخطوة التالية ({activeStep + 2}/{guide.steps.length})
                    </Button>
                ) : (
                    <Button onClick={resetGuide} variant="secondary">
                        <X className="ml-2 h-4 w-4"/>
                        فهمت، شكراً لك
                    </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">لا توجد إرشادات خاصة بهذه الشاشة حالياً.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
