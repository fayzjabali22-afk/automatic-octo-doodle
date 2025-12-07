
/**
 * @file src/ai/knowledge-base.ts
 * @description The Knowledge Core for the Contextual Guide.
 * This file acts as the "memory" of the AI, containing all the hardcoded
 * instructional guides for various system processes.
 */

export interface GuideStep {
  text: string;
  selector?: string; // For future UI highlighting
}

export interface Guide {
  id: string;
  title: string;
  audience: 'carrier' | 'traveler';
  steps: GuideStep[];
}

// The master object containing all guides.
// The key is a unique context identifier.
export const knowledgeBase: Record<string, Guide> = {
  carrier_add_trip: {
    id: 'carrier_add_trip',
    title: "إضافة رحلة مجدولة جديدة",
    audience: "carrier",
    steps: [
      { text: "من لوحة القيادة، اضغط على زر 'تأسيس رحلة جديدة' الأخضر لبدء العملية." },
      { text: "املأ تفاصيل الانطلاق والوصول، ثم حدد تاريخ ووقت الرحلة بدقة." },
      { text: "حدد سعر المقعد ونسبة العربون التي ترغب في تحصيلها مسبقاً." },
      { text: "يمكنك إضافة شروط خاصة بالرحلة، مثل عدد الحقائب المسموح بها." },
      { text: "أخيراً، اضغط على 'نشر الرحلة' لجعلها متاحة للمسافرين." },
    ],
  },
  traveler_booking_process: {
    id: 'traveler_booking_process',
    title: "كيفية حجز رحلة",
    audience: "traveler",
    steps: [
      { text: "من لوحة التحكم، يمكنك البحث عن رحلتك بتحديد نقطة الانطلاق والوصول والتاريخ." },
      { text: "استعرض الرحلات المتاحة واختر العرض الذي يناسبك من أحد الناقلين." },
      { text: "بعد اختيار الرحلة، اضغط على 'حجز الآن' وأدخل تفاصيل الركاب." },
      { text: "سيتم إرسال طلبك للناقل، وعندما يوافق، سيصلك إشعار لدفع العربون وتأكيد الحجز." },
    ],
  },
  payment_process: {
    id: 'payment_process',
    title: "شرح عملية الدفع",
    audience: "traveler",
    steps: [
        { text: "عندما يوافق الناقل على طلب حجزك، ستنتقل حالة الحجز إلى 'بانتظار دفع العربون'." },
        { text: "ستظهر لك نافذة تحتوي على التفاصيل المالية وتعليمات الدفع الخاصة بالناقل (مثل رقم محفظة إلكترونية)." },
        { text: "قم بتحويل مبلغ العربون المحدد مباشرة إلى الناقل باستخدام المعلومات المتوفرة." },
        { text: "بعد التحويل، اضغط على زر 'تم التحويل، أكّد الحجز' ليتم حجز مقاعدك نهائياً." },
        { text: "تذكر: المنصة وسيط، والتحويل المالي مسؤوليتك المباشرة مع الناقل." },
    ]
  }
};
