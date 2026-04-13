import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default settings
  await prisma.appSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      adminPin: process.env.ADMIN_PIN ?? '1234',
      notifyEmails: '',
      parkName: 'Ons Park',
      appName: 'SmartWash',
      baseUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    },
  });

  // Create washing machine
  const washer = await prisma.machine.upsert({
    where: { id: 'washer' },
    update: {},
    create: {
      id: 'washer',
      name: 'Wasmachine',
      type: 'WASHER',
      tuyaDeviceId: process.env.TUYA_DEVICE_WASHER ?? 'TUYA_DEVICE_ID_HIER',
      description: 'Wasmachine op het park',
      sortOrder: 1,
    },
  });

  // Create dryer
  const dryer = await prisma.machine.upsert({
    where: { id: 'dryer' },
    update: {},
    create: {
      id: 'dryer',
      name: 'Droger',
      type: 'DRYER',
      tuyaDeviceId: process.env.TUYA_DEVICE_DRYER ?? 'TUYA_DEVICE_ID_HIER',
      description: 'Droger op het park',
      sortOrder: 2,
    },
  });

  // Default options for washer
  const washerOptions = [
    { label: '30 minuten', duration: 30, price: 2.0, sortOrder: 1 },
    { label: '60 minuten', duration: 60, price: 3.5, sortOrder: 2 },
    { label: '90 minuten', duration: 90, price: 4.5, sortOrder: 3 },
  ];

  for (const opt of washerOptions) {
    await prisma.paymentOption.create({
      data: { machineId: washer.id, ...opt },
    });
  }

  // Default options for dryer
  const dryerOptions = [
    { label: '30 minuten', duration: 30, price: 1.5, sortOrder: 1 },
    { label: '60 minuten', duration: 60, price: 2.5, sortOrder: 2 },
    { label: '90 minuten', duration: 90, price: 3.5, sortOrder: 3 },
  ];

  for (const opt of dryerOptions) {
    await prisma.paymentOption.create({
      data: { machineId: dryer.id, ...opt },
    });
  }

  console.log('Database seeded!');
  console.log('- Wasmachine aangemaakt met 3 opties');
  console.log('- Droger aangemaakt met 3 opties');
  console.log('- Instellingen aangemaakt');
  console.log('');
  console.log('Vergeet niet de Tuya Device IDs in te vullen via het admin paneel!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
