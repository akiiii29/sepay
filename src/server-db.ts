import fs from 'fs';
import path from 'path';

// Define TS Interfaces for durable storage
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
  paymentCode: string; // matches transfer code like "DH123456"
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  createdAt: string;
  paidAt: string | null;
  paymentDetails?: any;
}

export interface TicketData {
  id: string; // short unique code like "TK-ABCD45-01"
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
  id: string; // transaction log ID
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  transferType: string;
  transferAmount: number;
  content: string;
  referenceCode: string;
  code: string; // extracted matching pattern
  createdAt: string;
}

interface DatabaseStructure {
  events: EventData[];
  bookings: BookingData[];
  tickets: TicketData[];
  transactions: SePayTransaction[];
}

const DB_FILE = path.join(process.cwd(), 'database.json');

// Initialize with sample data if file does not exist
const INITIAL_DB: DatabaseStructure = {
  events: [
    {
      id: "ev-01",
      title: "Đại Nhạc Hội 'Sóng Trẻ' 2026",
      date: "12-10-2026",
      startTime: "19:00",
      location: "Sân vận động Mỹ Đình, Hà Nội",
      description: "Đêm nhạc hội bùng nổ của giới trẻ Việt Nam với sự góp mặt của các ca sĩ, rapper hàng đầu. Hệ thống âm thanh, ánh sáng hiện đại đạt chuẩn quốc tế, mang lại trải nghiệm cảm xúc cực đỉnh cùng hàng vạn khán giả.",
      bannerGradient: "linear-gradient(135deg, #1d4ed8 0%, #701a75 50%, #b91c1c 100%)",
      ticketTypes: [
        {
          id: "standard",
          name: "Hạng Vé Thường (GA)",
          price: 2000,
          totalLimit: 500,
          soldCount: 84,
          description: "Khu vực đứng gần sân khấu vừa phải, bầu không khí sôi động, trải nghiệm đắm chìm."
        },
        {
          id: "vip",
          name: "Hạng Vé VIP (Fanzone)",
          price: 2000,
          totalLimit: 120,
          soldCount: 36,
          description: "Khu vực fanzone sát rạt sân khấu, tặng kèm 1 đồ uống, 1 vòng tay phát sáng và quà lưu niệm."
        }
      ]
    },
    {
      id: "ev-02",
      title: "Hội Thảo AI & Công Nghệ FutureTech 2026",
      date: "20-11-2026",
      startTime: "08:30",
      location: "Trung tâm Hội nghị Quốc gia, Hà Nội",
      description: "Diễn đàn hàng đầu về Trí tuệ nhân tạo (AI), Web3 và xu hướng công nghệ tương lai tại Việt Nam. Quy tụ hơn 15 chuyên gia xuất sắc toàn cầu đến từ các tập đoàn Big Tech, mang lại góc nhìn chiến lược thực tế nhất.",
      bannerGradient: "linear-gradient(135deg, #0f172a 0%, #0369a1 100%)",
      ticketTypes: [
        {
          id: "standard",
          name: "Vé Tiêu Chuẩn (Standard Pass)",
          price: 2000,
          totalLimit: 300,
          soldCount: 42,
          description: "Toàn quyền tham dự các phiên trình bày chính của hội thảo, tài liệu PDF sau sự kiện."
        },
        {
          id: "premium",
          name: "Vé Cao Cấp (Premium VIP Pass)",
          price: 2000,
          totalLimit: 80,
          soldCount: 15,
          description: "Ngồi dãy ghế đầu VIP, dùng bữa trưa buffet sang trọng, tham gia tiệc Tea-break networking riêng với chuyên gia."
        }
      ]
    }
  ],
  bookings: [
    {
      id: "BK-82914",
      eventId: "ev-01",
      eventTitle: "Đại Nhạc Hội 'Sóng Trẻ' 2026",
      customerName: "Nguyễn Minh Khang",
      customerEmail: "minhkhang.ng@gmail.com",
      customerPhone: "0912345678",
      ticketType: "VIP",
      pricePerTicket: 2000,
      quantity: 2,
      totalAmount: 4000,
      paymentCode: "DH829140",
      status: "PAID",
      createdAt: "2026-06-11T02:30:00Z",
      paidAt: "2026-06-11T02:35:12Z",
      paymentDetails: {
        gateway: "MBBank",
        referenceCode: "MBB23849182390",
        transferType: "in",
        transferAmount: 4000
      }
    },
    {
      id: "BK-19342",
      eventId: "ev-02",
      eventTitle: "Hội Thảo AI & Công Nghệ FutureTech 2026",
      customerName: "Trần Thị Thu Hương",
      customerEmail: "thuhuong_dev@hotmail.com",
      customerPhone: "0987654321",
      ticketType: "standard",
      pricePerTicket: 2000,
      quantity: 1,
      totalAmount: 2000,
      status: "PENDING",
      createdAt: "2026-06-11T09:10:00Z",
      paidAt: null,
      paymentCode: "DH193420"
    }
  ],
  tickets: [
    {
      id: "TK-82914-01",
      bookingId: "BK-82914",
      eventId: "ev-01",
      eventTitle: "Đại Nhạc Hội 'Sóng Trẻ' 2026",
      customerName: "Nguyễn Minh Khang",
      customerEmail: "minhkhang.ng@gmail.com",
      ticketType: "VIP",
      checkedIn: false,
      checkedInAt: null,
      gateChecked: null
    },
    {
      id: "TK-82914-02",
      bookingId: "BK-82914",
      eventId: "ev-01",
      eventTitle: "Đại Nhạc Hội 'Sóng Trẻ' 2026",
      customerName: "Nguyễn Minh Khang",
      customerEmail: "minhkhang.ng@gmail.com",
      ticketType: "VIP",
      checkedIn: true,
      checkedInAt: "2026-06-11T05:22:15Z",
      gateChecked: "Cổng A"
    }
  ],
  transactions: [
    {
      id: "tx-sepay-1029",
      gateway: "MBBank",
      transactionDate: "2026-06-11 09:35:12",
      accountNumber: "VQRQAJQJY8278",
      transferType: "in",
      transferAmount: 4000,
      content: "Chuyển tiền mua vé DH829140 Minh Khang",
      referenceCode: "MBB23849182390",
      code: "DH829140",
      createdAt: "2026-06-11T02:35:12Z"
    }
  ]
};

