import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import { BookingData, TicketData } from './types';

/**
 * Sends a confirmation email to the customer with embedded ticket QR codes.
 * If SMTP configuration is missing, it will run in a mock/simulation mode.
 */
export async function sendBookingEmail(booking: BookingData, tickets: TicketData[]) {
  try {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || 'noreply@sepay-ticketing.com';

    console.log(`[Email Service]: Preparing tickets email for ${booking.customerEmail}...`);

    const attachments: any[] = [];
    const ticketHtmlList: string[] = [];

    // Helper to format currency
    const formatVND = (amount: number) => {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
      }).format(amount);
    };

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      // Generate QR code as an image buffer
      const qrBuffer = await QRCode.toBuffer(ticket.id, {
        errorCorrectionLevel: 'H',
        type: 'png',
        margin: 1,
        width: 200,
      });

      const cidName = `qr-ticket-${ticket.id}`;
      attachments.push({
        filename: `${ticket.id}.png`,
        content: qrBuffer,
        cid: cidName
      });

      ticketHtmlList.push(`
        <div style="border: 2px dashed #3b82f6; border-radius: 12px; padding: 20px; margin-bottom: 20px; background-color: #f8fafc; font-family: Arial, sans-serif; max-width: 500px; margin-left: auto; margin-right: auto;">
          <div style="text-align: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px;">
            <h3 style="margin: 0; color: #1e3a8a; font-size: 18px; letter-spacing: 1px;">VÉ ĐIỆN TỬ</h3>
            <span style="font-size: 12px; color: #64748b;">Mã vé: <strong>${ticket.id}</strong></span>
          </div>
          
          <table style="width: 100%; font-size: 14px; border-collapse: collapse; margin-bottom: 15px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 110px;">Sự kiện:</td>
              <td style="padding: 6px 0; color: #1e293b; font-weight: bold;">${ticket.eventTitle}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Hạng vé:</td>
              <td style="padding: 6px 0; color: #3b82f6; font-weight: bold;">${ticket.ticketType.toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Khách hàng:</td>
              <td style="padding: 6px 0; color: #1e293b;">${ticket.customerName}</td>
            </tr>
          </table>

          <div style="text-align: center; background-color: #ffffff; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <img src="cid:${cidName}" alt="QR Code" style="width: 180px; height: 180px; display: block; margin: 0 auto 8px;" />
            <span style="font-size: 11px; color: #94a3b8; display: block;">Vui lòng xuất trình mã QR này tại cổng kiểm soát vé để check-in.</span>
          </div>
        </div>
      `);
    }

    const emailBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 25px; border-bottom: 2px solid #eff6ff; padding-bottom: 20px;">
          <h2 style="color: #2563eb; margin: 0; font-size: 24px;">Xác Nhận Đặt Vé Thành Công</h2>
          <p style="color: #64748b; font-size: 14px; margin: 5px 0 0 0;">Mã đơn hàng: <strong>${booking.id}</strong></p>
        </div>

        <p>Xin chào <strong>${booking.customerName}</strong>,</p>
        <p>Cảm ơn bạn đã tin tưởng đặt vé. Giao dịch thanh toán cho đơn hàng của bạn đã được hệ thống tự động ghi nhận thành công.</p>
        
        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 10px; margin: 25px 0; border: 1px solid #e2e8f0;">
          <h4 style="margin-top: 0; margin-bottom: 12px; color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; font-size: 16px;">Chi tiết đơn hàng</h4>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr>
              <td style="color: #64748b; padding: 4px 0; width: 150px;">Sự kiện:</td>
              <td style="color: #1e293b; padding: 4px 0;"><strong>${booking.eventTitle}</strong></td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 4px 0;">Hạng vé:</td>
              <td style="color: #1e293b; padding: 4px 0;">${booking.ticketType}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 4px 0;">Số lượng:</td>
              <td style="color: #1e293b; padding: 4px 0;">${booking.quantity} vé</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 4px 0;">Tổng thanh toán:</td>
              <td style="color: #16a34a; padding: 4px 0; font-size: 16px;"><strong>${formatVND(booking.totalAmount)}</strong></td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 4px 0;">Thời gian:</td>
              <td style="color: #1e293b; padding: 4px 0;">${new Date(booking.paidAt || Date.now()).toLocaleString('vi-VN')}</td>
            </tr>
          </table>
        </div>

        <h3 style="color: #1e293b; text-align: center; margin-top: 30px; margin-bottom: 20px; font-size: 18px;">DANH SÁCH VÉ ĐIỆN TỬ CỦA BẠN</h3>
        
        ${ticketHtmlList.join('')}

        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0 20px;" />
        <div style="font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">
          <p style="margin: 0 0 5px 0;">Email này được gửi tự động từ Hệ thống Vé Điện tử tích hợp SePay.</p>
          <p style="margin: 0;">Vui lòng không trả lời email này. Nếu cần hỗ trợ, xin vui lòng liên hệ ban tổ chức sự kiện.</p>
        </div>
      </div>
    `;

    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM || smtpFrom || 'onboarding@resend.dev';

    if (resendApiKey) {
      console.log(`[Resend Email Service]: Sending email to ${booking.customerEmail} via Resend...`);
      const resendAttachments = attachments.map(att => ({
        filename: att.filename,
        content: att.content.toString('base64'),
        contentId: att.cid
      }));

      const fromFormatted = resendFrom.includes('<') ? resendFrom : `"${booking.eventTitle}" <${resendFrom}>`;

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromFormatted,
          to: [booking.customerEmail],
          subject: `[Vé Điện Tử] Xác nhận đặt vé thành công - Đơn hàng ${booking.id}`,
          html: emailBody,
          attachments: resendAttachments
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Resend API returned status ${response.status}: ${errText}`);
      }

      const resData: any = await response.json();
      console.log(`[Resend Email Service]: Email sent successfully to ${booking.customerEmail}. Email ID: ${resData.id}`);
    } else if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      const mailOptions = {
        from: `"${booking.eventTitle}" <${smtpFrom}>`,
        to: booking.customerEmail,
        subject: `[Vé Điện Tử] Xác nhận đặt vé thành công - Đơn hàng ${booking.id}`,
        html: emailBody,
        attachments: attachments
      };

      await transporter.sendMail(mailOptions);
      console.log(`[Email Service]: Email sent successfully to ${booking.customerEmail}`);
    } else {
      console.log("\n==========================================================================");
      console.log("[Email Service WARNING]: Neither RESEND_API_KEY nor SMTP configuration found in .env.");
      console.log("[Email Service SIMULATION MODE ENABLED]");
      console.log(`- To: ${booking.customerEmail}`);
      console.log(`- Subject: [Vé Điện Tử] Xác nhận đặt vé thành công - Đơn hàng ${booking.id}`);
      console.log(`- Booking ID: ${booking.id}`);
      console.log(`- Tickets count: ${tickets.length}`);
      console.log(`- Ticket codes: ${tickets.map(t => t.id).join(', ')}`);
      console.log("- HTML Body preview: (tickets with inline CIDs generated in memory successfully)");
      console.log("==========================================================================\n");
    }
  } catch (error) {
    console.error("[Email Service Error]: Failed to send booking email:", error);
  }
}
