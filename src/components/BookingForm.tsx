import React, { useState } from 'react';
import { EventData, EventTicketType } from '../types';
import { User, Mail, Phone, Ticket, Tag, Users, AlertCircle, ArrowLeft } from 'lucide-react';
import { formatVND } from '../utils';

interface BookingFormProps {
  event: EventData;
  onSubmit: (formData: {
    ticketType: string;
    quantity: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  }) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export default function BookingForm({ event, onSubmit, onBack, isSubmitting }: BookingFormProps) {
  const [selectedType, setSelectedType] = useState<string>(event.ticketTypes[0].id);
  const [quantity, setQuantity] = useState<number>(1);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [errorMess, setErrorMess] = useState('');

  // Find info about selected ticket tier
  const ticketInfo = event.ticketTypes.find(t => t.id === selectedType) as EventTicketType;
  const totalCost = ticketInfo ? ticketInfo.price * quantity : 0;
  const remaining = ticketInfo ? ticketInfo.totalLimit - ticketInfo.soldCount : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMess('');

    if (!customerName.trim() || !customerEmail.trim()) {
      setErrorMess("Họ tên & Email không được để trống!");
      return;
    }

    if (quantity < 1 || quantity > 5) {
      setErrorMess("Số lượng mua tối đa là 5 vé trên mỗi đơn đặt.");
      return;
    }

    if (quantity > remaining) {
      setErrorMess(`Rất tiếc! Chỉ còn ${remaining} vé thuộc loại này.`);
      return;
    }

    onSubmit({
      ticketType: selectedType,
      quantity,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.trim()
    });
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden animate-fadeIn">
      {/* Decorative header */}
      <div 
        style={{ backgroundImage: event.bannerGradient }}
        className="px-6 py-8 text-white relative"
      >
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 text-white/80 hover:text-white flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl transition backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại sự kiện
        </button>

        <div className="text-center pt-6 space-y-2">
          <span className="text-[10px] bg-white/20 border border-white/10 px-3 py-1 rounded-full uppercase tracking-wider font-semibold">
            Đăng Ký Đặt Vé • Step 1 of 3
          </span>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight line-clamp-1">{event.title}</h2>
          <p className="text-xs text-slate-200">{event.date} @ {event.startTime} • {event.location}</p>
        </div>
      </div>

      {/* Booking Form body */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
        {errorMess && (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex gap-2.5 items-start text-xs text-rose-800 font-medium">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p>{errorMess}</p>
          </div>
        )}

        {/* Part 1: Select ticket type */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-indigo-500" />
            Bước 1: Chọn Hạng Vé (Ticket Tier)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {event.ticketTypes.map((type) => {
              const leftCount = type.totalLimit - type.soldCount;
              const isSoldOut = leftCount <= 0;
              
              return (
                <div
                  key={type.id}
                  onClick={() => !isSoldOut && setSelectedType(type.id)}
                  className={`border-2 rounded-2xl p-4 cursor-pointer transition-all duration-150 flex flex-col justify-between h-36 ${
                    isSoldOut 
                      ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                      : selectedType === type.id
                      ? 'bg-indigo-50/50 border-indigo-600 ring-4 ring-indigo-50'
                      : 'bg-white border-slate-150 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="font-extrabold text-sm text-slate-900 block">{type.name}</span>
                      {selectedType === type.id && !isSoldOut && (
                        <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">✓</div>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{type.description}</p>
                  </div>

                  <div className="flex justify-between items-end border-t border-slate-100 pt-3 mt-2">
                    <span className="text-sm font-black text-indigo-700">{formatVND(type.price)}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      isSoldOut 
                        ? 'bg-red-100 text-red-800'
                        : leftCount < 15
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-105 text-slate-600'
                    }`}>
                      {isSoldOut ? 'Hết vé' : `Còn ${leftCount} vé`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Part 2: Select ticket quantity */}
        <div className="space-y-3 pt-2">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-indigo-500" />
            Bước 2: Chọn Số Lượng Mua
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold flex items-center justify-center transition border border-slate-200"
            >
              -
            </button>
            <span className="w-14 text-center text-lg font-black font-mono">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(q => Math.min(5, q + 1))}
              className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center transition border border-slate-200"
            >
              +
            </button>
            <span className="text-[11px] text-slate-400 font-semibold italic ml-2">
              (* Tối đa 5 vé trên mỗi giao dịch)
            </span>
          </div>
        </div>

        {/* Part 3: Customer Information */}
        <div className="space-y-3.5 pt-2">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-4 h-4 text-indigo-500" />
            Bước 3: Nhập Thông Tin Khách Nhận Vé
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Họ và tên người mua</span>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-55 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900 shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Địa chỉ Email</span>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="email"
                  placeholder="nguyenvana@gmail.com"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full bg-slate-55 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900 shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-1 md:col-span-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Số Điện Thoại liên hệ</span>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="tel"
                  placeholder="Ví dụ: 0912345678"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-slate-55 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900 shadow-inner"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pricing calculation footer */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <div className="text-xs text-slate-400 font-semibold">Tạm tính ({quantity} x {ticketInfo?.name})</div>
            <div className="text-2xl font-black text-indigo-700 mt-1">{formatVND(totalCost)}</div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white hover:shadow-lg font-black text-xs uppercase tracking-wider py-3.5 px-8 rounded-2xl transition duration-150 disabled:opacity-50"
          >
            {isSubmitting ? 'Đăng đăng ký...' : 'Xác nhận Đặt vé'}
          </button>
        </div>
      </form>
    </div>
  );
}
