import React from 'react';
import { TicketData } from '../types';
import { Download, Check, Clipboard, Calendar, MapPin, User, Tag } from 'lucide-react';
import { formatVND } from '../utils';

interface TicketCardProps {
  ticket: TicketData;
  date: string;
  time: string;
  location: string;
  bannerGradient?: string;
  onPrint?: () => void;
}

export default function TicketCard({ ticket, date, time, location, bannerGradient, onPrint }: TicketCardProps) {
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(ticket.id)}`;
  const defaultGradient = "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)";

  return (
    <div className="max-w-md w-full mx-auto bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col transition-all duration-300 hover:shadow-3xl">
      {/* Ticket Header Graphic banner */}
      <div 
        style={{ backgroundImage: bannerGradient || defaultGradient }}
        className="px-6 py-6 text-white relative overflow-hidden flex flex-col justify-between h-40"
      >
        {/* Subtle geometric circles */}
        <div className="absolute top-[-20%] right-[-10%] w-48 h-48 rounded-full bg-white/5 pointer-events-none blur-xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-32 h-32 rounded-full bg-white/10 pointer-events-none blur-lg"></div>

        <div className="flex justify-between items-start z-10">
          <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase">
            Vé Điện Tử • E-Ticket
          </div>
          <div className="text-right">
            <span className="text-xs text-indigo-200 uppercase font-mono tracking-widest block">Mã Cuống Vé</span>
            <span className="text-sm font-bold font-mono tracking-tight">{ticket.id}</span>
          </div>
        </div>

        <div className="z-10 mt-auto">
          <h3 className="text-xl font-bold tracking-tight line-clamp-1 text-white uppercase">{ticket.eventTitle}</h3>
        </div>
      </div>

      {/* Ticket Body Details */}
      <div className="p-6 bg-white relative flex-1 flex flex-col justify-between">
        {/* Event info details */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] uppercase font-semibold text-gray-400 block tracking-wider">Thời gian</span>
              <div className="flex items-center text-gray-700 mt-1">
                <Calendar className="w-4 h-4 text-indigo-500 mr-2 flex-shrink-0" />
                <span className="text-sm font-medium">{date} - {time}</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-gray-400 block tracking-wider">Hạt vé</span>
              <div className="flex items-center mt-1">
                <Tag className="w-4 h-4 text-purple-500 mr-2 flex-shrink-0" />
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  ticket.ticketType.toLowerCase().includes('vip') || ticket.ticketType.toLowerCase().includes('premium')
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-indigo-50 text-indigo-800 border border-indigo-100'
                }`}>
                  {ticket.ticketType}
                </span>
              </div>
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase font-semibold text-gray-400 block tracking-wider">Địa điểm tổ chức</span>
            <div className="flex items-start text-gray-600 mt-1">
              <MapPin className="w-4 h-4 text-rose-500 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-xs font-normal line-clamp-1">{location}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-200 pt-4">
            <span className="text-[10px] uppercase font-semibold text-gray-400 block tracking-wider">Khách hàng nhận vé</span>
            <div className="flex items-center text-gray-800 mt-1.5">
              <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mr-2 flex-shrink-0 text-xs font-semibold uppercase">
                {ticket.customerName.charAt(0)}
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-900 block">{ticket.customerName}</span>
                <span className="text-xs text-gray-400 block">{ticket.customerEmail}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Checked status label */}
        {ticket.checkedIn ? (
          <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 flex items-center justify-center text-emerald-800 text-xs font-semibold">
            <Check className="w-4 h-4 mr-1.5 text-emerald-600" />
            ĐÃ KÍCH HOẠT VÀ SOÁT Vé tại {ticket.gateChecked || 'Cổng'}
          </div>
        ) : (
          <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex items-center justify-center text-gray-500 text-xs font-medium">
            Mã vé chưa soát. Vui lòng xuất QR tại cổng vào.
          </div>
        )}
      </div>

      {/* Jagged perforation Ticket Divider */}
      <div className="relative bg-white flex items-center justify-between px-1 h-4">
        {/* Left cutout circle */}
        <div className="w-4 h-8 bg-slate-50 border-r border-gray-200 rounded-r-full -ml-1"></div>
        {/* Dashed line */}
        <div className="w-full border-t border-dashed border-gray-300 mx-2"></div>
        {/* Right cutout circle */}
        <div className="w-4 h-8 bg-slate-50 border-l border-gray-200 rounded-l-full -mr-1"></div>
      </div>

      {/* Ticket Footer QR part */}
      <div className="bg-slate-50 p-6 flex flex-col items-center justify-center text-center">
        <div className="bg-white p-3 rounded-2xl shadow-md border border-gray-100 inline-block">
          <img 
            src={qrCodeUrl} 
            alt={`Mã QR vé ${ticket.id}`} 
            className="w-40 h-40 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <p className="font-mono text-xs text-gray-500 mt-3 font-semibold uppercase tracking-wider">{ticket.id}</p>
        <span className="text-[10px] text-gray-400 mt-1 max-w-xs block leading-normal">
          Quét mã QR tại cổng kiểm soát để xác minh quyền ra vào sự kiện. Không chia sẻ mã này với người khác.
        </span>

        {onPrint && (
          <button 
            onClick={onPrint}
            className="mt-4 flex items-center text-indigo-600 hover:text-indigo-800 font-semibold text-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Tải vé dạng ảnh (In vé)
          </button>
        )}
      </div>
    </div>
  );
}
