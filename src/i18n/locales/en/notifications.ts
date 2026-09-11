export const notifications = {
  subtitleUnread: 'You have {{count}} unread notifications',
  subtitleCaughtUp: 'You are all caught up',
  markAllRead: 'Mark all as read',
  tabs: {
    all: 'All',
    unread: 'Unread',
  },
  empty: {
    title: 'No notifications to show',
    descUnread: 'You have read everything — nice work staying on top of things!',
    descAll: 'When something new happens, it will appear here.',
  },
  categories: {
    learning: 'Learning',
    ai: 'AI',
    assessment: 'Assessment',
    system: 'System',
  },
  items: [
    { id: '1', title: 'Lesson completed', message: 'You completed "Algebraic Limit Laws". Great job!', category: 'learning', read: false, time: '2 hours ago' },
    { id: '2', title: 'AI Tutor new message', message: 'Your AI Tutor has a suggestion for improving your chain rule skills.', category: 'ai', read: false, time: '4 hours ago' },
    { id: '3', title: 'Quiz results available', message: 'Your Calculus Midterm results are now available.', category: 'assessment', read: true, time: '1 day ago' },
    { id: '4', title: 'System maintenance', message: 'Scheduled maintenance this weekend at 2 AM.', category: 'system', read: true, time: '2 days ago' },
    { id: '5', title: 'New course recommendation', message: 'Based on your progress, we recommend "Advanced Calculus".', category: 'learning', read: true, time: '3 days ago' },
  ],
};

export type NotificationsType = typeof notifications;