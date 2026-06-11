import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import { sendBookingEmail } from './mail-service';

dotenv.config();

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

export interface UserRoleData {
  email: string;
  role: 'admin' | 'staff';
  password?: string | null;
  createdAt: string;
}

interface DatabaseStructure {
  events: EventData[];
  bookings: BookingData[];
  tickets: TicketData[];
  transactions: SePayTransaction[];
  users: UserRoleData[];
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
  ],
  users: [
    {
      email: "hoangnk2712@gmail.com",
      role: "admin",
      password: "akiiiii29",
      createdAt: "2026-06-11T00:00:00Z"
    }
  ]
};

// Setup Firebase connection if configured
const useFirebase = !!(process.env.FIREBASE_PROJECT_ID);
let firestore: Firestore | null = null;

// Helper to get safe firestore doc reference
function getDocRef(collectionName: string, id: any) {
  if (!firestore) {
    throw new Error("Firestore is not initialized");
  }
  const cleanId = id ? String(id).trim() : "";
  if (!cleanId) {
    throw new Error(`Invalid Firestore document path: Collection '${collectionName}' requires a non-empty string ID, got '${id}'`);
  }
  if (cleanId === "undefined" || cleanId === "null") {
    throw new Error(`Invalid Firestore document path: Collection '${collectionName}' received invalid placeholder ID '${cleanId}'`);
  }
  return firestore.collection(collectionName).doc(cleanId);
}

