import React from 'react';
import { EventData } from '../types';
import { Calendar, MapPin, Tag, ArrowRight } from 'lucide-react';
import { formatVND } from '../utils';

interface EventCardProps {
  key?: string | number | null;
  event: EventData;
  onSelect: (event: EventData) => void;
}

export default function EventCard({ event, onSelect }: EventCardProps) {
  // Find minimum price
  const prices = event.ticketTypes.map(t => t.price);
  const minPrice = Math.min(...prices);

  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col group h-full">
      {/* Decorative Event Header with beautiful Gradient */}
      <div 
        style={{ backgroundImage: event.bannerGradient }}
        className="h-44 px-6 py-6 text-white relative flex flex-col justify-between overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-xl pointer-events-none"></div>

        <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase w-fit block border border-white/10">
          🔥 SẮP DIỄN RA
        </span>

        <div>
          <h3 className="text-lg font-black tracking-tight leading-snug line-clamp-2 uppercase group-hover:text-indigo-200 transition">
            {event.title}
          </h3>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
        <div className="space-y-4">
          <p className="text-xs text-gray-500 leading-relaxed font-normal line-clamp-3">
            {event.description}
          </p>

          <div className="space-y-2.5">
            <div className="flex items-center text-xs text-gray-600">
              <Calendar className="w-4 h-4 text-indigo-500 mr-2 flex-shrink-0" />
              <span className="font-semibold">{event.date} • {event.startTime}</span>
            </div>
            <div className="flex items-start text-xs text-gray-600">
              <MapPin className="w-4 h-4 text-rose-500 mr-2 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
          </div>
        </div>

        {/* Pricing & Ticket Types footer list */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Giá vé từ</span>
            <span className="text-base font-black text-slate-900">{formatVND(minPrice)}</span>
          </div>

          <button
            onClick={() => onSelect(event)}
            className="bg-slate-900 group-hover:bg-indigo-600 text-white font-bold text-xs p-3 px-4 rounded-2xl flex items-center gap-1 transition duration-200 shadow-sm"
          >
            Mua vé ngay
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
