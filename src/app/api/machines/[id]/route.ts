import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveSession } from '@/lib/session';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const machine = await db.machine.findUnique({
      where: { id, isActive: true },
      include: {
        options: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!machine) {
      return NextResponse.json(
        { success: false, error: 'Machine niet gevonden' },
        { status: 404 },
      );
    }

    const session = await getActiveSession(id);

    return NextResponse.json({
      success: true,
      data: { ...machine, currentSession: session },
    });
  } catch (err) {
    console.error('[machines/id]', err);
    return NextResponse.json(
      { success: false, error: 'Fout bij ophalen machine' },
      { status: 500 },
    );
  }
}
