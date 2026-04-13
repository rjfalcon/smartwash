import { cookies } from 'next/headers';
import { db } from './db';

const SESSION_COOKIE = 'smartwash_admin';
const SESSION_VALUE = 'authenticated';
const MAX_AGE = 60 * 60 * 8; // 8 hours

export async function verifyAdminPin(pin: string): Promise<boolean> {
  const settings = await db.appSettings.findUnique({
    where: { id: 'singleton' },
  });

  const correctPin = settings?.adminPin ?? process.env.ADMIN_PIN ?? '1234';
  return pin === correctPin;
}

export async function setAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, SESSION_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value === SESSION_VALUE;
}
