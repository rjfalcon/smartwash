export type MachineType = 'WASHER' | 'DRYER';

export type PaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface Machine {
  id: string;
  name: string;
  type: string; // 'WASHER' | 'DRYER'
  tuyaDeviceId: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  options: PaymentOption[];
  currentSession?: ActiveSession | null;
}

export interface PaymentOption {
  id: string;
  machineId: string;
  label: string;
  duration: number; // minutes
  price: number; // EUR
  sortOrder: number;
  isActive: boolean;
}

export interface Payment {
  id: string;
  machineId: string;
  machine?: { name: string; type: string };
  mollieId: string;
  amount: number;
  duration: number;
  optionLabel: string;
  status: PaymentStatus;
  customerEmail: string | null;
  customerName: string | null;
  startedAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveSession {
  paymentId: string;
  startedAt: string;
  endsAt: string;
  minutesRemaining: number;
  secondsRemaining: number;
}

export interface AppSettings {
  adminPin: string;
  notifyEmails: string;
  parkName: string;
  appName: string;
  baseUrl: string;
  tuyaAutoOff: boolean;
  emailOnPayment: boolean;
}

export interface DashboardStats {
  totalRevenue: number;
  totalPayments: number;
  revenueToday: number;
  paymentsToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
  activeSessions: number;
}

export interface TuyaDeviceStatus {
  online: boolean;
  switchOn: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
