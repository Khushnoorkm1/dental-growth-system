export const translations = {
  en: {
    nav: { services: 'Services', results: 'Results', reviews: 'Reviews', contact: 'Contact', bookFree: 'Book Free Consultation' },
    hero: {
      badge: 'Harley Street · London',
      headline: 'Your Perfect Smile',
      headlineSub: 'Awaits',
      subtext: 'World-class dental care at the heart of London. Invisalign, implants, and smile makeovers — tailored to you.',
      cta: 'Book Free Consultation',
      ctaSub: 'No obligation · Takes 2 minutes',
      stats: { patients: '12,000+ Happy Patients', rating: '4.9★ Google Rating', experience: '20+ Years Experience' },
    },
    services: {
      title: 'Premium Treatments',
      subtitle: 'Crafted for lasting results',
      items: {
        invisalign: { name: 'Invisalign', desc: 'Discreet, removable aligners. Straighter teeth without metal braces.', from: 'From £2,500' },
        implants: { name: 'Dental Implants', desc: 'Permanent tooth replacement that looks and feels completely natural.', from: 'From £2,200' },
        veneers: { name: 'Porcelain Veneers', desc: 'Ultra-thin ceramic shells for a flawless, magazine-cover smile.', from: 'From £800/tooth' },
        whitening: { name: 'Teeth Whitening', desc: 'Clinically-proven treatments for up to 10 shades brighter in one session.', from: 'From £299' },
        composite: { name: 'Composite Bonding', desc: 'Reshape, repair and perfect your teeth in a single appointment.', from: 'From £250/tooth' },
        general: { name: 'General Dentistry', desc: 'Comprehensive care from hygiene to restorations. Your health, first.', from: 'From £95' },
      },
    },
    results: { title: 'Real Transformations', subtitle: "See what's possible" },
    reviews: { title: 'Loved by Thousands', subtitle: 'Don\'t take our word for it' },
    faq: { title: 'Common Questions', subtitle: 'Everything you need to know' },
    cta: { headline: 'Ready to Transform Your Smile?', sub: 'Book your FREE consultation today. No obligation, no pressure.', btn: 'Book My Free Consultation' },
    chat: { placeholder: 'Type your message...', send: 'Send', title: 'Sofia — Smile Advisor', subtitle: 'Replies instantly · Private & secure' },
    booking: { title: 'Book Your Appointment', selectDate: 'Select a Date', selectTime: 'Choose a Time', treatment: 'Treatment', confirm: 'Confirm Booking', success: 'Booking Confirmed!' },
  },
  ar: {
    nav: { services: 'الخدمات', results: 'النتائج', reviews: 'التقييمات', contact: 'اتصل بنا', bookFree: 'احجز استشارة مجانية' },
    hero: {
      badge: 'هارلي ستريت · لندن',
      headline: 'ابتسامتك المثالية',
      headlineSub: 'في انتظارك',
      subtext: 'رعاية أسنان عالمية في قلب لندن. إنفيزالاين وزراعة الأسنان وتجميل الابتسامة — مصممة لك.',
      cta: 'احجز استشارة مجانية',
      ctaSub: 'بدون التزام · دقيقتان فقط',
      stats: { patients: '+12,000 مريض سعيد', rating: '4.9★ تقييم جوجل', experience: '+20 سنة خبرة' },
    },
    services: {
      title: 'علاجات متميزة',
      subtitle: 'مصممة لنتائج دائمة',
      items: {
        invisalign: { name: 'إنفيزالاين', desc: 'تقويم شفاف وقابل للخلع. أسنان مستقيمة بدون تقويم معدني.', from: 'يبدأ من £2,500' },
        implants: { name: 'زراعة الأسنان', desc: 'استبدال دائم للأسنان يبدو ويشعر طبيعياً تماماً.', from: 'يبدأ من £2,200' },
        veneers: { name: 'قشرة البورسلان', desc: 'قشرة سيراميكية رفيعة لابتسامة لا تشوبها شائبة.', from: 'من £800 للسن' },
        whitening: { name: 'تبييض الأسنان', desc: 'علاجات مثبتة سريرياً لأسنان أكثر بياضاً بـ10 درجات.', from: 'يبدأ من £299' },
        composite: { name: 'الحشو التجميلي', desc: 'إعادة تشكيل وإصلاح أسنانك في موعد واحد فقط.', from: 'من £250 للسن' },
        general: { name: 'طب الأسنان العام', desc: 'رعاية شاملة من التنظيف إلى الترميم. صحتك أولاً.', from: 'يبدأ من £95' },
      },
    },
    results: { title: 'تحولات حقيقية', subtitle: 'اكتشف ما هو ممكن' },
    reviews: { title: 'يحبنا الآلاف', subtitle: 'لا تأخذ كلامنا فقط' },
    faq: { title: 'أسئلة شائعة', subtitle: 'كل ما تحتاج معرفته' },
    cta: { headline: 'مستعد لتحويل ابتسامتك؟', sub: 'احجز استشارتك المجانية اليوم. بدون التزام، بدون ضغط.', btn: 'احجز استشارتي المجانية' },
    chat: { placeholder: 'اكتب رسالتك...', send: 'إرسال', title: 'سوفيا — مستشارة الابتسامة', subtitle: 'ترد فوراً · خاص وآمن' },
    booking: { title: 'احجز موعدك', selectDate: 'اختر تاريخاً', selectTime: 'اختر وقتاً', treatment: 'العلاج', confirm: 'تأكيد الحجز', success: 'تم تأكيد الحجز!' },
  },
};

export const useTranslation = (lang = 'en') => {
  const t = (key) => {
    const keys = key.split('.');
    let val = translations[lang] || translations.en;
    for (const k of keys) { val = val?.[k]; }
    return val || key;
  };
  return { t, isRtl: lang === 'ar' };
};