// Ensure seed data standard correction
INITIAL_DB.bookings[1].totalAmount = 2000;

function readJson(): DatabaseStructure {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), 'utf-8');
      return INITIAL_DB;
    }
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    if (!content.trim()) {
      return INITIAL_DB;
    }
    return JSON.parse(content);
  } catch (error) {
    console.error("Error reading database file, returning mock data:", error);
    return INITIAL_DB;
  }
}

function writeJson(data: DatabaseStructure): boolean {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error("Error writing database file:", error);
    return false;
  }
}

export const db = {
  getEvents: (): EventData[] => {
    return readJson().events;
  },

  getEventById: (id: string): EventData | undefined => {
    return readJson().events.find(e => e.id === id);
  },

  saveEvents: (events: EventData[]): boolean => {
    const data = readJson();
    data.events = events;
    return writeJson(data);
  },

  getBookings: (): BookingData[] => {
    return readJson().bookings;
  },

  getBookingById: (id: string): BookingData | undefined => {
    return readJson().bookings.find(b => b.id === id);
  },

  addBooking: (booking: BookingData): boolean => {
    const data = readJson();
    
    // Check ticket limit
    const event = data.events.find(e => e.id === booking.eventId);
    if (event) {
      const ticketTypeObj = event.ticketTypes.find(t => t.id === booking.ticketType || t.name === booking.ticketType);
      if (ticketTypeObj) {
        if (ticketTypeObj.soldCount + booking.quantity > ticketTypeObj.totalLimit) {
          // exceeded
          console.warn("Ticket limit exceeded for type", booking.ticketType);
          // Auto block or let it pass for sandbox demos, but best to log
        }
      }
    }

    data.bookings.push(booking);
    return writeJson(data);
  },

  updateBookingStatus: (id: string, status: 'PAID' | 'CANCELLED' | 'PENDING', paymentDetails?: any): BookingData | null => {
    const data = readJson();
    const index = data.bookings.findIndex(b => b.id === id);
    if (index === -1) return null;
    
    const prevStatus = data.bookings[index].status;
    data.bookings[index].status = status;
    
    if (status === 'PAID') {
      data.bookings[index].paidAt = new Date().toISOString();
      if (paymentDetails) {
        data.bookings[index].paymentDetails = paymentDetails;
      }

      // If transition from not paid to paid: update event sold count, and emit virtual tickets
      if (prevStatus !== 'PAID') {
        const booking = data.bookings[index];
        // Increase event counter
        const eventIndex = data.events.findIndex(e => e.id === booking.eventId);
        if (eventIndex !== -1) {
          const tTypeIdx = data.events[eventIndex].ticketTypes.findIndex(
            t => t.id === booking.ticketType || t.name === booking.ticketType
          );
          if (tTypeIdx !== -1) {
            data.events[eventIndex].ticketTypes[tTypeIdx].soldCount += booking.quantity;
          }
        }

        // Generate tickets
        for (let i = 1; i <= booking.quantity; i++) {
          const suffix = i < 10 ? `0${i}` : `${i}`;
          const ticketId = `TK-${booking.id.replace('BK-', '')}-${suffix}`;
          
          // Prevent duplicates
          if (!data.tickets.some(t => t.id === ticketId)) {
            data.tickets.push({
              id: ticketId,
              bookingId: booking.id,
              eventId: booking.eventId,
              eventTitle: booking.eventTitle,
              customerName: booking.customerName,
              customerEmail: booking.customerEmail,
              ticketType: booking.ticketType,
              checkedIn: false,
              checkedInAt: null,
              gateChecked: null
            });
          }
        }
      }
    } else if (status === 'CANCELLED' && prevStatus === 'PAID') {
      // Revert event counter
      const booking = data.bookings[index];
      const eventIndex = data.events.findIndex(e => e.id === booking.eventId);
      if (eventIndex !== -1) {
        const tTypeIdx = data.events[eventIndex].ticketTypes.findIndex(
          t => t.id === booking.ticketType || t.name === booking.ticketType
        );
        if (tTypeIdx !== -1) {
          data.events[eventIndex].ticketTypes[tTypeIdx].soldCount = Math.max(
            0,
            data.events[eventIndex].ticketTypes[tTypeIdx].soldCount - booking.quantity
          );
        }
      }
      // Remove or disable tickets
      data.tickets = data.tickets.filter(t => t.bookingId !== id);
    }

    writeJson(data);
    return data.bookings[index];
  },

  getTickets: (): TicketData[] => {
    return readJson().tickets;
  },

  getTicketById: (id: string): TicketData | undefined => {
    return readJson().tickets.find(t => t.id === id);
  },

  checkInTicket: (id: string, gate: string): { success: boolean; message: string; ticket?: TicketData } => {
    const data = readJson();
    const index = data.tickets.findIndex(t => t.id.toLowerCase() === id.toLowerCase());
    if (index === -1) {
      return { success: false, message: `Mã vé "${id}" không hợp lệ hoặc không tồn tại!` };
    }

    const ticket = data.tickets[index];
    if (ticket.checkedIn) {
      return {
        success: false,
        message: `Vé này đã được soát lúc ${ticket.checkedInAt ? new Date(ticket.checkedInAt).toLocaleTimeString('vi-VN') : 'không rõ'} tại ${ticket.gateChecked || 'Không rõ'}!`,
        ticket
      };
    }

    // Mark as checkedIn
    data.tickets[index].checkedIn = true;
    data.tickets[index].checkedInAt = new Date().toISOString();
    data.tickets[index].gateChecked = gate || "Cổng Chính";
    
    writeJson(data);

    return {
      success: true,
      message: `Soát vé thành công cho: ${ticket.customerName} (${ticket.ticketType.toUpperCase()})`,
      ticket: data.tickets[index]
    };
  },

  getTransactions: (): SePayTransaction[] => {
    return readJson().transactions;
  },

  addTransaction: (tx: SePayTransaction): boolean => {
    const data = readJson();
    data.transactions.unshift(tx); // Newest transaction first
    return writeJson(data);
  },

  // Reset database for demonstration reset action
  resetDb: (): boolean => {
    return writeJson(INITIAL_DB);
  }
};
