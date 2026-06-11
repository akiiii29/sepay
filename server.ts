import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db, BookingData, SePayTransaction } from './src/server-db';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON middleware for API calls
  app.use(express.json());

  // 1. Get List of Events
  app.get('/api/events', (req: Request, res: Response) => {
    try {
      res.json(db.getEvents());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 2. Get Event Detail
  app.get('/api/events/:id', (req: Request, res: Response) => {
    try {
      const event = db.getEventById(req.params.id);
      if (!event) {
        res.status(404).json({ error: "Sự kiện không tồn tại" });
        return;
      }
      res.json(event);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 3. Create a Booking (Đặt vé)
  app.post('/api/booking', (req: Request, res: Response) => {
    try {
      const { eventId, customerName, customerEmail, customerPhone, ticketType, quantity } = req.body;

      if (!eventId || !customerName || !customerEmail || !ticketType || !quantity) {
        res.status(400).json({ error: "Thiếu thông tin đăng ký vé bắt buộc." });
        return;
      }

      const event = db.getEventById(eventId);
      if (!event) {
        res.status(444).json({ error: "Sự kiện được chọn không tồn tại." });
        return;
      }

      const selectedType = event.ticketTypes.find(t => t.id === ticketType);
      if (!selectedType) {
        res.status(400).json({ error: "Hạng vé được chọn không hợp lệ." });
        return;
      }

      // Check remaining seat limits
      if (selectedType.soldCount + Number(quantity) > selectedType.totalLimit) {
        res.status(400).json({ error: `Rất tiếc, hạng vé này chỉ còn lại ${selectedType.totalLimit - selectedType.soldCount} vé trống.` });
        return;
      }

      // Generate unique short Booking ID
      const bookingRandomId = Math.floor(100000 + Math.random() * 900000); // 6 digits
      const bookingId = `BK-${bookingRandomId}`;
      const paymentCode = `DH${bookingRandomId}`; // case insensitive transfer query keyword

      const totalAmount = selectedType.price * Number(quantity);

      const booking: BookingData = {
        id: bookingId,
        eventId,
        eventTitle: event.title,
        customerName,
        customerEmail,
        customerPhone: customerPhone || "",
        ticketType: selectedType.name,
        pricePerTicket: selectedType.price,
        quantity: Number(quantity),
        totalAmount,
        paymentCode,
        status: "PENDING",
        createdAt: new Date().toISOString(),
        paidAt: null
      };

      db.addBooking(booking);
      res.status(201).json(booking);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 4. View Booking Details and Status Poll
  app.get('/api/booking/:id', (req: Request, res: Response) => {
    try {
      const booking = db.getBookingById(req.params.id);
      if (!booking) {
        res.status(404).json({ error: "Không tìm thấy đơn đặt vé." });
        return;
      }
      
      // If paid, fetch associated tickets too for convenience
      let tickets = [];
      if (booking.status === 'PAID') {
        tickets = db.getTickets().filter(t => t.bookingId === booking.id);
      }

      res.json({ booking, tickets });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 5. Get All Bookings (Admin Panel)
  app.get('/api/bookings', (req: Request, res: Response) => {
    try {
      res.json(db.getBookings());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 6. Get All Generated Tickets (Admin)
  app.get('/api/tickets', (req: Request, res: Response) => {
    try {
      res.json(db.getTickets());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 7. Get All SePay Transactions list (Admin Audit Logs)
  app.get('/api/transactions', (req: Request, res: Response) => {
    try {
      res.json(db.getTransactions());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 8. SePay Bank Transfer Webhook
  // Doc: SePay triggers this endpoint on any incoming bank transfer
  app.post('/api/sepay-webhook', (req: Request, res: Response) => {
    try {
      console.log("[SePay Webhook Received]:", req.body);
      
      const { id, gateway, transactionDate, accountNumber, transferType, transferAmount, content, referenceCode } = req.body;

      if (transferType !== 'in') {
        res.json({ status: "ignored", message: "Only incoming transactions are processed." });
        return;
      }

      // Fallback: search for custom matched code inside description content
      // Description is often lowercase/case-insensitive and might contain leading/trailing text, e.g. "CK MUA VE DH123456"
      const description = (content || "").toUpperCase();
      
      // Look up all bookings
      const bookings = db.getBookings();
      const pendingBookings = bookings.filter(b => b.status === "PENDING");
      
      // Find matching paymentCode, e.g., DH123456
      let matchedBooking = pendingBookings.find(b => description.includes(b.paymentCode.toUpperCase()));
      
      // Save Transaction Log
      const sepayTx: SePayTransaction = {
        id: id || `sepay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        gateway: gateway || "MockBank",
        transactionDate: transactionDate || new Date().toISOString(),
        accountNumber: accountNumber || "Unknown",
        transferType: "in",
        transferAmount: Number(transferAmount || 0),
        content: content || "",
        referenceCode: referenceCode || "MockRef",
        code: matchedBooking ? matchedBooking.paymentCode : "UNKNOWN",
        createdAt: new Date().toISOString()
      };
      
      db.addTransaction(sepayTx);

      if (!matchedBooking) {
        console.warn(`[SePay Webhook Warning]: Code mismatched for content "${content}" and amount ${transferAmount}`);
        res.json({
          status: "mismatch",
          message: "Transaction logged but no corresponding pending booking found matching code."
        });
        return;
      }

      // Check if transferred amount is at least equal to total booking price (allowing larger tips, but checking minimum)
      if (Number(transferAmount) < matchedBooking.totalAmount) {
        console.warn(`[SePay Webhook Warning]: Insufficient transfer amount for booking ${matchedBooking.id}. Expected: ${matchedBooking.totalAmount}, Got: ${transferAmount}`);
        res.json({
          status: "insufficient_amount",
          message: "Matched booking found, but transfer amount is less than total amount due."
        });
        return;
      }

      // Transition booking status to paid
      const updatedBooking = db.updateBookingStatus(matchedBooking.id, 'PAID', {
        sepayTransactionId: sepayTx.id,
        gateway: sepayTx.gateway,
        referenceCode: sepayTx.referenceCode,
        transferAmount: sepayTx.transferAmount,
        transactionDate: sepayTx.transactionDate
      });

      console.log(`[SePay Webhook Success]: Automatically confirmed booking ${matchedBooking.id} for customer ${matchedBooking.customerName}`);

      res.status(200).json({
        status: "success",
        message: `Booking ${matchedBooking.id} successfully updated to PAID. Tickets generated.`,
        booking: updatedBooking
      });
    } catch (e: any) {
      console.error("[SePay Webhook Error]:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // 9. QR Code Verification (Soát vé tại cổng)
  app.post('/api/tickets/checkin', (req: Request, res: Response) => {
    try {
      const { ticketId, gate } = req.body;
      if (!ticketId) {
        res.status(400).json({ error: "Thiếu thông tin mã vé (id)." });
        return;
      }

      const result = db.checkInTicket(ticketId, gate || "Cổng Chính");
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 10. Manual Webhook Simulation Handler (Nút giả lập chuyển tiền của khách trên UI)
  app.post('/api/simulate-transfer', (req: Request, res: Response) => {
    try {
      const { paymentCode, amount, gateway } = req.body;
      if (!paymentCode || !amount) {
        res.status(400).json({ error: "Thiếu mã thanh toán hoặc số tiền để giả lập." });
        return;
      }

      // Construct a SePay-like payload and send to inward webhook flow
      const randomRef = 'REF' + Math.floor(10000000 + Math.random() * 90000000);
      const randomSePayId = String(Math.floor(1000000 + Math.random() * 9000000));
      
      const payload = {
        id: randomSePayId,
        gateway: gateway || "MBBank",
        transactionDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
        accountNumber: "VQRQAJQJY8278",
        transferType: "in",
        transferAmount: Number(amount),
        content: `Chuyen khoan thanh toan ${paymentCode} tu dong`,
        referenceCode: randomRef
      };

      // Call local sepay webhook logic directly
      // Better yet, trigger the api sepay webhook helper locally
      console.log("[Simulation Triggered]: Simulating SePay transaction for code", paymentCode);
      
      // Look up local bookings to see match
      const booking = db.getBookings().find(b => b.paymentCode.toUpperCase() === paymentCode.toUpperCase() && b.status === 'PENDING');
      
      // Save Transaction
      const sepayTx: SePayTransaction = {
        id: payload.id,
        gateway: payload.gateway,
        transactionDate: payload.transactionDate,
        accountNumber: payload.accountNumber,
        transferType: "in",
        transferAmount: payload.transferAmount,
        content: payload.content,
        referenceCode: payload.referenceCode,
        code: paymentCode.toUpperCase(),
        createdAt: new Date().toISOString()
      };
      db.addTransaction(sepayTx);

      if (!booking) {
        res.json({
          success: false,
          message: "Giả lập: Ghi nhận giao dịch chuyển tiền khác, nhưng không có đơn hàng CHƯA THANH TOÁN nào trùng với mã này."
        });
        return;
      }

      if (Number(amount) < booking.totalAmount) {
        res.json({
          success: false,
          message: `Giả lập: Phát hiện chênh lệch số tiền! Đơn vé cần ${booking.totalAmount} VNĐ nhưng người chuyển chỉ chuyển ${amount} VNĐ.`
        });
        return;
      }

      // Update Booking
      db.updateBookingStatus(booking.id, 'PAID', {
        sepayTransactionId: sepayTx.id,
        gateway: sepayTx.gateway,
        referenceCode: sepayTx.referenceCode,
        transferAmount: sepayTx.transferAmount,
        transactionDate: sepayTx.transactionDate,
        simulated: true
      });

      res.json({
        success: true,
        message: `Mô phỏng thành công! SePay Webhook đã khớp đơn đặt vé ${booking.id} và tự động xuất vé điện tử.`,
        bookingId: booking.id
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 11. Reset Dashboard Database (Admin action)
  app.post('/api/admin/reset', (req: Request, res: Response) => {
    try {
      const ok = db.resetDb();
      res.json({ success: ok, message: "Cơ sở dữ liệu đặt vé đã được khôi phục về trạng thái hạt giống ban đầu." });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Serve client assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Ticketing System] Backend running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