if (useFirebase) {
  try {
    const config: any = {};
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      config.credential = cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
    } else {
      config.projectId = process.env.FIREBASE_PROJECT_ID;
    }
    
    if (getApps().length === 0) {
      initializeApp(config);
    }
    firestore = getFirestore();
    console.log(`[Firebase]: Connection established successfully with Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
    
    // Asynchronously seed database if empty
    seedFirebaseDbIfNeeded();
  } catch (error) {
    console.error("[Firebase]: Configuration failed. Falling back to local database.json", error);
    firestore = null;
  }
} else {
  console.log("[Firebase]: No FIREBASE_PROJECT_ID environment variable. Running in LOCAL database mode.");
}

async function seedFirebaseDbIfNeeded() {
  if (!firestore) return;
  try {
    const eventsSnapshot = await firestore.collection('events').limit(1).get();
    if (eventsSnapshot.empty) {
      console.log("[Firebase]: Database is empty. Seeding events, bookings, tickets, and transactions...");
      
      const batch = firestore.batch();
      
      for (const event of INITIAL_DB.events) {
        batch.set(getDocRef('events', event.id), event);
      }
      
      for (const booking of INITIAL_DB.bookings) {
        batch.set(getDocRef('bookings', booking.id), booking);
      }
      
      for (const ticket of INITIAL_DB.tickets) {
        batch.set(getDocRef('tickets', ticket.id), ticket);
      }
      
      for (const transaction of INITIAL_DB.transactions) {
        batch.set(getDocRef('transactions', transaction.id), transaction);
      }
      
      await batch.commit();
      console.log("[Firebase]: Data seeding completed successfully.");
    }

    // Seed default admin
    const adminDoc = await getDocRef('users', 'hoangnk2712@gmail.com').get();
    if (!adminDoc.exists) {
      console.log("[Firebase]: Seeding default admin hoangnk2712@gmail.com...");
      await getDocRef('users', 'hoangnk2712@gmail.com').set({
        email: "hoangnk2712@gmail.com",
        role: "admin",
        password: "akiiiii29",
        createdAt: new Date().toISOString()
      });
    } else {
      // Ensure password is set correctly for admin
      const data = adminDoc.data() as UserRoleData;
      if (data.password !== 'akiiiii29') {
        await getDocRef('users', 'hoangnk2712@gmail.com').update({ password: 'akiiiii29' });
      }
    }
  } catch (error) {
    console.error("[Firebase]: Failed to seed database:", error);
  }
}

// Local JSON file database logic
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
    const parsed = JSON.parse(content);
    if (!parsed.users) {
      parsed.users = INITIAL_DB.users;
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
    } else {
      // Ensure default admin has password set in local file too
      const idx = parsed.users.findIndex((u: any) => u.email.toLowerCase() === 'hoangnk2712@gmail.com');
      if (idx !== -1 && parsed.users[idx].password !== 'akiiiii29') {
        parsed.users[idx].password = 'akiiiii29';
        fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
      }
    }
    return parsed;
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

const EXPIRY_TIME = 15 * 60 * 1000; // 15 minutes

async function checkAndExpireBooking(booking: BookingData): Promise<BookingData> {
  if (booking.status === 'PENDING') {
    const createdAtTime = new Date(booking.createdAt).getTime();
    if (Date.now() - createdAtTime > EXPIRY_TIME) {
      console.log(`[Lazy Expiry]: Booking ${booking.id} has expired. Cancelling dynamically...`);
      const updated = await db.updateBookingStatus(booking.id, 'CANCELLED');
      return updated || { ...booking, status: 'CANCELLED' };
    }
  }
  return booking;
}

export const db = {
  getEvents: async (): Promise<EventData[]> => {
    if (firestore) {
      const snapshot = await firestore.collection('events').get();
      return snapshot.docs.map(doc => doc.data() as EventData);
    }
    return readJson().events;
  },

  getEventById: async (id: string): Promise<EventData | undefined> => {
    if (firestore) {
      try {
        const doc = await getDocRef('events', id).get();
        return doc.exists ? (doc.data() as EventData) : undefined;
      } catch (err) {
        console.error(`[db.getEventById] Error fetching event with ID '${id}':`, err);
        return undefined;
      }
    }
    return readJson().events.find(e => e.id === id);
  },

  saveEvents: async (events: EventData[]): Promise<boolean> => {
    if (firestore) {
      const batch = firestore.batch();
      for (const event of events) {
        batch.set(getDocRef('events', event.id), event);
      }
      await batch.commit();
      return true;
    }
    const data = readJson();
    data.events = events;
    return writeJson(data);
  },

  getBookings: async (): Promise<BookingData[]> => {
    if (firestore) {
      const snapshot = await firestore.collection('bookings').get();
      const bookings = snapshot.docs.map(doc => doc.data() as BookingData);
      
      const checkedBookings: BookingData[] = [];
      for (const booking of bookings) {
        checkedBookings.push(await checkAndExpireBooking(booking));
      }
      return checkedBookings;
    }
    
    const data = readJson();
    const checkedBookings: BookingData[] = [];
    for (const booking of data.bookings) {
      checkedBookings.push(await checkAndExpireBooking(booking));
    }
    return checkedBookings;
  },

  getBookingById: async (id: string): Promise<BookingData | undefined> => {
    if (firestore) {
      try {
        const doc = await getDocRef('bookings', id).get();
        if (!doc.exists) return undefined;
        const booking = doc.data() as BookingData;
        return await checkAndExpireBooking(booking);
      } catch (err) {
        console.error(`[db.getBookingById] Error fetching booking with ID '${id}':`, err);
        return undefined;
      }
    }
    
    const data = readJson();
    const booking = data.bookings.find(b => b.id === id);
    if (!booking) return undefined;
    return await checkAndExpireBooking(booking);
  },

  addBooking: async (booking: BookingData): Promise<boolean> => {
    if (firestore) {
      const docId = booking.id ? String(booking.id) : `BK-${Date.now()}`;
      // Check ticket limit
      if (booking.eventId && String(booking.eventId).trim() !== "") {
        try {
          const eventDoc = await getDocRef('events', booking.eventId).get();
          if (eventDoc.exists) {
            const event = eventDoc.data() as EventData;
            const ticketTypeObj = event.ticketTypes.find(t => t.id === booking.ticketType || t.name === booking.ticketType);
            if (ticketTypeObj) {
              if (ticketTypeObj.soldCount + booking.quantity > ticketTypeObj.totalLimit) {
                console.warn("Ticket limit exceeded for type", booking.ticketType);
              }
            }
          }
        } catch (err) {
          console.error(`[db.addBooking] Error loading event ${booking.eventId}:`, err);
        }
      }
      await getDocRef('bookings', docId).set(booking);
      return true;
    }
    
    const data = readJson();
    // Check ticket limit
    const event = data.events.find(e => e.id === booking.eventId);
    if (event) {
      const ticketTypeObj = event.ticketTypes.find(t => t.id === booking.ticketType || t.name === booking.ticketType);
      if (ticketTypeObj) {
        if (ticketTypeObj.soldCount + booking.quantity > ticketTypeObj.totalLimit) {
          console.warn("Ticket limit exceeded for type", booking.ticketType);
        }
      }
    }
    data.bookings.push(booking);
    return writeJson(data);
  },

  updateBookingStatus: async (
    id: string, 
    status: 'PAID' | 'CANCELLED' | 'PENDING', 
    paymentDetails?: any
  ): Promise<BookingData | null> => {
    if (firestore) {
      if (!id || String(id).trim() === "") return null;
      const bookingRef = getDocRef('bookings', id);
      
      const result = await firestore.runTransaction(async (transaction) => {
        const bookingDoc = await transaction.get(bookingRef);
        if (!bookingDoc.exists) return null;
        
        const booking = bookingDoc.data() as BookingData;
        const prevStatus = booking.status;
        
        const updatedBooking: BookingData = {
          ...booking,
          status,
          paidAt: status === 'PAID' ? new Date().toISOString() : booking.paidAt,
          paymentDetails: paymentDetails || booking.paymentDetails || null
        };
        
        transaction.set(bookingRef, updatedBooking);
        
        if (status === 'PAID' && prevStatus !== 'PAID') {
          // Increase event counter
          if (booking.eventId && String(booking.eventId).trim() !== "") {
            try {
              const eventRef = getDocRef('events', booking.eventId);
              const eventDoc = await transaction.get(eventRef);
              if (eventDoc.exists) {
                const event = eventDoc.data() as EventData;
                const tTypeIdx = event.ticketTypes.findIndex(
                  t => t.id === booking.ticketType || t.name === booking.ticketType
                );
                if (tTypeIdx !== -1) {
                  event.ticketTypes[tTypeIdx].soldCount += booking.quantity;
                  transaction.set(eventRef, event);
                }
              }
            } catch (err) {
              console.error(`[db.updateBookingStatus] Failed to update event seat count inside transaction:`, err);
            }
          }
          
          // Generate tickets inside transactions
          for (let i = 1; i <= booking.quantity; i++) {
            const suffix = i < 10 ? `0${i}` : `${i}`;
            const ticketId = `TK-${booking.id.replace('BK-', '')}-${suffix}`;
            const ticketRef = getDocRef('tickets', ticketId);
            
            const newTicket: TicketData = {
              id: ticketId,
              bookingId: booking.id,
              eventId: booking.eventId || "",
              eventTitle: booking.eventTitle,
              customerName: booking.customerName,
              customerEmail: booking.customerEmail,
              ticketType: booking.ticketType,
              checkedIn: false,
              checkedInAt: null,
              gateChecked: null
            };
            transaction.set(ticketRef, newTicket);
          }
        } else if (status === 'CANCELLED' && prevStatus === 'PAID') {
          // Revert event counter
          if (booking.eventId && String(booking.eventId).trim() !== "") {
            try {
              const eventRef = getDocRef('events', booking.eventId);
              const eventDoc = await transaction.get(eventRef);
              if (eventDoc.exists) {
                const event = eventDoc.data() as EventData;
                const tTypeIdx = event.ticketTypes.findIndex(
                  t => t.id === booking.ticketType || t.name === booking.ticketType
                );
                if (tTypeIdx !== -1) {
                  event.ticketTypes[tTypeIdx].soldCount = Math.max(
                    0,
                    event.ticketTypes[tTypeIdx].soldCount - booking.quantity
                  );
                  transaction.set(eventRef, event);
                }
              }
            } catch (err) {
              console.error(`[db.updateBookingStatus] Failed to revert event seat count inside transaction:`, err);
            }
          }
        }
        
        return updatedBooking;
      });
      
      if (status === 'CANCELLED' && result) {
        // Clean up tickets
        const ticketsSnapshot = await firestore.collection('tickets').where('bookingId', '==', String(id)).get();
        const batch = firestore.batch();
        ticketsSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }

      if (status === 'PAID' && result) {
        // Get tickets and send confirmation email
        const ticketsSnapshot = await firestore.collection('tickets').where('bookingId', '==', String(id)).get();
        const tickets = ticketsSnapshot.docs.map(doc => doc.data() as TicketData);
        await sendBookingEmail(result, tickets);
      }
      
      return result;
    }
    
    // Local DB Fallback
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
      
      if (prevStatus !== 'PAID') {
        const booking = data.bookings[index];
        const eventIndex = data.events.findIndex(e => e.id === booking.eventId);
        if (eventIndex !== -1) {
          const tTypeIdx = data.events[eventIndex].ticketTypes.findIndex(
            t => t.id === booking.ticketType || t.name === booking.ticketType
          );
          if (tTypeIdx !== -1) {
            data.events[eventIndex].ticketTypes[tTypeIdx].soldCount += booking.quantity;
          }
        }
        
        const generatedTickets: TicketData[] = [];
        for (let i = 1; i <= booking.quantity; i++) {
          const suffix = i < 10 ? `0${i}` : `${i}`;
          const ticketId = `TK-${booking.id.replace('BK-', '')}-${suffix}`;
          
          if (!data.tickets.some(t => t.id === ticketId)) {
            const tk: TicketData = {
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
            };
            data.tickets.push(tk);
            generatedTickets.push(tk);
          }
        }
        writeJson(data);
        
        // Send email
        await sendBookingEmail(data.bookings[index], generatedTickets);
      }
    } else if (status === 'CANCELLED' && prevStatus === 'PAID') {
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
      data.tickets = data.tickets.filter(t => t.bookingId !== id);
      writeJson(data);
    } else {
      writeJson(data);
    }
    
    return data.bookings[index];
  },

  getTickets: async (): Promise<TicketData[]> => {
    if (firestore) {
      const snapshot = await firestore.collection('tickets').get();
      return snapshot.docs.map(doc => doc.data() as TicketData);
    }
    return readJson().tickets;
  },

  getTicketById: async (id: string): Promise<TicketData | undefined> => {
    if (firestore) {
      try {
        const doc = await getDocRef('tickets', id).get();
        return doc.exists ? (doc.data() as TicketData) : undefined;
      } catch (err) {
        console.error(`[db.getTicketById] Error fetching ticket with ID '${id}':`, err);
        return undefined;
      }
    }
    return readJson().tickets.find(t => t.id === id);
  },

  checkInTicket: async (id: string, gate: string): Promise<{ success: boolean; message: string; ticket?: TicketData }> => {
    if (firestore) {
      if (!id || String(id).trim() === "") return { success: false, message: "Mã vé không hợp lệ." };
      try {
        const ticketRef = getDocRef('tickets', id);
        
        return await firestore.runTransaction(async (transaction) => {
          const ticketDoc = await transaction.get(ticketRef);
          if (!ticketDoc.exists) {
            return { success: false, message: `Mã vé "${id}" không hợp lệ hoặc không tồn tại!` };
          }
          
          const ticket = ticketDoc.data() as TicketData;
          if (ticket.checkedIn) {
            return {
              success: false,
              message: `Vé này đã được soát lúc ${ticket.checkedInAt ? new Date(ticket.checkedInAt).toLocaleTimeString('vi-VN') : 'không rõ'} tại ${ticket.gateChecked || 'Không rõ'}!`,
              ticket
            };
          }
          
          const updatedTicket: TicketData = {
            ...ticket,
            checkedIn: true,
            checkedInAt: new Date().toISOString(),
            gateChecked: gate || "Cổng Chính"
          };
          
          transaction.set(ticketRef, updatedTicket);
          return {
            success: true,
            message: `Soát vé thành công cho: ${ticket.customerName} (${ticket.ticketType.toUpperCase()})`,
            ticket: updatedTicket
          };
        });
      } catch (err: any) {
        console.error(`[db.checkInTicket] Transaction failed:`, err);
        return { success: false, message: `Lỗi hệ thống khi soát vé: ${err.message}` };
      }
    }
    
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

  getEventsStatus: async (): Promise<any> => {
    return [];
  },

  getTransactions: async (): Promise<SePayTransaction[]> => {
    if (firestore) {
      const snapshot = await firestore.collection('transactions').get();
      const txs = snapshot.docs.map(doc => doc.data() as SePayTransaction);
      return txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return readJson().transactions;
  },

  addTransaction: async (tx: SePayTransaction): Promise<boolean> => {
    if (firestore) {
      try {
        const docId = tx.id ? String(tx.id) : `sepay-${Date.now()}`;
        await getDocRef('transactions', docId).set(tx);
        return true;
      } catch (err) {
        console.error(`[db.addTransaction] Error saving transaction with ID '${tx.id}':`, err);
        return false;
      }
    }
    const data = readJson();
    data.transactions.unshift(tx);
    return writeJson(data);
  },

  getUsers: async (): Promise<UserRoleData[]> => {
    if (firestore) {
      const snapshot = await firestore.collection('users').get();
      return snapshot.docs.map(doc => doc.data() as UserRoleData);
    }
    const data = readJson();
    if (!data.users) data.users = [];
    return data.users;
  },

  addUserRole: async (email: string, role: 'admin' | 'staff'): Promise<boolean> => {
    const emailLower = email ? String(email).toLowerCase().trim() : "";
    if (!emailLower) return false;
    if (firestore) {
      try {
        await getDocRef('users', emailLower).set({
          email: emailLower,
          role,
          password: null, // password will be set on first login
          createdAt: new Date().toISOString()
        });
        return true;
      } catch (err) {
        console.error(`[db.addUserRole] Error adding user ${emailLower}:`, err);
        return false;
      }
    }
    const data = readJson();
    if (!data.users) data.users = [];
    
    const index = data.users.findIndex(u => u.email.toLowerCase() === emailLower);
    if (index !== -1) {
      data.users[index].role = role;
    } else {
      data.users.push({
        email: emailLower,
        role,
        password: null,
        createdAt: new Date().toISOString()
      });
    }
    return writeJson(data);
  },

  removeUserRole: async (email: string): Promise<boolean> => {
    const emailLower = email ? String(email).toLowerCase().trim() : "";
    if (!emailLower) return false;
    if (firestore) {
      try {
        await getDocRef('users', emailLower).delete();
        return true;
      } catch (err) {
        console.error(`[db.removeUserRole] Error deleting user ${emailLower}:`, err);
        return false;
      }
    }
    const data = readJson();
    if (!data.users) data.users = [];
    data.users = data.users.filter(u => u.email.toLowerCase() !== emailLower);
    return writeJson(data);
  },

  setUserPassword: async (email: string, password: string): Promise<boolean> => {
    const emailLower = email ? String(email).toLowerCase().trim() : "";
    if (!emailLower) return false;
    if (firestore) {
      try {
        await getDocRef('users', emailLower).update({ password });
        return true;
      } catch (err) {
        console.error(`[db.setUserPassword] Error setting password for user ${emailLower}:`, err);
        return false;
      }
    }
    const data = readJson();
    if (!data.users) data.users = [];
    const index = data.users.findIndex(u => u.email.toLowerCase() === emailLower);
    if (index !== -1) {
      data.users[index].password = password;
      return writeJson(data);
    }
    return false;
  },

  resetDb: async (): Promise<boolean> => {
    if (firestore) {
      console.log("[Firebase]: Resetting Firestore to initial DB state...");
      try {
        const batch = firestore.batch();
        
        const bookings = await firestore.collection('bookings').get();
        bookings.docs.forEach(doc => batch.delete(doc.ref));
        
        const tickets = await firestore.collection('tickets').get();
        tickets.docs.forEach(doc => batch.delete(doc.ref));
        
        const txs = await firestore.collection('transactions').get();
        txs.docs.forEach(doc => batch.delete(doc.ref));
        
        const events = await firestore.collection('events').get();
        events.docs.forEach(doc => batch.delete(doc.ref));
        
        const users = await firestore.collection('users').get();
        users.docs.forEach(doc => batch.delete(doc.ref));
        
        await batch.commit();
        
        for (const event of INITIAL_DB.events) {
          const eventCopy = JSON.parse(JSON.stringify(event));
          eventCopy.ticketTypes.forEach((t: any) => t.soldCount = 0);
          await getDocRef('events', event.id).set(eventCopy);
        }
        
        for (const booking of INITIAL_DB.bookings) {
          await getDocRef('bookings', booking.id).set(booking);
        }
        for (const ticket of INITIAL_DB.tickets) {
          await getDocRef('tickets', ticket.id).set(ticket);
        }
        for (const tx of INITIAL_DB.transactions) {
          await getDocRef('transactions', tx.id).set(tx);
        }
        // Re-seed default admin user with default password
        await getDocRef('users', 'hoangnk2712@gmail.com').set({
          email: "hoangnk2712@gmail.com",
          role: "admin",
          password: "akiiiii29",
          createdAt: new Date().toISOString()
        });
        
        console.log("[Firebase]: Firestore database reset completed.");
        return true;
      } catch (err) {
        console.error("[Firebase]: Reset DB failed:", err);
        return false;
      }
    }
    
    const resetData = JSON.parse(JSON.stringify(INITIAL_DB));
    resetData.users = [
      {
        email: "hoangnk2712@gmail.com",
        role: "admin",
        password: "akiiiii29",
        createdAt: new Date().toISOString()
      }
    ];
    return writeJson(resetData);
  },

  clearTransactionsAndBookings: async (): Promise<boolean> => {
    if (firestore) {
      console.log("[Firebase]: Clearing bookings, tickets, and transactions...");
      try {
        const batch = firestore.batch();
        
        const bookings = await firestore.collection('bookings').get();
        bookings.docs.forEach(doc => batch.delete(doc.ref));
        
        const tickets = await firestore.collection('tickets').get();
        tickets.docs.forEach(doc => batch.delete(doc.ref));
        
        const txs = await firestore.collection('transactions').get();
        txs.docs.forEach(doc => batch.delete(doc.ref));
        
        // Reset soldCount in all events to 0
        const events = await firestore.collection('events').get();
        events.docs.forEach(doc => {
          const event = doc.data() as EventData;
          const updatedTicketTypes = event.ticketTypes.map(t => ({ ...t, soldCount: 0 }));
          batch.update(doc.ref, { ticketTypes: updatedTicketTypes });
        });
        
        await batch.commit();
        console.log("[Firebase]: Bookings, tickets, and transactions cleared successfully.");
        return true;
      } catch (err) {
        console.error("[Firebase]: Clear transactions and bookings failed:", err);
        return false;
      }
    }
    
    // Local DB Fallback
    const data = readJson();
    data.bookings = [];
    data.tickets = [];
    data.transactions = [];
    data.events = data.events.map(event => ({
      ...event,
      ticketTypes: event.ticketTypes.map(t => ({ ...t, soldCount: 0 }))
    }));
    return writeJson(data);
  }
};
