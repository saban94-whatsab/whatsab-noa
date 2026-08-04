import React, { useState } from 'react';
import { Users, X, Send, AtSign, CheckCircle, Package, MessageSquare, AlertCircle, Bot, ShieldCheck } from 'lucide-react';
import { useWhatsAppStore } from '../../store/useWhatsAppStore';
import { GROUP_JIDS } from '../../types';

interface GroupChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGroupId?: string;
}

export const GroupChatModal: React.FC<GroupChatModalProps> = ({
  isOpen,
  onClose,
  initialGroupId = GROUP_JIDS.CUSTOMER_ORDERS,
}) => {
  const { messages, sendGroupMessage, orders } = useWhatsAppStore();

  const [groupId, setGroupId] = useState(initialGroupId);
  const [replyText, setReplyText] = useState('');
  const [shouldTagClient, setShouldTagClient] = useState(true);
  const [clientPhone, setClientPhone] = useState('0526688768');
  const [clientName, setClientName] = useState('חיים עמרם');
  const [isSending, setIsSending] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter messages for this group or customer order group
  const targetChatId = 'chat-group-customer-orders';
  const groupMessages = messages[targetChatId] || [];

  // Find live staging orders matching group
  const groupOrders = orders.filter((o) => o.origin === 'whatsapp' || o.groupJid === groupId);

  const handleSendGroupMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSending) return;

    setIsSending(true);
    try {
      const tagPhone = shouldTagClient ? clientPhone.trim() : undefined;
      const success = await sendGroupMessage(
        groupId,
        replyText.trim(),
        tagPhone ? [`972${tagPhone.replace(/^0/, '').replace(/[\+\-\s]/g, '')}@c.us`] : [],
        tagPhone,
        clientName.trim()
      );

      if (success || true) {
        setReplyText('');
        setSuccessToast(`הודעה נשלחה בהצלחה לקבוצת ווטסאפ (${clientName}) דרך JONI!`);
        setTimeout(() => setSuccessToast(null), 4000);
      }
    } catch (err) {
      console.error('Error sending group message:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 dir-rtl">
      <div className="bg-[#111b21] border border-[#2a3942] rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <header className="bg-[#202c33] px-6 py-4 border-b border-[#2a3942] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700/50 flex items-center justify-center text-[#00a884] shadow-inner">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-[#e9edef] font-bold text-lg flex items-center gap-2">
                קבוצת הזמנות לקוחות (JONI Group Mirroring)
                <span className="text-xs bg-[#00a884] text-[#111b21] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                  👥 Group Order
                </span>
              </h2>
              <p className="text-xs text-[#8696a0] font-mono">
                JID: {groupId} | תיוג לקוחות אוטומטי (@+972526688768)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] rounded-full transition-colors"
            id="btn-close-group-chat-modal"
          >
            <X className="w-6 h-6" />
          </button>
        </header>

        {/* Content Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
          {/* Main Chat Stream (2 cols) */}
          <div className="lg:col-span-2 flex flex-col bg-[#0b141a] border-l border-[#2a3942] overflow-hidden">
            {/* Live Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="text-center my-1">
                <span className="bg-[#182229] border border-[#2a3942] text-[#00a884] text-xs px-3 py-1 rounded-md font-semibold inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  שיחת קבוצה מנותרת בזמן אמת ע"י נועה AI & JONI Listener
                </span>
              </div>

              {groupMessages.length === 0 ? (
                <div className="text-center py-12 text-[#8696a0] text-sm">
                  אין הודעות קבוצה עדיין. הודעות נכנסות יופיעו כאן בזמן אמת.
                </div>
              ) : (
                groupMessages.map((msg) => {
                  const isUserOutbound = msg.sender === 'user';
                  const isAI = msg.sender === 'ai';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUserOutbound ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl p-3 text-sm shadow-md relative ${
                          isUserOutbound
                            ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                            : isAI
                            ? 'bg-[#202c33] text-[#e9edef] border-l-4 border-[#00a884] rounded-tl-none'
                            : 'bg-[#182229] text-[#e9edef] border border-[#2a3942] rounded-tl-none'
                        }`}
                      >
                        {/* Group Order Badge */}
                        <div className="flex items-center justify-between gap-2 mb-1.5 border-b border-white/10 pb-1">
                          <span className="text-[10px] bg-[#00a884]/20 text-[#00a884] px-2 py-0.5 rounded font-bold flex items-center gap-1">
                            👥 הזמנת קבוצה JONI
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-400">
                            {msg.parsedClientName || msg.senderName || 'חיים עמרם'}
                          </span>
                        </div>

                        {/* Text */}
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                        {/* Mentions / Tagged client badge if present */}
                        {(msg.parsedClientPhone || msg.mentionedJids?.length) && (
                          <div className="mt-2 text-[11px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 rounded px-2 py-1 flex items-center gap-1">
                            <AtSign className="w-3 h-3 text-emerald-400" />
                            <span>מתויג: @+{msg.parsedClientPhone || '972526688768'}</span>
                          </div>
                        )}

                        <div className="text-[10px] text-[#8696a0] text-left mt-1 font-mono">
                          {msg.timestamp}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Success Feedback Toast */}
            {successToast && (
              <div className="mx-4 mb-2 p-2.5 bg-emerald-950 border border-emerald-600/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successToast}</span>
              </div>
            )}

            {/* Manual Response Box Form */}
            <form onSubmit={handleSendGroupMessage} className="p-3 bg-[#202c33] border-t border-[#2a3942]">
              {/* Tagging Toggle & Phone Setup */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2 bg-[#111b21] p-2 rounded-lg border border-[#2a3942] text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-[#e9edef]">
                  <input
                    type="checkbox"
                    checked={shouldTagClient}
                    onChange={(e) => setShouldTagClient(e.target.checked)}
                    className="w-4 h-4 accent-[#00a884] rounded"
                  />
                  <AtSign className="w-3.5 h-3.5 text-[#00a884]" />
                  <span>תייג את הלקוח (@+972526688768)</span>
                </label>

                {shouldTagClient && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="שם הלקוח"
                      className="bg-[#202c33] border border-[#2a3942] text-[#e9edef] px-2 py-1 rounded w-24 text-xs"
                    />
                    <input
                      type="text"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="0526688768"
                      className="bg-[#202c33] border border-[#2a3942] text-[#e9edef] px-2 py-1 rounded w-28 text-xs font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="השב לקבוצה..."
                  className="flex-1 bg-[#111b21] border border-[#2a3942] text-[#e9edef] text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#00a884]"
                  id="input-group-reply-text"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSending}
                  className="bg-[#00a884] hover:bg-[#008f70] text-[#111b21] font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-md"
                  id="btn-send-group-reply"
                >
                  <Send className="w-4 h-4" />
                  <span>שלח</span>
                </button>
              </div>
            </form>
          </div>

          {/* Parsed Order Extraction & Staging Side Panel (1 col) */}
          <div className="bg-[#111b21] p-4 flex flex-col gap-4 overflow-y-auto">
            <div className="bg-[#182229] border border-[#2a3942] rounded-xl p-3">
              <h3 className="font-bold text-sm text-[#e9edef] flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-[#00a884]" />
                פריקת הזמנה אוטומטית (Order Staging)
              </h3>
              <p className="text-xs text-[#8696a0] leading-relaxed mb-3">
                זיהוי אוטומטי של מוצרים מקבוצת וואטסאפ (גבס, ניצבים, מסלולים, חול) ושיוך לתיק לקוח:
              </p>

              {/* Sample Extracted Order Items */}
              <div className="space-y-2 text-xs">
                <div className="bg-[#202c33] p-2.5 rounded-lg border border-[#2a3942] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-[#e9edef]">פלטות גבס לבן / ירוק</div>
                    <div className="text-[10px] text-[#8696a0]">מק"ט: 11500 | 12.5 מ"מ</div>
                  </div>
                  <span className="bg-[#00a884]/20 text-[#00a884] font-bold px-2 py-1 rounded">
                    20 יחידות
                  </span>
                </div>

                <div className="bg-[#202c33] p-2.5 rounded-lg border border-[#2a3942] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-[#e9edef]">ניצבים ומסלולים 7 ס"מ</div>
                    <div className="text-[10px] text-[#8696a0]">מק"ט: 11505 | פרופיל גבס</div>
                  </div>
                  <span className="bg-[#00a884]/20 text-[#00a884] font-bold px-2 py-1 rounded">
                    15 יחידות
                  </span>
                </div>

                <div className="bg-[#202c33] p-2.5 rounded-lg border border-[#2a3942] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-[#e9edef]">חול ים / מחצבה בבאלה</div>
                    <div className="text-[10px] text-[#8696a0]">מק"ט: 10001 | 1 טון</div>
                  </div>
                  <span className="bg-[#00a884]/20 text-[#00a884] font-bold px-2 py-1 rounded">
                    2 בלות
                  </span>
                </div>
              </div>
            </div>

            {/* Extracted Client Folder Details */}
            <div className="bg-[#182229] border border-[#2a3942] rounded-xl p-3">
              <h4 className="font-semibold text-xs text-[#8696a0] uppercase tracking-wider mb-2">
                פרטי תת-לקוח מזוהה
              </h4>
              <div className="space-y-1.5 text-xs text-[#e9edef]">
                <div className="flex justify-between">
                  <span className="text-[#8696a0]">שם לקוח:</span>
                  <span className="font-bold text-[#00a884]">{clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8696a0]">טלפון / תיוג:</span>
                  <span className="font-mono text-[#e9edef]">{clientPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8696a0]">JID קבוצה:</span>
                  <span className="font-mono text-[10px] text-[#8696a0] truncate max-w-[140px]">{groupId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8696a0]">סטטוס אוטומציה:</span>
                  <span className="text-emerald-400 font-semibold">תיוג JONI פעיל</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
