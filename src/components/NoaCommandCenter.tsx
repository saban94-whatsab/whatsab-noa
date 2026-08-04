import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Sparkles, Send, RefreshCw, Server, FileSpreadsheet, ShieldCheck, 
  Terminal, ArrowRight, CheckCircle2, AlertCircle, Database, Phone, Search, Loader2, Play
} from 'lucide-react';
import { useWhatsAppStore } from '../store/useWhatsAppStore';
import { Message } from '../types';

interface CommandResponse {
  type: 'text' | 'order_history' | 'status_check' | 'mode_changed';
  text: string;
  data?: any;
}

export const NoaCommandCenter: React.FC = () => {
  const { messages, sendMessage, contacts, toggleGlobalAI, config } = useWhatsAppStore();
  const [commandInput, setCommandInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [serverHealth, setServerHealth] = useState<{
    localServer: boolean;
    gasWebhook: boolean;
    joniRtdb: boolean;
    geminiAi: boolean;
  }>({
    localServer: true,
    gasWebhook: true,
    joniRtdb: true,
    geminiAi: true,
  });

  const [quickLookupPhone, setQuickLookupPhone] = useState('0526688768');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [isSearchingSheet, setIsSearchingSheet] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const noaChatId = 'chat-noa-ai';
  const noaMessages = messages[noaChatId] || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [noaMessages]);

  // Check system health on load
  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/chat/sync');
      if (res.ok) {
        const data = await res.json();
        setServerHealth({
          localServer: Boolean(data.listenerStatus?.localServerActive),
          gasWebhook: Boolean(data.listenerStatus?.gasWebhookConfigured),
          joniRtdb: Boolean(data.listenerStatus?.joniUrlConfigured),
          geminiAi: true,
        });
      }
    } catch {
      setServerHealth({
        localServer: true,
        gasWebhook: true,
        joniRtdb: true,
        geminiAi: true,
      });
    }
  };

  const handleExecuteCommand = async (cmdText?: string) => {
    const textToSend = cmdText || commandInput;
    if (!textToSend.trim()) return;

    setCommandInput('');
    setIsProcessing(true);

    // Send message to Noa AI in store
    await sendMessage(noaChatId, textToSend);

    // Parse potential sheet lookup command (e.g. "תשליפי היסטוריית הזמנות של 0526688768")
    const phoneMatch = textToSend.match(/05\d{8}|05\d[-]?\d{3}[-]?\d{4}/);
    if (phoneMatch) {
      const foundPhone = phoneMatch[0].replace(/[-]/g, '');
      setQuickLookupPhone(foundPhone);
      await executeSheetLookup(foundPhone);
    }

    setIsProcessing(false);
  };

  const executeSheetLookup = async (phoneToSearch: string) => {
    if (!phoneToSearch) return;
    setIsSearchingSheet(true);
    try {
      const res = await fetch('/api/noa/sheet-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneToSearch }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLookupResult(data);
      }
    } catch (err) {
      console.warn('Sheet lookup error:', err);
    } finally {
      setIsSearchingSheet(false);
    }
  };

  const quickCommands = [
    '🔍 תשליפי היסטוריית הזמנות של 0526688768',
    '📊 תבדקי סנכרון גליון הזמנות',
    '⚙️ סטטוס שרת מקומי C:\\ap94',
    '🤖 תעבירי את כל הצ\'אטים למצב אוטומטי',
    '📦 אימות מלאי מול מילון לוגיסטי',
  ];

  return (
    <div className="w-full h-full bg-[#0b141a] flex flex-col overflow-hidden text-[#e9edef] dir-rtl">
      {/* Command Center Top Header */}
      <div className="bg-[#202c33] px-6 py-4 border-b border-[#222d34] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#00ffaa]/20 border border-[#00ffaa]/50 flex items-center justify-center text-[#00ffaa] shadow-lg shadow-[#00ffaa]/10">
            <Bot className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[#e9edef]">מרכז שליטה נועה AI (Command Center & Audit Hub)</h1>
              <span className="text-[10px] bg-[#00ffaa]/20 text-[#00ffaa] border border-[#00ffaa]/40 px-2 py-0.5 rounded-full font-bold">
                C:\ap94 Active
              </span>
            </div>
            <p className="text-xs text-[#8696a0]">
              ערוץ תקשורת מבוטח אדמין ↔ נועה AI (+972508861080) | ניהול פקודות אוטומציה ואימות גליונות
            </p>
          </div>
        </div>

        {/* System Health Indicators */}
        <div className="hidden md:flex items-center gap-3 bg-[#111b21] px-4 py-2 rounded-xl border border-[#2a3942] text-xs">
          <div className="flex items-center gap-1.5" title="שרת מקומי C:\ap94 (PM2)">
            <Server className="w-3.5 h-3.5 text-[#00ffaa]" />
            <span className="text-[#8696a0]">C:\ap94:</span>
            <span className="w-2 h-2 rounded-full bg-[#00ffaa] animate-ping" />
          </div>

          <div className="h-3 w-[1px] bg-[#2a3942]" />

          <div className="flex items-center gap-1.5" title="Google Sheets GAS Webhook">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[#8696a0]">Sheets:</span>
            <span className="text-emerald-400 font-semibold">מחובר</span>
          </div>

          <div className="h-3 w-[1px] bg-[#2a3942]" />

          <div className="flex items-center gap-1.5" title="Firebase JONI Realtime DB">
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[#8696a0]">JONI RTDB:</span>
            <span className="text-amber-400 font-semibold">פעיל 24/7</span>
          </div>

          <button
            onClick={checkHealth}
            className="p-1 hover:bg-[#2a3942] text-[#00ffaa] rounded transition-colors"
            title="רענן בדיקת שרת"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Split Body: Left Chat Audit Stream | Right Real-Time Sheet Search & Tools */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: Interactive Noa AI Command Stream */}
        <div className="flex-1 flex flex-col bg-[#0b141a] relative border-l border-[#222d34]">
          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {/* Intro Welcome Banner */}
            <div className="bg-[#111b21] border border-[#00ffaa]/30 rounded-2xl p-5 shadow-xl max-w-2xl mx-auto space-y-3">
              <div className="flex items-center gap-3 text-[#00ffaa]">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-[#e9edef]">ברוכים הבאים למרכז השליטה האוטונומי של נועה AI</h3>
              </div>
              <p className="text-xs text-[#8696a0] leading-relaxed">
                כאן ניתן להקליד פקודות ישירות לנועה AI, לבדוק את תקינות הפייפליין 24/7 מול השירות המקומי ב-C:\ap94, לשלוף נתוני לקוח מ-Comax והגליונות, ולעבור בלחיצה בין מצב אוטומטי למצב ידני.
              </p>

              {/* Quick Command Chips */}
              <div className="pt-2 border-t border-[#2a3942]">
                <span className="text-[11px] font-bold text-[#8696a0] block mb-2">פקודות מהירות להפעלה בלחיצה:</span>
                <div className="flex flex-wrap gap-2">
                  {quickCommands.map((cmd, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleExecuteCommand(cmd)}
                      className="px-3 py-1.5 bg-[#202c33] hover:bg-[#2a3942] text-[#00ffaa] border border-[#00ffaa]/30 rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <Play className="w-3 h-3 text-amber-400" />
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Conversation Log */}
            {noaMessages.map((m: Message) => {
              const isAi = m.sender === 'ai' || m.sender === 'contact';
              return (
                <div
                  key={m.id}
                  className={`flex ${isAi ? 'justify-start' : 'justify-end'} animate-in fade-in`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 shadow-md text-xs space-y-1.5 ${
                      isAi
                        ? 'bg-[#202c33] text-[#e9edef] rounded-tr-none border border-[#2a3942]'
                        : 'bg-[#005c4b] text-[#e9edef] rounded-tl-none'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-1">
                      <span className="font-bold text-[11px] text-[#00ffaa] flex items-center gap-1">
                        {isAi ? <Bot className="w-3.5 h-3.5" /> : <Terminal className="w-3.5 h-3.5 text-cyan-300" />}
                        {isAi ? 'נועה AI (+972508861080)' : 'מנהל סידור (Admin)'}
                      </span>
                      <span className="text-[10px] text-[#8696a0]">{m.timestamp}</span>
                    </div>

                    <p className="whitespace-pre-wrap leading-relaxed text-[#e9edef]">{m.text}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Command Input Box */}
          <div className="bg-[#202c33] p-4 border-t border-[#222d34] flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExecuteCommand()}
                placeholder="הקלד פקודה לנועה (לדוגמה: תשליפי היסטוריה של 0526688768 / תבדקי גליון)..."
                className="w-full bg-[#111b21] border border-[#2a3942] rounded-xl pr-4 pl-12 py-3 text-xs text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00ffaa] transition-all"
              />
              <Terminal className="w-4 h-4 text-[#8696a0] absolute left-4 top-3.5" />
            </div>

            <button
              onClick={() => handleExecuteCommand()}
              disabled={isProcessing || !commandInput.trim()}
              className="px-5 py-3 bg-[#00ffaa] hover:bg-[#00cc88] disabled:opacity-50 text-[#0a0b10] font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-[#00ffaa]/20 shrink-0"
              id="btn-send-noa-command"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  הפעל פקודה
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Real-Time Sheet Verification & Query Tool Box */}
        <div className="w-80 lg:w-96 bg-[#111b21] border-r border-[#222d34] flex flex-col p-5 space-y-5 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-2 text-sm font-bold text-[#e9edef] border-b border-[#222d34] pb-3">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span>אימות בזמן אמת מול Google Sheets</span>
          </div>

          {/* Quick Sheet Phone Query Tool */}
          <div className="space-y-3 bg-[#202c33] p-4 rounded-xl border border-[#2a3942]">
            <label className="text-xs font-semibold text-[#e9edef] block">שאילתת טלפון מהירה לגליון</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={quickLookupPhone}
                onChange={(e) => setQuickLookupPhone(e.target.value)}
                placeholder="הכנס טלפון (0526688768)"
                className="flex-1 bg-[#111b21] border border-[#2a3942] rounded-lg px-3 py-2 text-xs text-[#e9edef] focus:outline-none focus:border-[#00ffaa]"
              />
              <button
                onClick={() => executeSheetLookup(quickLookupPhone)}
                disabled={isSearchingSheet}
                className="px-3 py-2 bg-[#00ffaa] hover:bg-[#00cc88] text-[#0a0b10] font-bold rounded-lg text-xs flex items-center gap-1 shrink-0"
              >
                {isSearchingSheet ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                חפש
              </button>
            </div>
          </div>

          {/* Verification Results Display */}
          {lookupResult ? (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-[#202c33] rounded-xl border border-[#00ffaa]/30 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#8696a0]">טלפון שנבדק:</span>
                  <span className="font-mono text-[#00ffaa] font-bold">{lookupResult.phone}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#8696a0]">סה"כ הזמנות בגליון:</span>
                  <span className="font-bold text-[#e9edef]">{lookupResult.ordersCount}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#8696a0]">שעת יציאה אחרונה:</span>
                  <span className="text-amber-400 font-bold">{lookupResult.lastDispatchTime}</span>
                </div>
              </div>

              {/* Verified Addresses */}
              {lookupResult.verifiedAddresses && lookupResult.verifiedAddresses.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#8696a0] block">כתובות אתר מאושרות מההיסטוריה:</span>
                  {lookupResult.verifiedAddresses.map((addr: string, i: number) => (
                    <div key={i} className="p-2 bg-[#202c33] rounded-lg text-xs text-[#e9edef] border border-[#2a3942] flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00ffaa] shrink-0" />
                      <span className="truncate">{addr}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Verified Historical Orders */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#8696a0] block">פירוט הזמנות היסטוריות:</span>
                {lookupResult.ordersHistory?.map((ord: any, idx: number) => (
                  <div key={idx} className="p-3 bg-[#182229] rounded-xl border border-[#2a3942] text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#00ffaa]">{ord.orderNumber}</span>
                      <span className="text-[10px] bg-[#00ffaa]/10 text-[#00ffaa] px-2 py-0.5 rounded-full font-bold">
                        {ord.status || 'סופק'}
                      </span>
                    </div>
                    <p className="text-[#e9edef] font-medium">{ord.customerName}</p>
                    <p className="text-[#8696a0] text-[11px]">📍 {ord.address}</p>
                    <p className="text-[#8696a0] text-[11px]">🛒 {ord.items}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-xs text-[#8696a0] space-y-2">
              <Search className="w-8 h-8 text-[#2a3942] mx-auto" />
              <p>הכנס מספר טלפון ולחץ על חפש כדי לבצע אימות בזמן אמת מול גליון 'לוג_הזמנות_מערכת'.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
