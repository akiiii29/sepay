import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { TicketData } from '../types';
import { Camera, ShieldAlert, BadgeCheck, X, DoorOpen, ListMusic, Volume2, ShieldCheck } from 'lucide-react';
import { formatISOToDateTime, sounds } from '../utils';

interface TicketGateScannerProps {
  onScanResult: (ticketId: string, gate: string) => Promise<{ success: boolean; message: string; ticket?: TicketData }>;
}

export default function TicketGateScanner({ onScanResult }: TicketGateScannerProps) {
  const [selectedGate, setSelectedGate] = useState('Cổng Chính');
  const [manualCode, setManualCode] = useState('');
  const [scanHistory, setScanHistory] = useState<{ id: string; name: string; type: string; status: 'SUCCESS' | 'FAILED'; message: string; time: string }[]>([]);
  
  // Highlight modal state
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [resultStatus, setResultStatus] = useState<'SUCCESS' | 'FAILED' | null>(null);
  const [resultMessage, setResultMessage] = useState('');
  const [scannedTicket, setScannedTicket] = useState<TicketData | null>(null);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const playSoundEnabled = true;

  // Initialize camera scanner
  useEffect(() => {
    // We only boot the scanner when the component is mounted
    console.log("Mounting Html5QrcodeScanner on reader container");
    
    // Config layout
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true
      },
      /* verbose= */ false
    );

    async function onScanSuccess(decodedText: string) {
      if (!decodedText) return;
      console.log(`[QR Code Scanned]:`, decodedText);
      
      // Stop scanning to process and prevent multiple rapid triggers
      // Wait, standard scanner has an action logic or we can just call API
      handleProcessCheckIn(decodedText);
    }

    function onScanFailure(error: any) {
      // Just silent logging, scanning is continuous
    }

    try {
      scanner.render(onScanSuccess, onScanFailure);
      scannerRef.current = scanner;
    } catch (e) {
      console.error("Camera source could not be initialized inside iframe:", e);
    }

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear().catch(err => {
            console.warn("Error clearing html5 qrcode scanner on unmount:", err);
          });
        } catch (e) {
          // ignore
        }
      }
    };
  }, [selectedGate]);

  // Main check-in verification logic
  const handleProcessCheckIn = async (code: string) => {
    const rawId = code.trim();
    if (!rawId) return;

    try {
      const response = await onScanResult(rawId, selectedGate);
      const isSuccess = response.success;
      
      // Play Audio feedbacks!
      if (isSuccess) {
        sounds.playBeepOk();
      } else {
        sounds.playBeepError();
      }

      // Add to session check-in logs list
      setScanHistory(prev => [
        {
          id: rawId,
          name: response.ticket?.customerName || "Vô danh / Không rõ",
          type: response.ticket?.ticketType || "Standard",
          status: isSuccess ? 'SUCCESS' : 'FAILED',
          message: response.message,
          time: new Date().toLocaleTimeString('vi-VN')
        },
        ...prev
      ]);

      // Pop visual overlay
      setResultStatus(isSuccess ? 'SUCCESS' : 'FAILED');
      setResultMessage(response.message);
      setScannedTicket(response.ticket || null);
      setShowResultOverlay(true);

    } catch (err: any) {
      sounds.playBeepError();
      setResultStatus('FAILED');
      setResultMessage(`Lỗi kết nối kiểm soát: ${err.message}`);
      setScannedTicket(null);
      setShowResultOverlay(true);
    }
  };

  // Manual Trigger handler
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    
    handleProcessCheckIn(manualCode);
    setManualCode('');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-md border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl">
            <DoorOpen className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Cổng Kiểm Soát Vé Ra Vào</h1>
            <p className="text-slate-400 text-xs mt-1">Sử dụng camera camera để quét QR Code trên vé hoặc nhập mã thủ công.</p>
          </div>
        </div>

        {/* Gate Select */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cổng kiểm soát:</span>
          <select
            value={selectedGate}
            onChange={(e) => setSelectedGate(e.target.value)}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white font-extrabold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
          >
            <option value="Cổng Chính">Cổng Chính (Main Gate)</option>
            <option value="Cổng Phía Đông">Cổng Phía Đông (East Gate)</option>
            <option value="Cổng Phía Tây">Cổng Phía Tây (West Gate)</option>
            <option value="Cổng VIP 1">Cổng VIP 1 (VIP Entrance)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Live camera feed */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-500" />
              Camera quét QR Code tự động
            </h2>
            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live camera active
            </span>
          </div>

          {/* QR Scan Container Stage */}
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-4">
            <div id="qr-reader" className="w-full max-w-md overflow-hidden bg-white text-xs border border-gray-100 rounded-xl"></div>
            
            <p className="text-[10px] text-indigo-400 font-semibold text-center mt-3">
              * Cho phép truy cập Camera trong trình duyệt để khởi chạy tự động.
            </p>
          </div>

          {/* Fallback Manual form */}
          <form onSubmit={handleManualSubmit} className="space-y-2 border-t border-slate-100 pt-6">
            <label className="text-xs font-bold text-slate-800 block">
              Gặp sự cố Camera? Nhập mã vé thủ công:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ví dụ: TK-19342-01..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 bg-slate-55 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-930 text-slate-900 shadow-inner"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition duration-150 shrink-0"
              >
                Xác thực Vé
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Scan histories feed */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-100 shadow-xl p-6 overflow-hidden flex flex-col h-[520px]">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-4 flex items-center gap-2 flex-shrink-0">
            <ListMusic className="w-5 h-5 text-indigo-500" />
            Nhật ký nạp khách ({selectedGate})
          </h2>

          <div className="divide-y divide-slate-100 overflow-y-auto flex-1 mt-4 space-y-4">
            {scanHistory.map((log, index) => (
              <div key={index} className="flex justify-between items-start py-3 first:pt-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-slate-800">{log.id}</span>
                    <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold uppercase">{log.type}</span>
                  </div>
                  <span className="text-xs text-slate-500 block">Khách hàng: <b>{log.name}</b></span>
                  <span className={`text-[10px] block font-medium ${
                    log.status === 'SUCCESS' ? 'text-emerald-700' : 'text-rose-600 font-bold'
                  }`}>
                    {log.message}
                  </span>
                </div>

                <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                    log.status === 'SUCCESS' 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                      : 'bg-rose-50 text-rose-800 border border-rose-100'
                  }`}>
                    {log.status === 'SUCCESS' ? 'Hợp lệ' : 'Từ chối'}
                  </span>
                  <span className="text-[9px] text-slate-350 font-mono mt-0.5">{log.time}</span>
                </div>
              </div>
            ))}

            {scanHistory.length === 0 && (
              <div className="text-center py-20 text-slate-400 flex flex-col items-center justify-center gap-2 h-full">
                <DoorOpen className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                <span className="text-xs font-medium">Chưa soát vé nào ở ca trực hiện tại.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verification Overlay Modal */}
      {showResultOverlay && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden text-center transform transition-all duration-300 scale-100 flex flex-col">
            
            {/* Colored Header indicator */}
            <div className={`p-8 flex flex-col items-center justify-center ${
              resultStatus === 'SUCCESS' 
                ? 'bg-emerald-500 text-white' 
                : 'bg-rose-500 text-white'
            }`}>
              {resultStatus === 'SUCCESS' ? (
                <div className="bg-white/20 p-4 rounded-full animate-pulse text-white mb-4">
                  <ShieldCheck className="w-16 h-16" />
                </div>
              ) : (
                <div className="bg-white/20 p-4 rounded-full animate-bounce text-white mb-4">
                  <ShieldAlert className="w-16 h-16" />
                </div>
              )}

              <h3 className="text-2xl font-black uppercase tracking-tight">
                {resultStatus === 'SUCCESS' ? 'VÉ HỢP LỆ • OK ADMIT' : 'CẢNH BÁO • REJECTED'}
              </h3>
            </div>

            {/* Results Details message */}
            <div className="p-8 space-y-6 flex-1 flex flex-col justify-between">
              <p className={`text-sm leading-relaxed font-bold ${
                resultStatus === 'SUCCESS' ? 'text-gray-800' : 'text-rose-700 font-extrabold text-base'
              }`}>
                {resultMessage}
              </p>

              {scannedTicket && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-405 text-[10px] uppercase font-bold text-gray-400 tracking-wider">Họ tên khách</span>
                      <span className="text-gray-800 font-extrabold block">{scannedTicket.customerName}</span>
                    </div>
                    <div>
                      <span className="text-slate-405 text-[10px] uppercase font-bold text-gray-400 tracking-wider">Loại vé</span>
                      <span className="text-purple-700 font-extrabold block uppercase">{scannedTicket.ticketType}</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-150 pt-2 mt-2">
                    <span className="text-slate-405 text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Sự kiện tham gia</span>
                    <span className="text-gray-700 font-medium block line-clamp-1">{scannedTicket.eventTitle}</span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowResultOverlay(false)}
                className={`w-full py-3 rounded-2xl font-black text-xs text-white uppercase tracking-wider transition shadow-lg ${
                  resultStatus === 'SUCCESS' 
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' 
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                }`}
              >
                Tiếp tục quét cổng (OK)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
