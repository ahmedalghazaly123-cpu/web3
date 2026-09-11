export const notifications = {
  subtitleUnread: 'عندك {{count}} إشعارات غير مقروءة',
  subtitleCaughtUp: 'أنت مطلع على كل شيء',
  markAllRead: 'تحديد الكل كمقروء',
  tabs: {
    all: 'الكل',
    unread: 'غير مقروء',
  },
  empty: {
    title: 'لا توجد إشعارات للعرض',
    descUnread: 'قرأت كل الإشعارات — أحسنت!',
    descAll: 'عندما يحدث شيء جديد، سيظهر هنا.',
  },
  categories: {
    learning: 'تعليمي',
    ai: 'ذكاء اصطناعي',
    assessment: 'تقييم',
    system: 'نظام',
  },
  items: [
    { id: '1', title: 'تم إكمال درس', message: 'أكملت «قوانين النهايات الجبرية». أحسنت!', category: 'learning', read: false, time: 'منذ ساعتين' },
    { id: '2', title: 'رسالة جديدة من المدرس الذكي', message: 'للمدرس الذكي اقتراح لتحسين مهاراتك في قاعدة السلسلة.', category: 'ai', read: false, time: 'منذ ٤ ساعات' },
    { id: '3', title: 'نتائج الاختبار متاحة', message: 'نتائج اختبار التفاضل النصفي متاحة الآن.', category: 'assessment', read: true, time: 'منذ يوم' },
    { id: '4', title: 'صيانة النظام', message: 'صيانة مجدولة نهاية هذا الأسبوع الساعة ٢ صباحاً.', category: 'system', read: true, time: 'منذ يومين' },
    { id: '5', title: 'توصية كورس جديد', message: 'بناءً على تقدمك، ننصح بكورس «تفاضل متقدم».', category: 'learning', read: true, time: 'منذ ٣ أيام' },
  ],
};

export type NotificationsType = typeof notifications;