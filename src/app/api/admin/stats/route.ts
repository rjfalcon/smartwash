import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';
import { startOfDay, startOfWeek, startOfMonth } from 'date-fns';

export async function GET() {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ success: false, error: 'Niet ingelogd' }, { status: 401 });
  }

  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);

    const paidStatuses = ['PAID', 'ACTIVE', 'COMPLETED'];

    const [
      totalRevenue,
      totalPayments,
      revenueToday,
      paymentsToday,
      revenueThisWeek,
      revenueThisMonth,
      activeSessions,
      recentPayments,
    ] = await Promise.all([
      // Total revenue
      db.payment.aggregate({
        where: { status: { in: paidStatuses } },
        _sum: { amount: true },
      }),
      // Total payments
      db.payment.count({ where: { status: { in: paidStatuses } } }),
      // Revenue today
      db.payment.aggregate({
        where: {
          status: { in: paidStatuses },
          createdAt: { gte: todayStart },
        },
        _sum: { amount: true },
      }),
      // Payments today
      db.payment.count({
        where: {
          status: { in: paidStatuses },
          createdAt: { gte: todayStart },
        },
      }),
      // Revenue this week
      db.payment.aggregate({
        where: {
          status: { in: paidStatuses },
          createdAt: { gte: weekStart },
        },
        _sum: { amount: true },
      }),
      // Revenue this month
      db.payment.aggregate({
        where: {
          status: { in: paidStatuses },
          createdAt: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
      // Active sessions
      db.payment.count({
        where: {
          status: 'ACTIVE',
          endsAt: { gt: now },
        },
      }),
      // Recent payments
      db.payment.findMany({
        where: { status: { in: paidStatuses } },
        include: { machine: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue: totalRevenue._sum.amount ?? 0,
        totalPayments,
        revenueToday: revenueToday._sum.amount ?? 0,
        paymentsToday,
        revenueThisWeek: revenueThisWeek._sum.amount ?? 0,
        revenueThisMonth: revenueThisMonth._sum.amount ?? 0,
        activeSessions,
        recentPayments,
      },
    });
  } catch (err) {
    console.error('[admin/stats]', err);
    return NextResponse.json(
      { success: false, error: 'Fout bij ophalen statistieken' },
      { status: 500 },
    );
  }
}
