import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, CheckCircle2, Clock, FileSpreadsheet, MessageSquare, AlertCircle } from 'lucide-react';
import { useWhatsAppStore } from '../store/useWhatsAppStore';

export const DiscrepanciesTab: React.FC = () => {
  const { discrepancies, resolveDiscrepancy } = useWhatsAppStore();
  const [resolveNote, setResolveNote] = useState('');
  const [activeResolvingId, setActiveResolvingId] = useState<string | null>(null);

  const pendingDiscrepancies = discrepancies.filter((d) => d.status === 'PENDING_REVIEW');
  const resolvedDiscrepancies = discrepancies.filter((d) => d.status === 'RESOLVED');

  const handleConfirmResolve = (id: string) => {
    resolveDiscrepancy(id, resolveNote || 'אישור מנהל אוטומטי - חריגה אושרה העמסה');
    setActiveResolvingId(null);
    setResolveNote('');
  };

  return (
    <div className="space-y-6">
      {/* Alert Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/80 via-amber-900/40 to-amber-950/80 border border-amber-600/50 rounded-xl p-5 text-amber-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/40">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">מערכת בקרת חריגות והצלבנט מול קומקס (חריגות_לוגיסטיות)</h3>
            <p className="text-xs text-amber-300">
              מצליבה אוטומטית בין כמויות מבוקשות בוואטסאפ לבין מסמכי PDF ויומני קומקס להגנה מחריגות העמסה
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded-lg text-xs font-mono font-bold text-amber-300">
            {pendingDiscrepancies.length} חריגות ממתינות לאישור
          </div>
        </div>
      </div>

      {/* Pending Discrepancies List */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-[#e9edef] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span>חריגות ממתינות לבדיקה ואישור מנהל ({pendingDiscrepancies.length})</span>
        </h4>

        {pendingDiscrepancies.map((d) => (
          <div
            key={d.id}
            className="bg-[#202c33] border border-amber-500/60 rounded-xl p-5 space-y-4 shadow-lg shadow-amber-950/20"
            id={`discrepancy-card-${d.id}`}
          >
            <div className="flex flex-wrap justify-between items-start gap-2 border-b border-[#2a3942] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-700 text-xs font-bold">
                    חומרה גבוהה ({d.severity})
                  </span>
                  <h4 className="font-bold text-[#e9edef] text-base font-mono">{d.orderNumber}</h4>
                  <span className="text-xs text-[#8696a0]">({d.timestamp})</span>
                </div>
                <p className="text-xs text-[#8696a0] mt-0.5">
                  לקוח: <strong className="text-[#e9edef]">{d.customerName}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {activeResolvingId === d.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="הזן סיבת אישור מנהל..."
                      value={resolveNote}
                      onChange={(e) => setResolveNote(e.target.value)}
                      className="px-3 py-1.5 bg-[#111b21] border border-[#2a3942] rounded-lg text-xs text-[#e9edef] focus:outline-none focus:border-[#00a884]"
                    />
                    <button
                      onClick={() => handleConfirmResolve(d.id)}
                      className="px-3 py-1.5 bg-[#00a884] hover:bg-[#008f70] text-[#111b21] font-bold text-xs rounded-lg transition-colors"
                      id={`btn-confirm-resolve-${d.id}`}
                    >
                      אשר העמסה
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveResolvingId(d.id)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-[#111b21] font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                    id={`btn-resolve-${d.id}`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>אישור מנהל לחריגה</span>
                  </button>
                )}
              </div>
            </div>

            {/* Comparison Visual Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#111b21] p-4 rounded-xl border border-[#2a3942]">
              <div className="space-y-1">
                <span className="text-xs text-[#8696a0] flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                  <span>כמות מבוקשת בוואטסאפ:</span>
                </span>
                <span className="text-xl font-bold font-mono text-cyan-400">{d.whatsappQty} שקים</span>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-[#8696a0] flex items-center gap-1">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-rose-400" />
                  <span>כמות במסמך PDF / קומקס:</span>
                </span>
                <span className="text-xl font-bold font-mono text-rose-400">{d.comaxPdfQty} שקים</span>
              </div>

              <div className="space-y-1 bg-amber-950/40 p-2 rounded-lg border border-amber-800/40">
                <span className="text-xs text-amber-300 font-semibold block">🚨 פער חריגה לא מאושר:</span>
                <span className="text-xl font-bold font-mono text-amber-400">+{d.difference} שקים חורגים!</span>
              </div>
            </div>

            {/* Exception Notes */}
            <p className="text-xs text-amber-200 bg-amber-950/20 p-3 rounded-lg border border-amber-800/40">
              📌 <strong>פרטי חריגה:</strong> {d.notes}
            </p>
          </div>
        ))}

        {pendingDiscrepancies.length === 0 && (
          <div className="py-8 text-center text-[#8696a0] bg-[#202c33] rounded-xl border border-[#2a3942]">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-emerald-300 font-semibold">אין חריגות לוגיסטיות ממתינות! כל ההזמנות תואמות את רישומי קומקס.</p>
          </div>
        )}
      </div>

      {/* Resolved Discrepancies History */}
      {resolvedDiscrepancies.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-[#2a3942]">
          <h4 className="text-xs font-bold text-[#8696a0]">חריגות שאושרו על ידי מנהל ({resolvedDiscrepancies.length})</h4>
          <div className="space-y-2">
            {resolvedDiscrepancies.map((d) => (
              <div key={d.id} className="bg-[#111b21] p-3 rounded-lg border border-[#2a3942] flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-[#e9edef] font-mono">{d.orderNumber}</span> • {d.customerName} ({d.productName}) - פער +{d.difference}
                </div>
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>אושר: {d.notes}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
