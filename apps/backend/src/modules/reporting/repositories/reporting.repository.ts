import { Injectable } from '@nestjs/common';
import { BookingStatus, Prisma, Role } from '@prisma/client';

import { PrismaService } from '../../../common/database/prisma.service';

@Injectable()
export class ReportingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getRevenueMetrics(where: Prisma.BookingWhereInput) {
    const revenue = await this.prisma.payment.aggregate({
      where: {
        createdAt: where.createdAt as Prisma.DateTimeFilter<'Payment'> | undefined,
        status: 'CAPTURED' 
      },
      _sum: { amount: true },
    });
    return revenue._sum.amount ?? 0;
  }

  async getBookingMetrics(where: Prisma.BookingWhereInput) {
    const [total, byStatus, bookingsWithCategory] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.booking.findMany({
        where,
        select: { subService: { select: { categoryId: true, category: { select: { name: true } } } } },
      }),
    ]);

    const categoryCounts: Record<string, { name: string; count: number }> = {};
    for (const b of bookingsWithCategory) {
      const id = b.subService.categoryId;
      const name = b.subService.category.name;
      if (!categoryCounts[id]) {
        categoryCounts[id] = { name, count: 0 };
      }
      categoryCounts[id].count++;
    }

    const popularCategories = Object.values(categoryCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { total, byStatus, popularCategories };
  }

  async getCustomerMetrics(whereUser: Prisma.UserWhereInput, whereCustomer: Prisma.CustomerWhereInput) {
    const [totalUsers, activeCustomers] = await Promise.all([
      this.prisma.user.count({ where: { ...whereUser, role: Role.CUSTOMER } }),
      this.prisma.customer.count({ where: whereCustomer }),
    ]);
    
    // Calculate new vs returning based on bookings
    const customerBookings = await this.prisma.booking.groupBy({
      by: ['customerId'],
      where: { customer: whereCustomer },
      _count: true,
    });

    let returning = 0;
    let newCustomers = 0;
    for (const cb of customerBookings) {
      if (cb._count > 1) {
        returning++;
      } else {
        newCustomers++;
      }
    }

    return { totalUsers, activeCustomers, newCustomers, returningCustomers: returning };
  }

  async getTechnicianMetrics(where: Prisma.TechnicianWhereInput) {
    const [total, byVerification, topPerformers] = await Promise.all([
      this.prisma.technician.count({ where }),
      this.prisma.technician.groupBy({
        by: ['verificationStatus'],
        where,
        _count: true,
      }),
      this.prisma.technician.findMany({
        where,
        select: {
          id: true,
          rating: true,
          totalJobs: true,
          user: { select: { name: true } },
        },
        orderBy: [{ rating: 'desc' }, { totalJobs: 'desc' }],
        take: 10,
      }),
    ]);

    return { total, byVerification, topPerformers };
  }

  async getPaymentMetrics(where: Prisma.PaymentWhereInput) {
    const [byStatus, totalAmount] = await Promise.all([
      this.prisma.payment.groupBy({
        by: ['status'],
        where,
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { ...where, status: 'CAPTURED' },
        _sum: { amount: true },
      }),
    ]);

    return { byStatus, totalCaptured: totalAmount._sum.amount ?? 0 };
  }

  async getCancellationMetrics(where: Prisma.BookingWhereInput) {
    const cancellations = await this.prisma.booking.findMany({
      where: { ...where, status: BookingStatus.CANCELLED },
      select: { cancelReason: true },
    });

    const byReason: Record<string, number> = {};
    for (const c of cancellations) {
      const reason = c.cancelReason || 'Unknown';
      byReason[reason] = (byReason[reason] || 0) + 1;
    }

    return {
      totalCancellations: cancellations.length,
      byReason,
    };
  }

  async getGrowthMetrics(startDate: Date, endDate: Date, groupBy: string = 'month') {
    const whereDate = { gte: startDate, lte: endDate };

    const [bookings, customers, technicians, payments] = await Promise.all([
      this.prisma.booking.findMany({
        where: { createdAt: whereDate },
        select: { createdAt: true, totalAmount: true, status: true },
      }),
      this.prisma.customer.findMany({
        where: { createdAt: whereDate },
        select: { createdAt: true },
      }),
      this.prisma.technician.findMany({
        where: { createdAt: whereDate },
        select: { createdAt: true },
      }),
      this.prisma.payment.findMany({
        where: { createdAt: whereDate, status: 'CAPTURED' },
        select: { createdAt: true, amount: true },
      }),
    ]);

    const groupedData: Record<string, any> = {};

    const getGroupKey = (date: Date) => {
      if (groupBy === 'day') return date.toISOString().split('T')[0];
      if (groupBy === 'week') {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
      }
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    };

    const initGroup = (key: string) => {
      if (!groupedData[key]) {
        groupedData[key] = { date: key, bookings: 0, revenue: 0, customers: 0, technicians: 0, payments: 0, cancellations: 0, growth: 0 };
      }
    };

    for (const b of bookings) {
      const key = getGroupKey(b.createdAt);
      initGroup(key);
      groupedData[key].bookings++;
      groupedData[key].growth++;
      if (b.status === BookingStatus.CANCELLED) {
        groupedData[key].cancellations++;
      }
    }

    for (const c of customers) {
      const key = getGroupKey(c.createdAt);
      initGroup(key);
      groupedData[key].customers++;
    }

    for (const t of technicians) {
      const key = getGroupKey(t.createdAt);
      initGroup(key);
      groupedData[key].technicians++;
    }

    for (const p of payments) {
      const key = getGroupKey(p.createdAt);
      initGroup(key);
      const amount = Number(p.amount);
      groupedData[key].payments += amount;
      groupedData[key].revenue += amount;
    }

    return Object.values(groupedData).sort((a, b) => a.date.localeCompare(b.date));
  }
}
