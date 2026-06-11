import React, { useState } from 'react';
import { BookingData, TicketData, SePayTransaction } from '../types';
import { 
  Users, Ticket, DollarSign, CheckCircle, RefreshCcw, Search, 
  Filter, Ban, Check, History, LayoutDashboard, Copy, ArrowDownRight, Smartphone, AlertTriangle
} from 'lucide-react';
import { formatVND, formatISOToDateTime, sounds } from '../utils';

// Helper local client interface derived from bookings
interface ClientContact {
  name: string;
  email: string;
  phone: string;
  totalSpent: number;
  ticketsCount: number;
  lastBookingDate: string;
}

interface AdminHubProps {
  bookings: BookingData[];
  tickets: TicketData[];
  transactions: SePayTransaction[];
  onManualApprove: (bookingId: string) => void;
  onManualCancel: (bookingId: string) => void;
  onResetDb: () => void;
  isLoading: boolean;
}

type AdminTab = 'dashboard' | 'bookings' | 'customers' | 'sepay_logs';

export default function AdminHub({
  bookings,
  tickets,
  transactions,
  onManualApprove,
  onManualCancel,
  onResetDb,
  isLoading
}: AdminHubProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'CANCELLED'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Copy helper
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    sounds.playBeepOk();
    setTimeout(() => setCopiedId(null), 1500);
  };

  // 1. Calculate Stats
  const paidBookings = bookings.filter(b => b.status === 'PAID');
  const pendingBookings = bookings.filter(b => b.status === 'PENDING');
  
  const totalRevenue = paidBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const totalTicketsSold = paidBookings.reduce((sum, b) => sum + (b.quantity || 0), 0);
  
  const totalCheckedIn = tickets.filter(t => t.checkedIn).length;
  const totalTicketsCreated = tickets.length;
  const attendanceRate = totalTicketsCreated > 0 
    ? Math.round((totalCheckedIn / totalTicketsCreated) * 100) 
    : 0;

  // 2. Generate Client Directory from bookings
  const clientMap = new Map<string, ClientContact>();
  bookings.forEach(b => {
    const key = b.customerEmail.toLowerCase().trim();
    const existing = clientMap.get(key);
    const addedSpent = b.status === 'PAID' ? b.totalAmount : 0;
    const addedTickets = b.status === 'PAID' ? b.quantity : 0;

    if (existing) {
      existing.totalSpent += addedSpent;
      existing.ticketsCount += addedTickets;
      if (new Date(b.createdAt) > new Date(existing.lastBookingDate)) {
        existing.lastBookingDate = b.createdAt;
      }
    } else {
      clientMap.set(key, {
        name: b.customerName,
        email: b.customerEmail,
        phone: b.customerPhone || "N/A",
        totalSpent: addedSpent,
        ticketsCount: addedTickets,
        lastBookingDate: b.createdAt
      });
    }
  });
  const customersList = Array.from(clientMap.values());

  // 3. Filtered bookings
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.paymentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.eventTitle.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // 4. Filtered customers
  const filteredCustomers = customersList.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      {/* Admin Title Banner */}
      <div className="bg-slate-900 text-white py-10 px-6 sm:px-10 shadow-lg relative overflow-hidden">
        {/* Abstract vector decor */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 z-10 relative">
          <div>
            <div className="flex items-center gap-2 bg-indigo-500/20 backdrop-blur-md text-indigo-300 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full w-fit mb-3">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping"></span>
              Cổng Ban Tổ Chức • Organizer Hub
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Khu Vực Quản Trị Hệ Thống</h1>
            <p className="text-slate-400 text-sm mt-1">Quản lý đặt vé, kiểm soát SePay Webhook tự động và đối soát khách hàng.</p>
          </div>

          <button
            onClick={() => {
              if (window.confirm("Bạn có chắc muốn khôi phục dữ liệu hệ thống bán vé về trạng thái mặc định không?")) {
                onResetDb();
              }
            }}
            id="reset_db_btn"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 font-semibold px-4 py-2.5 rounded-xl text-xs transition duration-200 shadow-sm"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Khôi phục dữ liệu mẫu
          </button>
        </div>
      </div>

      {/* Main Admin layout Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        
        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-2 flex overflow-x-auto gap-2 mb-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'dashboard' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Bảng Điều Khiển
          </button>
          
          <button
            onClick={() => { setActiveTab('bookings'); setSearchTerm(''); }}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'bookings' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Ticket className="w-4 h-4" />
            Lịch Sử Đặt Vé ({bookings.length})
          </button>
          
          <button
            onClick={() => { setActiveTab('customers'); setSearchTerm(''); }}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'customers' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            Danh Sách Khách Hàng ({customersList.length})
          </button>
          
          <button
            onClick={() => { setActiveTab('sepay_logs'); setSearchTerm(''); }}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'sepay_logs' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            Nhật Ký Nhận Tiền SePay Webhook ({transactions.length})
          </button>
        </div>

        {/* ----------------- TAB 1: DASHBOARD DETAILS ----------------- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Stat Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Tổng doanh thu</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">{formatVND(totalRevenue)}</span>
                  <span className="text-[10px] text-slate-400 mt-1.5 block">Đã thực nhận qua ngân hàng</span>
                </div>
                <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-2xl">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Vé đã bán thành công</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">{totalTicketsSold} vé</span>
                  <span className="text-[10px] text-amber-500 mt-1.5 block font-semibold">{pendingBookings.length} đơn đang chờ thanh toán</span>
                </div>
                <div className="bg-indigo-50 text-indigo-600 p-3.5 rounded-2xl">
                  <Ticket className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Khách hàng tích lũy</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">{customersList.length} người</span>
                  <span className="text-[10px] text-slate-400 mt-1.5 block">Đã ghi nhận thông tin liên lạc</span>
                </div>
                <div className="bg-purple-50 text-purple-600 p-3.5 rounded-2xl">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Tỷ lệ soát vé cổng vào</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">{attendanceRate}%</span>
                  <span className="text-[10px] text-slate-500 mt-1.5 block">Đã quét check-in <b>{totalCheckedIn}</b> / {totalTicketsCreated} vé</span>
                </div>
                <div className="bg-rose-50 text-rose-600 p-3.5 rounded-2xl">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Quick charts/Visual metrics panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Transaction Webhook Status Tracker */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:col-span-2">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Sao lưu & Đơn vé thanh toán gần đây</h2>
                    <p className="text-xs text-indigo-400 mt-0.5">Thời gian thực nhận qua SePay Webhook tự động</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('sepay_logs')}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold"
                  >
                    Xem tất cả ({transactions.length})
                  </button>
                </div>

                <div className="space-y-4">
                  {transactions.slice(0, 4).map((tx) => {
                    const matchedBooking = bookings.find(b => b.paymentCode.toUpperCase() === tx.code.toUpperCase());
                    return (
                      <div key={tx.id} className="flex justify-between items-center bg-slate-50 hover:bg-slate-100/70 p-3.5 rounded-xl border border-slate-100 transition duration-150">
                        <div className="flex items-center gap-3">
                          <div className="bg-emerald-100 text-emerald-800 rounded-lg p-2 text-center flex-shrink-0">
                            <ArrowDownRight className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-slate-800">{formatVND(tx.transferAmount)}</span>
                              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono font-medium">{tx.gateway}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono block mt-0.5">{tx.content}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          {matchedBooking ? (
                            <div className="text-right">
                              <span className="text-[11px] font-bold text-emerald-600 flex items-center justify-end gap-1">
                                <Check className="w-3 h-3" /> Đã Khớp Đơn
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">{matchedBooking.customerName}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-amber-500 font-semibold bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full inline-block">
                              Giao dịch lẻ / Sai mã
                            </span>
                          )}
                          <span className="text-[9px] text-slate-300 block mt-1">{formatISOToDateTime(tx.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                  {transactions.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      Chưa ghi nhận giao dịch SePay nào phát sinh.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Event Seats Status */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="text-base font-bold text-slate-900 mb-6">Trạng thái vé các Sự kiện</h2>
                
                <div className="space-y-6">
                  {bookings.length > 0 && Array.from(new Set(bookings.map(b => b.eventId))).map(evId => {
                    const targetBookings = bookings.filter(b => b.eventId === evId && b.status === "PAID");
                    const soldQuantity = targetBookings.reduce((sum, b) => sum + b.quantity, 0);
                    const eventTitle = targetBookings[0]?.eventTitle || "Sự kiện";
                    
                    return (
                      <div key={evId} className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-slate-800 line-clamp-1 flex-1">{eventTitle}</span>
                          <span className="text-xs font-semibold text-slate-400 ml-2">{soldQuantity} vé đã thanh toán</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${Math.min(100, (soldQuantity / 200) * 100)}%` }}
                            className="bg-indigo-600 h-full rounded-full"
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs space-y-2.5 text-slate-600 mt-4">
                    <span className="font-bold text-slate-800 block">💡 Thông tin vận hành tự động</span>
                    <p className="leading-relaxed">Khi người mua chuyển tiền đúng cú pháp khớp <b>DHxxxxxx</b>, SePay webhook đẩy dữ liệu về backend xử lý tức thì, xuất vé dưới 2 giây.</p>
                    <p className="leading-relaxed">Nhân viên sự kiện dùng camera điện thoại/máy tính bảng quét mã QR trên vé để check-in thẳng cổng.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 2: BOOKINGS HISTORY LIST ----------------- */}
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-6 animate-fadeIn">
            {/* Search and Filters Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
              <div className="relative w-full md:max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Tìm đơn đặt vé theo tên, email, mã, cú pháp chuyển tiền..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 transition shadow-inner bg-slate-55"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
                <div className="flex rounded-xl bg-slate-100 p-1 w-full sm:w-auto">
                  {(['ALL', 'PENDING', 'PAID', 'CANCELLED'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-initial whitespace-nowrap ${
                        statusFilter === status 
                          ? 'bg-white text-slate-900 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-850'
                      }`}
                    >
                      {status === 'ALL' && 'Tất cả'}
                      {status === 'PENDING' && 'Chờ TT'}
                      {status === 'PAID' && 'Đã mua'}
                      {status === 'CANCELLED' && 'Đã huỷ'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bookings Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-150">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                    <th className="px-4 py-3.5">Mã Đơn / Cú Pháp SePay</th>
                    <th className="px-4 py-3.5">Khách Hàng</th>
                    <th className="px-4 py-3.5">Sự Kiện & Loại Vé</th>
                    <th className="px-4 py-3.5 text-right">Tổng Tiền</th>
                    <th className="px-4 py-3.5 text-center">Trạng Thái</th>
                    <th className="px-4 py-3.5">Ngày Đặt</th>
                    <th className="px-4 py-3.5 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-4 space-y-1">
                        <span className="font-extrabold text-slate-800 block text-sm font-mono">{b.id}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 font-mono px-1.5 rounded font-bold uppercase">
                            Cú pháp: {b.paymentCode}
                          </span>
                          <button 
                            onClick={() => handleCopyText(b.paymentCode, b.id)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition"
                            title="Sao chép cú pháp chuyển tiền"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {copiedId === b.id && <span className="text-[9px] text-emerald-600 font-semibold">Copied!</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-bold text-slate-900 block">{b.customerName}</span>
                        <span className="text-slate-400 block pb-0.5">{b.customerEmail}</span>
                        <span className="text-[10px] text-slate-500 block font-mono">{b.customerPhone || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-4 space-y-1">
                        <span className="font-medium text-slate-800 block line-clamp-1">{b.eventTitle}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-semibold">{b.ticketType}</span>
                          <span className="text-slate-400">•</span>
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">SL: {b.quantity}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-black text-slate-900 text-sm block">{formatVND(b.totalAmount)}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{formatVND(b.pricePerTicket)} / vé</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase ${
                          b.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : b.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {b.status === 'PAID' && 'Đã Xuất Vé'}
                          {b.status === 'PENDING' && 'Chờ Chuyển Khoản'}
                          {b.status === 'CANCELLED' && 'Đã Huỷ Đơn'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-400 font-mono text-[10px]">
                        {formatISOToDateTime(b.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {b.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Xác nhận khách ${b.customerName} đã chuyển khoản đủ ${formatVND(b.totalAmount)}đ ngoài hệ thống?`)) {
                                    onManualApprove(b.id);
                                  }
                                }}
                                className="p-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg font-bold flex items-center gap-1 transition"
                                title="Phê duyệt thủ công"
                              >
                                <Check className="w-3.5 h-3.5" /> Dựng vé
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Bạn có chắc chắn muốn hủy đơn vé ${b.id}?`)) {
                                    onManualCancel(b.id);
                                  }
                                }}
                                className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-lg font-bold flex items-center gap-1 transition"
                                title="Hủy bỏ đơn này"
                              >
                                <Ban className="w-3.5 h-3.5" /> Huỷ
                              </button>
                            </>
                          )}
                          {b.status === 'PAID' && (
                            <div className="text-center text-emerald-600 font-bold py-1 flex items-center gap-1 justify-center bg-emerald-50 rounded-lg px-2 text-[10px] uppercase border border-emerald-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block"></span>
                              Hoàn thành
                            </div>
                          )}
                          {b.status === 'CANCELLED' && (
                            <span className="text-slate-400 text-[10px] italic">Đã hủy bỏ</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredBookings.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        Không tìm thấy đơn đặt vé nào khớp với bộ lọc tìm kiếm.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------- TAB 3: CUSTOMERS DIRECTORY ----------------- */}
        {activeTab === 'customers' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 animate-fadeIn">
            {/* Search Header */}
            <div className="mb-6">
              <div className="relative w-full max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Tìm khách hàng theo tên, email, sđt..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none bg-slate-55"
                />
              </div>
            </div>

            {/* Customers table */}
            <div className="overflow-x-auto rounded-xl border border-slate-150">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                    <th className="px-4 py-3.5">Họ Tên</th>
                    <th className="px-4 py-3.5">Email</th>
                    <th className="px-4 py-3.5">Số Điện Thoại</th>
                    <th className="px-4 py-3.5 text-center">Số Vé Đã Mua (Thành công)</th>
                    <th className="px-4 py-3.5 text-right">Tổng Tiền Đã Thanh Toán</th>
                    <th className="px-4 py-3.5">Ngày Đăng Ký Cuối</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 font-bold text-slate-700 flex items-center justify-center uppercase">
                            {c.name.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-900 text-sm">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600 font-medium">{c.email}</td>
                      <td className="px-4 py-4 text-slate-550 font-mono">{c.phone}</td>
                      <td className="px-4 py-4 text-center font-extrabold text-slate-800">
                        {c.ticketsCount > 0 ? (
                          <span className="bg-indigo-100/60 text-indigo-800 px-2.5 py-1 rounded-full text-xs">
                            {c.ticketsCount} vé
                          </span>
                        ) : (
                          <span className="text-slate-400">0 vé</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {formatVND(c.totalSpent)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-400 font-mono">
                        {formatISOToDateTime(c.lastBookingDate)}
                      </td>
                    </tr>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        Không tìm thấy khách hàng nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------- TAB 4: SEPAY WORKSPACE TRANSACTION LOGS ----------------- */}
        {activeTab === 'sepay_logs' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 animate-fadeIn space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Nhật Ký Gọi Webhook SePay</h2>
                <p className="text-xs text-slate-500 mt-1">Dưới đây là các cuộc gọi POST từ SePay API sau khi có giao dịch chuyển khoản ngân hàng 24/7 thực tế.</p>
              </div>
              <div className="bg-slate-150 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 shrink-0">
                <Smartphone className="w-3.5 h-3.5" />
                Webhook Ingress Target: IP Whitelist/All incoming
              </div>
            </div>

            {/* Simulated SePay Payload Explanation banner */}
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 flex gap-3 text-xs text-indigo-900 leading-relaxed max-w-4xl">
              <AlertTriangle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block mb-1">Cơ chế Kiểm soát Tự động VietQR & SePay:</span>
                Khi người dùng chuyển khoản quét mã VietQR, tiền chạy về tài khoản ngân hàng của bạn. 
                SePay lắng nghe biến động số dư và bắn một tín hiệu POST Webhook chứa nội dung chuyển khoản đến endpoint 
                <code className="bg-white/95 px-1.5 py-0.5 mx-1 rounded font-mono font-bold text-indigo-700">/api/sepay-webhook</code> của trang web. 
                Hệ thống khớp mã chuyển tiền <code className="bg-white/80 px-1 rounded font-mono text-indigo-800">DHxxxxxx</code> để tự động đổi trạng thái đơn vé sang PAID mà không cần bạn làm gì thủ công!
              </div>
            </div>

            {/* Transactions Log table */}
            <div className="overflow-x-auto rounded-xl border border-slate-150">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                    <th className="px-4 py-3.5">ID Giao Dịch SePay</th>
                    <th className="px-4 py-3.5">Ngân Hàng</th>
                    <th className="px-4 py-3.5 text-right">Số Tiền Khách Gửi</th>
                    <th className="px-4 py-3.5">Thông tin nội dung nội dung (Content)</th>
                    <th className="px-4 py-3.5 font-mono">Mã Tham Chiếu Ngân Hàng</th>
                    <th className="px-4 py-3.5 text-center">Khớp Cú Pháp</th>
                    <th className="px-4 py-3.5">Nhận Lúc</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => {
                    const matchedBooking = bookings.find(b => b.paymentCode.toUpperCase() === tx.code.toUpperCase());
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-4 font-mono font-bold text-slate-800">{tx.id}</td>
                        <td className="px-4 py-4">
                          <span className="bg-slate-100 font-bold text-slate-700 px-2 py-1 rounded font-mono text-[10px]">
                            {tx.gateway}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="font-extrabold text-emerald-700 text-sm">{formatVND(tx.transferAmount)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-slate-600 block max-w-xs truncate font-medium" title={tx.content}>
                            {tx.content}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-mono text-slate-400">{tx.referenceCode}</td>
                        <td className="px-4 py-4 text-center">
                          {matchedBooking ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                              <Check className="w-3 h-3 text-emerald-600" /> {tx.code} ({matchedBooking.id})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full">
                              Không khớp đơn hàng
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-slate-400 font-mono text-[10px]">
                          {formatISOToDateTime(tx.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        Chưa ghi nhận hoạt động Webhook nào của SePay.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
