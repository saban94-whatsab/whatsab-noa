import React from 'react';
import { useWhatsAppStore } from '../store/useWhatsAppStore';
import { Bell, ShoppingBag, MapPin, User, ArrowRight, X, Sparkles, CheckCircle2 } from 'lucide-react';

export const NewOrderToast: React.FC = () => {
  const { 
    activeNewOrderToast, 
    dismissNewOrderToast, 
    setIsAdminOpen, 
    setIsAdminAuthenticated, 
    setAdminTab 
  } = useWhatsAppStore();

  if (!activeNewOrderToast) return null;

  const handleOpenOrders = () => {
    setIsAdminAuthenticated(true);
    setAdminTab('orders');
    setIsAdminOpen(true);
    dismissNewOrderToast();
  };

  const handleOpenCustomers = () => {
    setIsAdminAuthenticated(true);
    setAdminTab('customers');
    setIsAdminOpen(true);
    dismissNewOrderToast();
  };

  return (
    <div 
      id="new-order-toast-banner"
      className="fixed top-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[9999] animate-bounce-short"
      dir="rtl"
    >
      <div className="bg-emerald-950/95 backdrop-blur-md border-2 border-emerald-500/60 rounded-2xl p-4 shadow-2xl text-white relative overflow-hidden ring-4 ring-emerald-500/20">
        {/* Animated background accent */}
        <div className="absolute -left-10 -top-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
        
        {/* Top Header Row */}
        <div className="flex items-center justify-between border-b border-emerald-800/80 pb-2.5 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                <Bell className="w-5 h-5 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-900/80 px-2 py-0.5 rounded-full border border-emerald-700/50">
                  Google Sheets Live Log
                </span>
                <span className="text-[11px] text-emerald-200/80 font-mono">
                  #{activeNewOrderToast.orderNumber}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                🚨 הזמנה חדשה נכנסה למערכת!
              </h4>
            </div>
          </div>

          <button
            id="dismiss-order-toast-btn"
            onClick={dismissNewOrderToast}
            className="p-1.5 text-emerald-300 hover:text-white hover:bg-emerald-800/60 rounded-lg transition-colors"
            title="סגור התראה"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Card Content */}
        <div className="space-y-2 text-xs text-emerald-100 bg-emerald-900/40 p-3 rounded-xl border border-emerald-800/60 mb-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold text-white">{activeNewOrderToast.customerName}</span>
          </div>

          {activeNewOrderToast.address && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">{activeNewOrderToast.address}</span>
            </div>
          )}

          <div className="flex items-start gap-2 pt-1 border-t border-emerald-800/40 mt-1">
            <ShoppingBag className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-medium text-emerald-200">פריטי ההזמנה: </span>
              <span className="text-emerald-100 font-sans">
                {activeNewOrderToast.items?.map(i => `${i.name} (x${i.quantity})`).join(', ') || 'ללא פירוט'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            id="toast-view-orders-btn"
            onClick={handleOpenOrders}
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md active:scale-95"
          >
            <span>לוג הזמנות</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </button>

          <button
            id="toast-view-customer-folder-btn"
            onClick={handleOpenCustomers}
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-600/50 text-emerald-200 font-semibold rounded-xl text-xs transition-all active:scale-95"
          >
            <span>תיק לקוח</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
