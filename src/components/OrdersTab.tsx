import React, { useState } from 'react';
import { Package, Truck, Navigation, Copy, Check, AlertTriangle, MessageSquare, Sparkles, Filter, Plus } from 'lucide-react';
import { useWhatsAppStore, formatWhatsAppOutboundTemplate } from '../store/useWhatsAppStore';

export const OrdersTab: React.FC = () => {
  const { orders, processGroupOrderMessage } = useWhatsAppStore();
  const [filterOrigin, setFilterOrigin] = useState<'all' | 'whatsapp' | 'comax'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const filteredOrders = orders.filter((o) => {
    if (filterOrigin === 'all') return true;
    return o.origin === filterOrigin;
  });

  const handleCopyTemplate = (orderId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(orderId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleTriggerSampleOrder = async () => {
    setIsSimulating(true);
    try {
      await processGroupOrderMessage(
        'משה כהן (קבלן שלד)',
        'שלום נועה, צריכים דחוף 80 שקי מלט אפור ו-4 בלות חול עם מנוף לקומה 3 ברמת גן',
        '120363390702096083@g.us',
        { '10002': 30 } // Comax PDF has 30 bags (triggering +50 discrepancy audit alert)
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#202c33] p-4 rounded-xl border border-[#2a3942]">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#8696a0]" />
          <span className="text-xs text-[#8696a0]">סינון לפי מקור:</span>
          <div className="flex gap-1 bg-[#111b21] p-1 rounded-lg border border-[#2a3942]">
            <button
              onClick={() => setFilterOrigin('all')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                filterOrigin === 'all'
                  ? 'bg-[#00a884] text-[#111b21] font-bold'
                  : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
              id="filter-order-all"
            >
              הכל ({orders.length})
            </button>
            <button
              onClick={() => setFilterOrigin('whatsapp')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                filterOrigin === 'whatsapp'
                  ? 'bg-[#00a884] text-[#111b21] font-bold'
                  : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
              id="filter-order-whatsapp"
            >
              💬 WhatsApp
            </button>
            <button
              onClick={() => setFilterOrigin('comax')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                filterOrigin === 'comax'
                  ? 'bg-[#00a884] text-[#111b21] font-bold'
                  : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
              id="filter-order-comax"
            >
              ✨ Comax
            </button>
          </div>
        </div>

        <button
          onClick={handleTriggerSampleOrder}
          disabled={isSimulating}
          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-emerald-950/40 disabled:opacity-50"
          id="btn-simulate-order"
        >
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span>{isSimulating ? 'מעבד הזמנה...' : 'הפעל סימולציית הזמנה בקבוצת הזמנות (JONI)'}</span>
        </button>
      </div>

      {/* Orders List Grid */}
      <div className="space-y-4">
        {filteredOrders.map((ord) => {
          const templateStr = ord.formattedTemplate || formatWhatsAppOutboundTemplate(ord);

          return (
            <div
              key={ord.orderNumber}
              className={`bg-[#202c33] border rounded-xl p-5 transition-all space-y-4 ${
                ord.discrepancyFlag
                  ? 'border-amber-500/60 bg-gradient-to-br from-[#202c33] via-[#202c33] to-amber-950/20'
                  : 'border-[#2a3942]'
              }`}
              id={`order-card-${ord.orderNumber}`}
            >
              {/* Order Card Top Banner */}
              <div className="flex flex-wrap justify-between items-center gap-2 border-b border-[#2a3942] pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#00a884]/20 text-[#00a884]">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-[#e9edef] text-base font-mono">{ord.orderNumber}</h4>
                      <span className="text-xs px-2 py-0.5 rounded bg-[#111b21] border border-[#2a3942] text-[#8696a0]">
                        {ord.origin === 'comax' ? '✨ הזמנת קומקס' : '💬 קבוצת וווטסאפ'}
                      </span>
                      {ord.discrepancyFlag && (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>חריגת כמות!</span>
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#8696a0]">
                      לקוח: <strong className="text-[#e9edef]">{ord.customerName}</strong> ({ord.customerPhone})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={ord.wazeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-cyan-950 text-cyan-400 border border-cyan-700 hover:bg-cyan-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    id={`btn-waze-${ord.orderNumber}`}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>ניווט Waze</span>
                  </a>

                  <button
                    onClick={() => handleCopyTemplate(ord.orderNumber, templateStr)}
                    className="px-3 py-1.5 bg-[#111b21] text-[#00a884] border border-[#00a884]/40 hover:bg-[#00a884]/20 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    id={`btn-copy-template-${ord.orderNumber}`}
                  >
                    {copiedId === ord.orderNumber ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>הועתק!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>העתק פורמט וואטסאפ (Section 4)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Order Logistics Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Logistics Info */}
                <div className="bg-[#111b21] p-3 rounded-lg border border-[#2a3942] space-y-1 text-[#8696a0]">
                  <p>🚚 <strong className="text-[#e9edef]">מחסן יוצא:</strong> {ord.warehouse}</p>
                  <p>📍 <strong className="text-[#e9edef]">כתובת אספקה:</strong> {ord.address}</p>
                  <p>👨‍✈️ <strong className="text-[#e9edef]">נהג מנוף:</strong> {ord.driverName}</p>
                  <p>⏱️ <strong className="text-[#e9edef]">מרחק וזמן:</strong> {ord.distance} ({ord.duration})</p>
                </div>

                {/* Items List */}
                <div className="bg-[#111b21] p-3 rounded-lg border border-[#2a3942] space-y-1.5">
                  <span className="text-[#8696a0] font-semibold block border-b border-[#2a3942] pb-1">🛒 פירוט פריטים ומק"טים:</span>
                  <ul className="space-y-1">
                    {ord.items.map((it, idx) => (
                      <li key={idx} className="flex justify-between items-center text-[#e9edef]">
                        <span>• <span className="font-mono text-cyan-400">{it.sku}</span> {it.name}</span>
                        <strong className="font-mono bg-[#202c33] px-2 py-0.5 rounded text-[#00a884]">
                          {it.quantity} {it.unit || 'יח\''}
                        </strong>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Blow & Pallet Status */}
                <div className="bg-[#111b21] p-3 rounded-lg border border-[#2a3942] space-y-1 text-[#8696a0]">
                  <span className="text-[#8696a0] font-semibold block border-b border-[#2a3942] pb-1">🛡️ אימות פקדונות וסטטוס:</span>
                  <p>• <strong className="text-[#e9edef]">בלות:</strong> {ord.blowStatus}</p>
                  <p>• <strong className="text-[#e9edef]">משטחים:</strong> {ord.palletStatus}</p>
                  <p>• <strong className="text-[#e9edef]">סטטוס לוגיסטי:</strong> <span className="text-[#00a884] font-bold">{ord.status}</span></p>
                </div>
              </div>

              {/* Pre-formatted WhatsApp Output Preview */}
              <div className="bg-[#111b21] p-3 rounded-lg border border-[#2a3942]">
                <span className="text-[11px] text-[#8696a0] block mb-1">📱 תצוגה מקדימה של הפורמט היוצא לוואטסאפ (Section 4):</span>
                <pre className="font-sans text-xs text-[#e9edef] whitespace-pre-wrap leading-relaxed dir-rtl bg-[#0b141a] p-3 rounded border border-[#2a3942]">
                  {templateStr}
                </pre>
              </div>
            </div>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="py-12 text-center text-[#8696a0] bg-[#202c33] rounded-xl border border-[#2a3942]">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>אין הזמנות ברשימה.</p>
          </div>
        )}
      </div>
    </div>
  );
};
