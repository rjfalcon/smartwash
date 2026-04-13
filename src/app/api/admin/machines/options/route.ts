import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';

export async function POST(request: NextRequest) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ success: false, error: 'Niet ingelogd' }, { status: 401 });
  }

  try {
    const body = await request.json() as {
      machineId: string;
      label: string;
      duration: number;
      price: number;
      sortOrder?: number;
    };

    const { machineId, label, duration, price, sortOrder = 0 } = body;

    if (!machineId || !label || !duration || !price) {
      return NextResponse.json(
        { success: false, error: 'Alle velden zijn verplicht' },
        { status: 400 },
      );
    }

    const option = await db.paymentOption.create({
      data: { machineId, label, duration, price, sortOrder },
    });

    return NextResponse.json({ success: true, data: option });
  } catch (err) {
    console.error('[admin/options POST]', err);
    return NextResponse.json(
      { success: false, error: 'Fout bij aanmaken optie' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ success: false, error: 'Niet ingelogd' }, { status: 401 });
  }

  try {
    const body = await request.json() as {
      id: string;
      label?: string;
      duration?: number;
      price?: number;
      sortOrder?: number;
      isActive?: boolean;
    };

    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Optie ID is verplicht' },
        { status: 400 },
      );
    }

    const option = await db.paymentOption.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: option });
  } catch (err) {
    console.error('[admin/options PATCH]', err);
    return NextResponse.json(
      { success: false, error: 'Fout bij opslaan optie' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ success: false, error: 'Niet ingelogd' }, { status: 401 });
  }

  try {
    const { id } = await request.json() as { id: string };

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Optie ID is verplicht' },
        { status: 400 },
      );
    }

    await db.paymentOption.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/options DELETE]', err);
    return NextResponse.json(
      { success: false, error: 'Fout bij verwijderen optie' },
      { status: 500 },
    );
  }
}
