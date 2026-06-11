export interface EventTicketType {
  id: string;
  name: string;
  price: number;
  totalLimit: number;
  soldCount: number;
  description: string;
}

export interface EventData {
  id: string;
  title: string;
  date: string;
  startTime: string;
  location: string;
  description: string;
  bannerGradient: string;
  ticketTypes: EventTicketType[];
}

export interface BookingData {
  id: string;
  eventId: string;
  eventTitle: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  ticketType: string;
  pricePerTicket: number;
  quantity: number;
  totalAmount: number;
  paymentCode: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  createdAt: string;
  paidAt: string | null;
  paymentDetails?: {
    sepayTransactionId?: string;
    gateway?: string;
    referenceCode?: string;
    transferAmount?: number;
    transactionDate?: string;
    simulated?: boolean;
  };
}

export interface TicketData {
  id: string;
  bookingId: string;
  eventId: string;
  eventTitle: string;
  customerName: string;
  customerEmail: string;
  ticketType: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  gateChecked?: string | null;
}

export interface SePayTransaction {
  id: string;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  transferType: string;
  transferAmount: number;
  content: string;
  referenceCode: string;
  code: string;
  createdAt: string;
}

export interface UserRoleData {
  email: string;
  role: 'admin' | 'staff';
  password?: string | null;
  createdAt: string;
}

