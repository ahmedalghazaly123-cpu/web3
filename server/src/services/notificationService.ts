import { PrismaClient, Role, Notification as NotificationType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export class NotificationService {
  async create(data: { userId: string; title: string; message: string; category: string; data?: any }) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        category: data.category,
        data: data.data as any,
      },
    });
  }

  async list(userId: string, limit = 50) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async unreadCount(userId: string) {
    return prisma.notification.count({ where: { userId, read: false } });
  }

  async markRead(id: string, userId: string) {
    const notification = await prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) throw new Error('not-found');
    return prisma.notification.update({ where: { id }, data: { read: true } });
  }

  async markAllRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return result.count;
  }
}

export const notificationService = new NotificationService();