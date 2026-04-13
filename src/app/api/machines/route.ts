import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveSession } from '@/lib/session';

export async function GET() {
  try {
    const machines = await db.machine.findMany({
      where: { isActive: true },
      include: {
        options: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const machinesWithStatus = await Promise.all(
      machines.map(async (machine) => {
        const session = await getActiveSession(machine.id);
        return { ...machine, currentSession: session };
      }),
    );

    return NextResponse.json({ success: true, data: machinesWithStatus });
  } catch (err) {
    console.error('[machines]', err);
    return NextResponse.json(
      { success: false, error: 'Fout bij ophalen machines' },
      { status: 500 },
    );
  }
}
