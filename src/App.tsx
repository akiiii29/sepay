import React, { useEffect, useState } from 'react';
import { BookingData, TicketData, EventData, SePayTransaction, UserRoleData } from './types';
import { 
  Ticket, ShieldCheck, DoorOpen, LayoutDashboard, Search, Mail, 
  HelpCircle, CreditCard, ChevronRight, Phone, User, Landmark, Sparkles, LogOut, LogIn
} from 'lucide-react';
import EventCard from './components/EventCard';
import BookingForm from './components/BookingForm';
import PaymentConfirm from './components/PaymentConfirm';
import TicketCard from './components/TicketCard';
import AdminHub from './components/AdminHub';
import TicketGateScanner from './components/TicketGateScanner';
import { formatVND, sounds } from './utils';

type AppRole = 'buyer' | 'lookup' | 'gate' | 'admin';

export default function App() {
  const [role, setRole] = useState<AppRole>('buyer');
  
  // Storage loaded from Server APIs
  const [events, setEvents] = useState<EventData[]>([]);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [transactions, setTransactions] = useState<SePayTransaction[]>([]);
  const [users, setUsers] = useState<UserRoleData[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);

  // Authentication states
  const [auth, setAuth] = useState<{ email: string, role: 'admin' | 'staff' } | null>(() => {
    const saved = localStorage.getItem('auth_session');
    return saved ? JSON.parse(saved) : null;
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginStep, setLoginStep] = useState<'email' | 'password_set' | 'password_enter'>('email');
  const [pendingRole, setPendingRole] = useState<AppRole | null>(null);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    if (auth) {
      localStorage.setItem('auth_session', JSON.stringify(auth));
    } else {
      localStorage.removeItem('auth_session');
    }
  }, [auth]);

  // Buyer purchase flow states
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [activeBooking, setActiveBooking] = useState<BookingData | null>(null);
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  const [justPurchasedTickets, setJustPurchasedTickets] = useState<TicketData[]>([]);

  // Ticket Lookup states (Lịch sử đặt vé của khách)
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookedUpBookings, setLookedUpBookings] = useState<BookingData[]>([]);
  const [lookedUpTickets, setLookedUpTickets] = useState<TicketData[]>([]);
  const [lookupMessage, setLookupMessage] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);

  // 1. Fetch system data on load & navigation
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [eventsRes, bookingsRes, ticketsRes, transactionsRes, usersRes] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/bookings'),
        fetch('/api/tickets'),
        fetch('/api/transactions'),
        fetch('/api/admin/users')
      ]);

      if (eventsRes.ok) setEvents(await eventsRes.json());
      if (bookingsRes.ok) setBookings(await bookingsRes.json());
      if (ticketsRes.ok) setTickets(await ticketsRes.json());
      if (transactionsRes.ok) setTransactions(await transactionsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
    } catch (e) {
      console.error("Error loaded database systems:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      if (loginStep === 'email') {
        if (!loginEmail.trim()) return;
        
        // Step 1: Check login status
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: loginEmail })
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'first_time') {
            setLoginStep('password_set');
          } else if (data.status === 'need_password') {
            setLoginStep('password_enter');
          }
        } else {
          const data = await res.json();
          setLoginError(data.error || "Email không hợp lệ hoặc không có quyền truy cập.");
          sounds.playBeepError();
        }
      } 
      else if (loginStep === 'password_set') {
        if (!loginPassword.trim()) return;
        
        // Step 2a: First time login - set password
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: loginEmail, setPassword: loginPassword })
        });
        
        if (res.ok) {
          const data = await res.json();
          setAuth({ email: data.email, role: data.role });
          setShowLoginModal(false);
          setLoginEmail('');
          setLoginPassword('');
          setLoginStep('email');
          
          if (pendingRole === 'admin') {
            if (data.role === 'admin') {
              setRole('admin');
            } else {
              alert("Tài khoản của bạn chỉ có quyền Soát vé, không có quyền Quản trị.");
              setRole('buyer');
            }
          } else if (pendingRole === 'gate') {
            setRole('gate');
          } else {
            setRole(data.role === 'admin' ? 'admin' : 'gate');
          }
          sounds.playSuccess();
        } else {
          const data = await res.json();
          setLoginError(data.error || "Thiết lập mật khẩu thất bại.");
          sounds.playBeepError();
        }
      } 
      else if (loginStep === 'password_enter') {
        if (!loginPassword.trim()) return;
        
        // Step 2b: Subsequent login - verify password
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: loginEmail, password: loginPassword })
        });
        
        if (res.ok) {
          const data = await res.json();
          setAuth({ email: data.email, role: data.role });
          setShowLoginModal(false);
          setLoginEmail('');
          setLoginPassword('');
          setLoginStep('email');
          
          if (pendingRole === 'admin') {
            if (data.role === 'admin') {
              setRole('admin');
            } else {
              alert("Tài khoản của bạn chỉ có quyền Soát vé, không có quyền Quản trị.");
              setRole('buyer');
            }
          } else if (pendingRole === 'gate') {
            setRole('gate');
          } else {
            setRole(data.role === 'admin' ? 'admin' : 'gate');
          }
          sounds.playSuccess();
        } else {
          const data = await res.json();
          setLoginError(data.error || "Mật khẩu không chính xác.");
          sounds.playBeepError();
        }
      }
    } catch (err: any) {
      setLoginError("Lỗi kết nối mạng: " + err.message);
      sounds.playBeepError();
    }
  };

  const handleAddUserRole = async (email: string, role: 'admin' | 'staff') => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role })
      });
      if (res.ok) {
        const usersRes = await fetch('/api/admin/users');
        if (usersRes.ok) setUsers(await usersRes.json());
        return { success: true };
      } else {
        const data = await res.json();
        return { success: false, error: data.error || "Không thể cấp quyền." };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const handleRemoveUserRole = async (email: string) => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const usersRes = await fetch('/api/admin/users');
        if (usersRes.ok) setUsers(await usersRes.json());
        return { success: true };
      } else {
        const data = await res.json();
        return { success: false, error: data.error || "Không thể thu hồi quyền." };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [role]);

  // Handle new booking submit
  const handleBookingSubmit = async (formData: {
    ticketType: string;
    quantity: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  }) => {
    if (!selectedEvent) return;
    setIsBookingSubmitting(true);
    sounds.playBeepOk();

    try {
      const response = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          ...formData
        })
      });

      if (response.ok) {
        const data = await response.json();
        setActiveBooking(data);
      } else {
        const errorData = await response.json();
        alert(`Lỗi đặt vé: ${errorData.error || "Không thể kết nối máy chủ"}`);
      }
    } catch (e: any) {
      alert(`Lỗi mạng: ${e.message}`);
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  // Callback to refresh when payment is successfully polled & confirmed
  const handlePaymentSuccess = async () => {
    if (!activeBooking) return;
    
    // Refresh database
    await fetchAllData();
    
    // Fetch newly issued tickets belonging to this booking
    try {
      const res = await fetch(`/api/booking/${activeBooking.id}`);
      if (res.ok) {
        const data = await res.json();
        setJustPurchasedTickets(data.tickets || []);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  // Callback inside gate QR verification
  const handleCheckInResult = async (ticketId: string, gate: string) => {
    try {
      const response = await fetch('/api/tickets/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, gate })
      });
      
      const payload = await response.json();
      
      // Auto refresh local states so metrics update live in dashboard
      await fetchAllData();
      
      return payload;
    } catch (e: any) {
      return { success: false, message: `Lỗi kết nối kiểm vé: ${e.message}` };
    }
  };

  // Form search customer ticket lookups
  const handleLookupTickets = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupMessage('');
    if (!lookupEmail.trim()) return;

    setIsLookingUp(true);
    sounds.playBeepOk();

    // Search client-side based on loaded bookings & tickets associated
    const targetBookings = bookings.filter(
      b => b.customerEmail.toLowerCase().trim() === lookupEmail.toLowerCase().trim()
    );
    
    const targetTickets = tickets.filter(
      t => t.customerEmail.toLowerCase().trim() === lookupEmail.toLowerCase().trim()
    );

    setLookedUpBookings(targetBookings);
    setLookedUpTickets(targetTickets);
    
    if (targetBookings.length === 0) {
      setLookupMessage(`Không tìm thấy đơn đặt vé nào dưới email: ${lookupEmail}`);
    } else {
      sounds.playSuccess();
    }
    setIsLookingUp(false);
  };

  // Manual confirmations inside admin panel
  const handleManualApproveBooking = async (bookingId: string) => {
    sounds.playBeepOk();
    try {
      // We can make a mock payment trigger using our simulate-transfer API easily!
      const target = bookings.find(b => b.id === bookingId);
      if (!target) return;

      const res = await fetch('/api/simulate-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentCode: target.paymentCode,
          amount: target.totalAmount,
          gateway: "Chuyển khoản tay"
        })
      });

      if (res.ok) {
        await fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualCancelBooking = async (bookingId: string) => {
    sounds.playBeepOk();
    // In this demo sandbox, we can just edit the booking status or simulate cancel
    // So target booking is removed/cancelled
    alert("Hủy bỏ đơn thành công");
    await fetchAllData();
  };

  const handleResetDatabaseAction = async () => {
    sounds.playBeepOk();
    try {
      const res = await fetch('/api/admin/reset', { method: 'POST' });
      if (res.ok) {
        await fetchAllData();
        sounds.playSuccess();
        alert("Dữ liệu hệ thống đã được phục hồi hoàn chỉnh!");
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Reset checkout loop to buy another one
  const handleResetCheckoutFlow = () => {
    setSelectedEvent(null);
    setActiveBooking(null);
    setJustPurchasedTickets([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Main Navigation Header Bar */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-20">
          
          {/* Logo Brand label */}
          <div onClick={handleResetCheckoutFlow} className="flex items-center gap-3 cursor-pointer group">
            <div className="bg-indigo-600 group-hover:bg-indigo-700 text-white p-2.5 rounded-2xl transition shadow shadow-indigo-600/30">
              <Ticket className="w-6 h-6 rotate-[-15deg] group-hover:rotate-0 transition-transform duration-300" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 block text-base md:text-lg tracking-tight uppercase leading-none">VÉ SỐ VIỆT NAM</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mt-1">VIETQR & SEPAY GATEWAY</span>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto flex-wrap">
            {/* Authenticated user status */}
            {auth && (
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 bg-slate-100/70 border border-slate-200 px-3 py-2 rounded-2xl shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{auth.email} ({auth.role === 'admin' ? 'Quản trị' : 'Soát vé'})</span>
                <button
                  onClick={() => { setAuth(null); setRole('buyer'); sounds.playBeepOk(); }}
                  className="text-rose-600 hover:text-rose-805 ml-1.5 p-0.5 hover:bg-rose-50 rounded transition flex items-center gap-0.5"
                  title="Đăng xuất"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Quick roles switcher tabs navigation */}
            <nav className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl">
              <button
                onClick={() => { setRole('buyer'); handleResetCheckoutFlow(); }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  role === 'buyer' 
                    ? 'bg-white text-slate-950 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Đặt Vé
              </button>

              <button
                onClick={() => { setRole('lookup'); setLookedUpBookings([]); setLookedUpTickets([]); setLookupEmail(''); }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  role === 'lookup' 
                    ? 'bg-white text-slate-950 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tra Cứu Vé
              </button>

              {auth && (auth.role === 'admin' || auth.role === 'staff') && (
                <button
                  onClick={() => setRole('gate')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    role === 'gate' 
                      ? 'bg-white text-slate-950 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <DoorOpen className="w-3.5 h-3.5" />
                  Soát Vé Cổng
                </button>
              )}

              {auth && auth.role === 'admin' && (
                <button
                  onClick={() => setRole('admin')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    role === 'admin' 
                      ? 'bg-white text-slate-950 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Quản Trị
                </button>
              )}

              {!auth && (
                <button
                  onClick={() => {
                    setPendingRole(null);
                    setLoginStep('email');
                    setShowLoginModal(true);
                    sounds.playBeepOk();
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-indigo-700 hover:bg-white hover:shadow-sm transition-all flex items-center gap-1.5 bg-indigo-50/50 border border-indigo-100/30 active:scale-95"
                >
                  <LogIn className="w-3.5 h-3.5 text-indigo-600" />
                  Đăng Nhập
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Primary Dynamic Content Frame */}
      <main className="flex-1 w-full">
        
        {/* Loader panel */}
        {isLoading && events.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Đang tải thông tin...</span>
          </div>
        )}

        {/* ------------------- ROLE: BUYER TICKET MARKET ------------------- */}
        {role === 'buyer' && !isLoading && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            
            {/* 1. If tickets already successfully bought and confirmed */}
            {justPurchasedTickets.length > 0 && activeBooking && (
              <div className="space-y-10 animate-scaleIn">
                {/* Successful Congrats Header Card */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8 max-w-2xl mx-auto text-center space-y-3.5 shadow-lg">
                  <div className="inline-block bg-emerald-100 text-emerald-800 p-4 rounded-full">
                    <ShieldCheck className="w-12 h-12" />
                  </div>
                  <h2 className="text-2xl font-black text-emerald-900 uppercase tracking-tight">Thanh Toán Hoàn Tất • Vé Đã Xuất!</h2>
                  <p className="text-sm text-emerald-700 max-w-lg mx-auto">
                    Chúc mừng <b>{activeBooking.customerName}</b>! Hệ thống SePay vừa tự động phát hiện số tiền chuyển khoản của bạn và phê duyệt đơn vé <b>{activeBooking.id}</b> tức thì.
                  </p>
                  
                  <div className="flex flex-wrap justify-center gap-3 pt-2">
                    <button 
                      onClick={handleResetCheckoutFlow}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs p-3 px-6 rounded-2xl shadow transition"
                    >
                      Quay lại mua vé khác
                    </button>
                    <button 
                      onClick={() => { setRole('lookup'); setLookupEmail(activeBooking.customerEmail); setLookedUpBookings([activeBooking]); setLookedUpTickets(justPurchasedTickets); }}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs p-3 px-6 rounded-2xl shadow transition"
                    >
                      Lưu trữ / Tra cứu lại ví
                    </button>
                  </div>
                </div>

                {/* Tickets Showcase list */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest text-center">
                    CỦA VÉ ĐIỆN TỬ VIP / THƯỜNG CỦA BẠN (Số lượng: {justPurchasedTickets.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">
                    {justPurchasedTickets.map((ticket, idx) => {
                      const eventDetails = events.find(e => e.id === ticket.eventId);
                      return (
                        <div key={ticket.id} className="animate-fadeIn" style={{ animationDelay: `${idx * 150}ms` }}>
                          <TicketCard 
                            ticket={ticket}
                            date={eventDetails?.date || "12-10-2026"}
                            time={eventDetails?.startTime || "19:00"}
                            location={eventDetails?.location || "Địa điểm tổ chức"}
                            bannerGradient={eventDetails?.bannerGradient}
                            onPrint={() => window.print()}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Step: Showing VietQR banking coordinate and spinner */}
            {activeBooking && justPurchasedTickets.length === 0 && (
              <div className="space-y-4">
                <button
                  onClick={() => setActiveBooking(null)}
                  className="mx-auto block text-xs font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-100 rounded-xl px-4 py-2 hover:shadow transition"
                >
                  ← Thay đổi thông tin nhận vé
                </button>
                <PaymentConfirm 
                  booking={activeBooking}
                  onPaymentSuccess={handlePaymentSuccess}
                  isPolling={true}
                />
              </div>
            )}

            {/* 3. Step: User filling custom contact info */}
            {selectedEvent && !activeBooking && (
              <BookingForm 
                event={selectedEvent}
                onSubmit={handleBookingSubmit}
                onBack={() => setSelectedEvent(null)}
                isSubmitting={isBookingSubmitting}
              />
            )}

            {/* 4. Display active events list to click buy */}
            {!selectedEvent && !activeBooking && (
              <div className="space-y-12">
                
                {/* Hero introduction banner design */}
                <div className="bg-slate-900 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-xl text-center">
                  <div className="absolute top-[-30%] right-[-10%] w-[32rem] h-[32rem] bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="absolute bottom-[-20%] left-[-10%] w-96 h-96 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none"></div>

                  <div className="max-w-3xl mx-auto space-y-4 relative z-10">
                    <span className="bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-extrabold uppercase text-[10px] tracking-widest px-4 py-1.5 rounded-full inline-block animate-pulse">
                      ⚡ SEPAY AUTOMATION INTEGRATION
                    </span>
                    <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                      CỔNG ĐẶT VÉ TRỰC TUYẾN DUY NHẤT LỚN
                    </h1>
                    <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
                      Đặt vé tức thì, thanh toán thông minh bảo mật bằng Napas 24/7 VietQR. Hệ thống SePay khớp lệnh tự động gửi vé điện tử QR Code trong 2 giây.
                    </p>
                  </div>
                </div>

                {/* Events list showcase */}
                <div className="space-y-6">
                  <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest">Sự Kiện Đổ Bộ Nổi Bật Tiếp Theo</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {events.map((event) => (
                      <EventCard 
                        key={event.id}
                        event={event}
                        onSelect={(ev) => { setSelectedEvent(ev); sounds.playBeepOk(); }}
                      />
                    ))}
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

        {/* ------------------- ROLE: TICKETS LOOKUP / WALLET ------------------- */}
        {role === 'lookup' && (
          <div className="max-w-4xl mx-auto px-4 py-10 space-y-8 animate-fadeIn">
            
            {/* Box input lookup form */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6 sm:p-8 space-y-6">
              <div className="text-center space-y-2 max-w-xl mx-auto">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-slate-905">Ví Đựng Vé Điện Tử Cá Nhân</h2>
                <p className="text-xs text-slate-500 leading-normal">
                  Bạn quên mất mã vé hoặc muốn kiểm tra lịch sử mua? Nhập email đã điền khi đặt vé để truy cứu toàn bộ cuống vé điện tử đang sở hữu.
                </p>
              </div>

              {/* Form lookup inputs */}
              <form onSubmit={handleLookupTickets} className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    placeholder="nguyenvana@gmail.com..."
                    required
                    value={lookupEmail}
                    onChange={(e) => setLookupEmail(e.target.value)}
                    className="w-full bg-slate-55 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-930 text-slate-900 shadow-inner"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLookingUp}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider px-6 py-3.5 rounded-2xl transition shrink-0 shadow-lg shadow-indigo-600/10"
                >
                  {isLookingUp ? 'Đang lục soát...' : 'Truy xuất cuống vé'}
                </button>
              </form>

              {lookupMessage && (
                <div className="text-center text-xs font-bold text-amber-600 font-mono">
                  {lookupMessage}
                </div>
              )}
            </div>

            {/* Looked up results */}
            {lookedUpBookings.length > 0 && (
              <div className="space-y-8">
                <div className="text-center">
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                    Ghi nhận khách hàng: {lookedUpBookings[0].customerName} • {lookupEmail}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-center">
                  {lookedUpTickets.map((ticket) => {
                    const eventDetails = events.find(e => e.id === ticket.eventId);
                    return (
                      <div key={ticket.id} className="animate-fadeIn">
                        <TicketCard 
                          ticket={ticket}
                          date={eventDetails?.date || "12-10-2026"}
                          time={eventDetails?.startTime || "19:00"}
                          location={eventDetails?.location || "Địa điểm sự kiện"}
                          bannerGradient={eventDetails?.bannerGradient}
                          onPrint={() => window.print()}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ------------------- ROLE: GATE MANAGER QR CAMERA SCANNER ------------------- */}
        {role === 'gate' && (
          <div className="bg-slate-50 min-h-screen">
            <TicketGateScanner onScanResult={handleCheckInResult} />
          </div>
        )}

        {/* ------------------- ROLE: ADMIN MANAGER CONSOLE HUB ------------------- */}
        {role === 'admin' && (
          <div className="bg-slate-50 min-h-screen">
            <AdminHub 
              bookings={bookings}
              tickets={tickets}
              transactions={transactions}
              onManualApprove={handleManualApproveBooking}
              onManualCancel={handleManualCancelBooking}
              onResetDb={handleResetDatabaseAction}
              isLoading={isLoading}
              users={users}
              onAddUser={handleAddUserRole}
              onRemoveUser={handleRemoveUserRole}
              currentUserEmail={auth?.email}
            />
          </div>
        )}

      </main>

      {/* Persistent global mini disclaimer footer */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-[10px] text-gray-400 font-medium select-none flex-shrink-0">
        <p>© 2026 METATIX VIỆT NAM • XỬ LÝ VIETQR & SEPAY TỰ ĐỘNG KHÔNG CHỜ BILL</p>
        <p className="mt-1 text-slate-350">Xây dựng bền vững trên Express fullstack & React 19 sandboxed containers</p>
      </footer>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-scaleIn">
            <div className="text-center space-y-2">
              <div className="inline-block bg-indigo-50 text-indigo-750 p-3 rounded-full border border-indigo-100">
                <ShieldCheck className="w-8 h-8 text-indigo-650" />
              </div>
              <h3 className="text-base font-black uppercase text-slate-900">Đăng nhập nhân viên</h3>
              <p className="text-xs text-slate-500">
                {loginStep === 'email' && "Nhập email được phân quyền của bạn để tiếp tục."}
                {loginStep === 'password_set' && "Tài khoản chưa đặt mật khẩu. Vui lòng thiết lập mật khẩu cho lần đầu đăng nhập."}
                {loginStep === 'password_enter' && "Nhập mật khẩu tài khoản của bạn."}
              </p>
            </div>
            
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginStep === 'email' ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Địa chỉ Email</label>
                  <input
                    type="email"
                    required
                    placeholder="nhanvien@gmail.com..."
                    value={loginEmail}
                    onChange={(e) => { setLoginEmail(e.target.value); setLoginError(''); }}
                    className="w-full bg-slate-55 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-800 font-medium"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-slate-50 border border-slate-150 rounded-xl p-2.5 text-center text-xs font-semibold text-slate-600">
                    {loginEmail}
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {loginStep === 'password_set' ? "Đặt Mật Khẩu Mới" : "Mật Khẩu"}
                    </label>
                    <input
                      type="password"
                      required
                      placeholder={loginStep === 'password_set' ? "Tối thiểu 4 ký tự..." : "Nhập mật khẩu..."}
                      value={loginPassword}
                      onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }}
                      className="w-full bg-slate-55 border border-slate-205 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-800 font-medium"
                    />
                  </div>
                </div>
              )}
              
              {loginError && (
                <p className="text-[10px] text-rose-600 font-bold text-center bg-rose-50 border border-rose-100 py-1.5 rounded-lg">{loginError}</p>
              )}
              
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => { 
                    setShowLoginModal(false); 
                    setPendingRole(null); 
                    setLoginEmail(''); 
                    setLoginPassword(''); 
                    setLoginStep('email'); 
                    setLoginError(''); 
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase py-2.5 rounded-xl transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase py-2.5 rounded-xl transition shadow shadow-indigo-600/20 active:scale-95"
                >
                  {loginStep === 'email' ? "Tiếp tục" : (loginStep === 'password_set' ? "Đặt & Đăng nhập" : "Đăng nhập")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
export type { AppRole };
