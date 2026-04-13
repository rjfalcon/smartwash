import type { Metadata, Viewport } from 'next';
import './globals.css';
import { db } from '@/lib/db';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0ea5e9',
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await db.appSettings.findUnique({
    where: { id: 'singleton' },
  }).catch(() => null);

  const appName = settings?.appName ?? 'SmartWash';
  const parkName = settings?.parkName ?? 'Ons Park';

  return {
    title: {
      default: appName,
      template: `%s | ${appName}`,
    },
    description: `Betaal eenvoudig voor de was- en droogmachines bij ${parkName}`,
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body className="bg-slate-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
