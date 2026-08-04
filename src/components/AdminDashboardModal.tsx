import React, { useState } from 'react';
import {
  X,
  Activity,
  Users,
  MessageSquare,
  Bot,
  Database,
  FileCode,
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Zap,
  Globe,
  Sliders,
  Terminal,
  BookOpen,
  Package,
  AlertTriangle,
  Folder,
} from 'lucide-react';
import { useWhatsAppStore } from '../store/useWhatsAppStore';
import { CustomersTab } from './CustomersTab';
import { OrdersTab } from './OrdersTab';
import { DiscrepanciesTab } from './DiscrepanciesTab';
import { LogisticsDictionaryTab } from './LogisticsDictionaryTab';
import { MessageAnalyticsChart } from './MessageAnalyticsChart';
import { GroupChatModal } from './GroupChatModal';

export const AdminDashboardModal: React.FC = () => {
  const {
    isAdminOpen,
    setIsAdminOpen,
    adminTab,
    setAdminTab,
    contacts,
    messages,
    config,
    updateConfig,
    webhookLogs,
    clearWebhookLogs,
    toggleContactAI,
    toggleGlobalAI,
    overrideChatAI,
    receiveIncomingMessage,
    addProduct,
    removeProduct,
  } = useWhatsAppStore();

  // Local state for system prompt editing
  const [promptInput, setPromptInput] = useState(config.systemPrompt);
  const [hoursInput, setHoursInput] = useState(config.businessHours);

  // Local state for Test Webhook runner
  const [testPhone, setTestPhone] = useState('054-9988776');
  const [testName, setTestName] = useState('משה קבלן בניין');
  const [testMessage, setTestMessage] = useState('שלום, צריך 5 באלות חול ו-2 באלות סומסום לאתר בפתח תקווה קומה 2 מנוף');
  const [testResult, setTestResult] = useState<unknown | null>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);

  // Local state for CRM takeover
  const [selectedCrmChatId, setSelectedCrmChatId] = useState<string>(contacts[0]?.id || '');
  const [crmOverrideText, setCrmOverrideText] = useState('');

  // Local state for adding product
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('חול וסומסום');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdUnit, setNewProdUnit] = useState('באלה');

  // Local state for Group Chat Modal
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  if (!isAdminOpen) return null;

  const totalMessagesCount = Object.values(messages).reduce((acc, m) => acc + m.length, 0);

  const handleSavePrompt = () => {
    updateConfig({
      systemPrompt: promptInput,
      businessHours: hoursInput,
    });
    alert('הפרומפט ושעות הפעילות עודכנו בהצלחה במערכת נועה AI!');
  };

  const handleRunTestWebhook = async () => {
    setIsTestLoading(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderPhone: testPhone,
          messageText: testMessage,
          senderName: testName,
        }),
      });

      const data = await res.json();
      setTestResult(data);

      // Also inject message into state store
      await receiveIncomingMessage(testPhone, testMessage, testName);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setTestResult({ success: false, error: errorMsg });
    } finally {
      setIsTestLoading(false);
    }
  };

  const handleCrmSendOverride = () => {
    if (!crmOverrideText.trim() || !selectedCrmChatId) return;
    overrideChatAI(selectedCrmChatId, crmOverrideText.trim());
    setCrmOverrideText('');
  };

  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdPrice.trim()) return;
    addProduct({
      name: newProdName.trim(),
      category: newProdCategory,
      price: newProdPrice.trim(),
      unit: newProdUnit.trim(),
      inStock: true,
    });
    setNewProdName('');
    setNewProdPrice('');
  };

  const selectedCrmContact = contacts.find((c) => c.id === selectedCrmChatId);
  const selectedCrmMessages = messages[selectedCrmChatId] || [];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-6 dir-rtl">
      <div className="bg-[#111b21] border border-[#2a3942] rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <header className="bg-[#14161f] px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0a0b10] border border-[#00ffaa]/50 flex items-center justify-center text-[#00ffaa] shadow-inner">
              <Zap className="w-5 h-5 animate-pulse text-[#00ffaa]" />
            </div>
            <div>
              <h2 className="text-[#e0e6ed] font-display font-extrabold text-xl flex items-center gap-2 tracking-tight">
                NOA_AI <span className="text-[#00ffaa] font-mono font-normal text-sm">// CONTROL CENTER</span>
                <span className="status-badge">
                  v2.4 Live
                </span>
              </h2>
              <p className="text-xs font-mono text-[#e0e6ed]/50">
                H. SABAN LOGISTICS v2.4 • FIREBASE_LIVE // JONI LISTENER ACTIVE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsGroupModalOpen(true)}
              className="px-3 py-1.5 bg-[#00a884]/20 hover:bg-[#00a884]/30 text-[#00a884] border border-[#00a884]/50 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              id="btn-admin-open-group-modal"
              title="פתח פאנל שיחות קבוצת הזמנות ותיוג לקוחות (JONI)"
            >
              <Users className="w-4 h-4" />
              <span>👥 צ'אט קבוצות JONI</span>
            </button>

            <button
              onClick={toggleGlobalAI}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                config.isAIGloballyEnabled
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                  : 'bg-red-950 text-red-400 border-red-700'
              }`}
              id="btn-admin-global-ai-toggle"
            >
              <Bot className="w-4 h-4" />
              <span>{config.isAIGloballyEnabled ? 'נועה AI גלובלי: פעיל' : 'נועה AI גלובלי: כבוי'}</span>
            </button>

            <button
              onClick={() => setIsAdminOpen(false)}
              className="p-2 text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] rounded-full transition-colors"
              id="btn-close-admin-modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Modal Navigation Tabs */}
        <div className="bg-[#14161f] border-b border-white/10 px-6 flex gap-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => setAdminTab('metrics')}
            className={`px-4 py-3 text-xs font-mono font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap uppercase tracking-wider ${
              adminTab === 'metrics'
                ? 'border-[#00ffaa] text-[#00ffaa] bg-[#0a0b10]'
                : 'border-transparent text-[#e0e6ed]/50 hover:text-[#e0e6ed]'
            }`}
            id="admin-tab-btn-metrics"
          >
            <Activity className="w-4 h-4" />
            1. סקירה ומדדים
          </button>

          <button
            onClick={() => setAdminTab('analytics')}
            className={`px-4 py-3 text-xs font-mono font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap uppercase tracking-wider ${
              adminTab === 'analytics'
                ? 'border-[#00ffaa] text-[#00ffaa] bg-[#0a0b10]'
                : 'border-transparent text-[#e0e6ed]/50 hover:text-[#e0e6ed]'
            }`}
            id="admin-tab-btn-analytics"
          >
            <Zap className="w-4 h-4 text-[#00ffaa]" />
            2. נפח הודעות (30 ימים)
          </button>

          <button
            onClick={() => setAdminTab('customers')}
            className={`px-4 py-3 text-xs font-mono font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap uppercase tracking-wider ${
              adminTab === 'customers'
                ? 'border-[#00ffaa] text-[#00ffaa] bg-[#0a0b10]'
                : 'border-transparent text-[#e0e6ed]/50 hover:text-[#e0e6ed]'
            }`}
            id="admin-tab-btn-customers"
          >
            <Folder className="w-4 h-4" />
            3. תיק לקוח וחשבונות
          </button>

          <button
            onClick={() => setAdminTab('orders')}
            className={`px-4 py-3 text-xs font-mono font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap uppercase tracking-wider ${
              adminTab === 'orders'
                ? 'border-[#00ffaa] text-[#00ffaa] bg-[#0a0b10]'
                : 'border-transparent text-[#e0e6ed]/50 hover:text-[#e0e6ed]'
            }`}
            id="admin-tab-btn-orders"
          >
            <Package className="w-4 h-4" />
            4. לוג הזמנות מערכת
          </button>

          <button
            onClick={() => setAdminTab('discrepancies')}
            className={`px-4 py-3 text-xs font-mono font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap uppercase tracking-wider ${
              adminTab === 'discrepancies'
                ? 'border-amber-500 text-amber-400 font-bold bg-[#0a0b10]'
                : 'border-transparent text-[#e0e6ed]/50 hover:text-[#e0e6ed]'
            }`}
            id="admin-tab-btn-discrepancies"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            5. חריגות לוגיסטיות
          </button>

          <button
            onClick={() => setAdminTab('dictionary')}
            className={`px-4 py-3 text-xs font-mono font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap uppercase tracking-wider ${
              adminTab === 'dictionary'
                ? 'border-[#00ffaa] text-[#00ffaa] bg-[#0a0b10]'
                : 'border-transparent text-[#e0e6ed]/50 hover:text-[#e0e6ed]'
            }`}
            id="admin-tab-btn-dictionary"
          >
            <BookOpen className="w-4 h-4" />
            5. מילון לוגיסטי
          </button>

          <button
            onClick={() => setAdminTab('crm')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              adminTab === 'crm'
                ? 'border-[#00a884] text-[#00a884]'
                : 'border-transparent text-[#8696a0] hover:text-[#e9edef]'
            }`}
            id="admin-tab-btn-crm"
          >
            <Users className="w-4 h-4" />
            6. ניהול צ'אטים ו-CRM
          </button>

          <button
            onClick={() => setAdminTab('prompt')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              adminTab === 'prompt'
                ? 'border-[#00a884] text-[#00a884]'
                : 'border-transparent text-[#8696a0] hover:text-[#e9edef]'
            }`}
            id="admin-tab-btn-prompt"
          >
            <Sliders className="w-4 h-4" />
            7. עורך פרומפט
          </button>

          <button
            onClick={() => setAdminTab('logs')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              adminTab === 'logs'
                ? 'border-[#00a884] text-[#00a884]'
                : 'border-transparent text-[#8696a0] hover:text-[#e9edef]'
            }`}
            id="admin-tab-btn-logs"
          >
            <Terminal className="w-4 h-4" />
            8. מוניטור JONI
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0b141a]">
          {/* TAB 1: METRICS & OVERVIEW */}
          {adminTab === 'metrics' && (
            <div className="space-y-6">
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#202c33] border border-[#2a3942] rounded-xl p-4 flex items-center gap-4">
                  <div className="p-3 bg-[#00a884]/20 text-[#00a884] rounded-xl">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs text-[#8696a0]">סה"כ שיחות פעילות</span>
                    <h3 className="text-2xl font-bold text-[#e9edef] font-mono">{contacts.length}</h3>
                  </div>
                </div>

                <div className="bg-[#202c33] border border-[#2a3942] rounded-xl p-4 flex items-center gap-4">
                  <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs text-[#8696a0]">סה"כ הודעות שנענו</span>
                    <h3 className="text-2xl font-bold text-[#e9edef] font-mono">{totalMessagesCount}</h3>
                  </div>
                </div>

                <div className="bg-[#202c33] border border-[#2a3942] rounded-xl p-4 flex items-center gap-4">
                  <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs text-[#8696a0]">מודל AI פעיל</span>
                    <h3 className="text-base font-bold text-[#e9edef] font-mono">Gemini 2.5 Flash</h3>
                  </div>
                </div>

                <div className="bg-[#202c33] border border-[#2a3942] rounded-xl p-4 flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs text-[#8696a0]">סטטוס מערכת</span>
                    <h3 className="text-base font-bold text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                      ONLINE 100%
                    </h3>
                  </div>
                </div>
              </div>

              {/* Status Connections Detailed Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#202c33] border border-[#2a3942] rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-[#e9edef] flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#00a884]" />
                    חיבור פלאגין Firebase Realtime DB JONI
                  </h3>

                  <div className="bg-[#111b21] p-3 rounded-lg border border-[#2a3942] font-mono text-xs text-[#e9edef] space-y-2 dir-ltr text-left overflow-x-auto">
                    <div className="flex items-center justify-between text-right dir-rtl">
                      <span className="text-[#8696a0]">URL יעד:</span>
                      <span className="text-emerald-400 font-bold">CONNECTED</span>
                    </div>
                    <div className="text-emerald-300 break-all">{config.firebaseJoniUrl}</div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#8696a0]">
                    <span>סינכרון אוטומטי לכל פניית וואטסאפ:</span>
                    <span className="text-emerald-400 font-bold">פעיל</span>
                  </div>
                </div>

                <div className="bg-[#202c33] border border-[#2a3942] rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-[#e9edef] flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-blue-400" />
                    אינטגרציית Google Apps Script (GAS) Webhook
                  </h3>

                  <div className="bg-[#111b21] p-3 rounded-lg border border-[#2a3942] font-mono text-xs text-[#e9edef] space-y-2 dir-ltr text-left overflow-x-auto">
                    <div className="flex items-center justify-between text-right dir-rtl">
                      <span className="text-[#8696a0]">Listener v2.4 URL:</span>
                      <span className="text-blue-400 font-bold">ACTIVE</span>
                    </div>
                    <div className="text-blue-300 break-all">{config.gasWebhookUrl}</div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#8696a0]">
                    <span>החזרת payload במנהנה JSON תקני:</span>
                    <span className="text-emerald-400 font-bold">תואם Vercel / Express</span>
                  </div>
                </div>
              </div>

              {/* Data Visualization Section - Recharts 30-Day Message Volume */}
              <MessageAnalyticsChart />
            </div>
          )}

          {/* TAB 2: DATA VISUALIZATION ANALYTICS */}
          {adminTab === 'analytics' && <MessageAnalyticsChart />}

          {/* TAB: CUSTOMERS CRM (תיק_לקוח_וחשבונות) */}
          {adminTab === 'customers' && <CustomersTab />}

          {/* TAB: ORDERS LOG (לוג_הזמנות_מערכת) */}
          {adminTab === 'orders' && <OrdersTab />}

          {/* TAB: DISCREPANCIES AUDIT (חריגות_לוגיסטיות) */}
          {adminTab === 'discrepancies' && <DiscrepanciesTab />}

          {/* TAB: LOGISTICS DICTIONARY (מילון_לוגיסטי) */}
          {adminTab === 'dictionary' && <LogisticsDictionaryTab />}

          {/* TAB: LIVE CRM & CONVERSATION MANAGER */}
          {adminTab === 'crm' && (
            <div className="h-full flex flex-col lg:flex-row gap-4">
              {/* Chat Selector List */}
              <div className="w-full lg:w-80 bg-[#202c33] border border-[#2a3942] rounded-xl p-3 flex flex-col gap-2 shrink-0 max-h-[500px] overflow-y-auto">
                <h3 className="text-xs font-bold text-[#8696a0] px-2 mb-1">רשימת לקוחות פעילים</h3>
                {contacts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCrmChatId(c.id)}
                    className={`w-full text-right p-3 rounded-lg flex items-center gap-3 transition-colors ${
                      selectedCrmChatId === c.id ? 'bg-[#005c4b] text-[#e9edef]' : 'bg-[#111b21] hover:bg-[#2a3942] text-[#8696a0]'
                    }`}
                  >
                    <img src={c.avatar} alt={c.name} className="w-9 h-9 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold truncate text-[#e9edef]">{c.name}</h4>
                      <p className="text-xs truncate text-[#8696a0]">{c.lastMessage}</p>
                    </div>
                    <span className={`w-2.5 h-2.5 rounded-full ${c.isAIEnabled ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  </button>
                ))}
              </div>

              {/* Chat Transcript & Manual Override */}
              <div className="flex-1 bg-[#202c33] border border-[#2a3942] rounded-xl p-4 flex flex-col min-h-[450px]">
                {selectedCrmContact ? (
                  <>
                    <div className="flex items-center justify-between border-b border-[#2a3942] pb-3 mb-3">
                      <div>
                        <h3 className="font-bold text-[#e9edef] text-base">{selectedCrmContact.name}</h3>
                        <p className="text-xs text-[#8696a0]">{selectedCrmContact.phone}</p>
                      </div>

                      <button
                        onClick={() => toggleContactAI(selectedCrmContact.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                          selectedCrmContact.isAIEnabled
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                            : 'bg-amber-950 text-amber-400 border-amber-700'
                        }`}
                        id="btn-crm-toggle-ai"
                      >
                        {selectedCrmContact.isAIEnabled ? 'נועה AI פעילה (אוטומטי)' : 'השתלטות אנושית (ידני)'}
                      </button>
                    </div>

                    {/* Messages Transcript */}
                    <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-[#111b21] rounded-lg border border-[#2a3942] mb-3 max-h-72">
                      {selectedCrmMessages.map((m) => (
                        <div
                          key={m.id}
                          className={`p-2.5 rounded-lg text-xs max-w-[80%] ${
                            m.sender === 'user'
                              ? 'bg-[#005c4b] text-[#e9edef] ml-auto'
                              : m.sender === 'ai'
                              ? 'bg-[#202c33] text-[#e9edef] border-r-2 border-[#00a884]'
                              : 'bg-amber-950 text-amber-200 border border-amber-700'
                          }`}
                        >
                          <span className="font-bold block text-[10px] opacity-80 mb-0.5">
                            {m.senderName || m.sender} • {m.timestamp}
                          </span>
                          <p>{m.text}</p>
                        </div>
                      ))}
                    </div>

                    {/* Override Send Form */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="הקלד תגובה ידנית כנציג אנושי להתערבות בצ'אט..."
                        value={crmOverrideText}
                        onChange={(e) => setCrmOverrideText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCrmSendOverride()}
                        className="flex-1 bg-[#111b21] border border-[#2a3942] rounded-lg p-2.5 text-sm text-[#e9edef] focus:outline-none focus:border-[#00a884]"
                        id="input-crm-override-text"
                      />
                      <button
                        onClick={handleCrmSendOverride}
                        className="px-4 py-2.5 bg-[#00a884] text-[#111b21] font-bold rounded-lg hover:bg-[#029676] text-xs flex items-center gap-1.5"
                        id="btn-crm-send-override"
                      >
                        <Send className="w-4 h-4" />
                        שלח כנציג
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center text-[#8696a0]">בחר צ'אט לצפייה בתמליל והשתלטות</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SYSTEM PROMPT & KNOWLEDGE BASE */}
          {adminTab === 'prompt' && (
            <div className="space-y-6">
              {/* Prompt Editor */}
              <div className="bg-[#202c33] border border-[#2a3942] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[#e9edef] font-bold text-base flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#00a884]" />
                    עורך הנחיות מערכת (System Prompt) - נועה AI
                  </h3>
                  <button
                    onClick={handleSavePrompt}
                    className="px-4 py-2 bg-[#00a884] text-[#111b21] font-bold rounded-lg text-xs hover:bg-[#029676] flex items-center gap-1.5"
                    id="btn-save-system-prompt"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    שמור שינויים בפרומפט
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8696a0] mb-1">
                    שעות פעילות העסק:
                  </label>
                  <input
                    type="text"
                    value={hoursInput}
                    onChange={(e) => setHoursInput(e.target.value)}
                    className="w-full bg-[#111b21] border border-[#2a3942] rounded-lg p-2.5 text-sm text-[#e9edef] focus:outline-none focus:border-[#00a884]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8696a0] mb-1">
                    הנחיות התנהגות ומענה לנועה AI ("ח. סבן חומרי בניין"):
                  </label>
                  <textarea
                    rows={8}
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    className="w-full bg-[#111b21] border border-[#2a3942] rounded-lg p-3 text-sm text-[#e9edef] font-mono leading-relaxed focus:outline-none focus:border-[#00a884]"
                    id="textarea-system-prompt"
                  />
                </div>
              </div>

              {/* Products Table Editor */}
              <div className="bg-[#202c33] border border-[#2a3942] rounded-xl p-5 space-y-4">
                <h3 className="text-[#e9edef] font-bold text-base flex items-center gap-2">
                  <Database className="w-5 h-5 text-purple-400" />
                  ניהול מחירון מוצרים ("ח. סבן חומרי בניין")
                </h3>

                {/* Add product form */}
                <form onSubmit={handleAddProductSubmit} className="grid grid-cols-1 sm:grid-cols-5 gap-2 bg-[#111b21] p-3 rounded-lg border border-[#2a3942]">
                  <input
                    type="text"
                    placeholder="שם המוצר (למשל: טיח גבס)"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    className="bg-[#202c33] border border-[#2a3942] text-xs p-2 rounded text-[#e9edef]"
                    required
                  />
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="bg-[#202c33] border border-[#2a3942] text-xs p-2 rounded text-[#e9edef]"
                  >
                    <option value="חול וסומסום">חול וסומסום</option>
                    <option value="מליטה ואיטום">מליטה ואיטום</option>
                    <option value="גבס ופרופילים">גבס ופרופילים</option>
                    <option value="הובלה ולוגיסטיקה">הובלה ולוגיסטיקה</option>
                  </select>
                  <input
                    type="text"
                    placeholder="מחיר (למשל: ₪140)"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="bg-[#202c33] border border-[#2a3942] text-xs p-2 rounded text-[#e9edef]"
                    required
                  />
                  <input
                    type="text"
                    placeholder="יחידה (באלה/שק)"
                    value={newProdUnit}
                    onChange={(e) => setNewProdUnit(e.target.value)}
                    className="bg-[#202c33] border border-[#2a3942] text-xs p-2 rounded text-[#e9edef]"
                  />
                  <button
                    type="submit"
                    className="bg-[#00a884] text-[#111b21] font-bold text-xs p-2 rounded hover:bg-[#029676] flex items-center justify-center gap-1"
                    id="btn-add-product"
                  >
                    <Plus className="w-4 h-4" />
                    הוסף מחירון
                  </button>
                </form>

                {/* Products List Table */}
                <div className="overflow-x-auto border border-[#2a3942] rounded-lg">
                  <table className="w-full text-right text-xs text-[#e9edef]">
                    <thead className="bg-[#111b21] text-[#8696a0] border-b border-[#2a3942]">
                      <tr>
                        <th className="p-2.5">שם מוצר</th>
                        <th className="p-2.5">קטגוריה</th>
                        <th className="p-2.5">מחיר</th>
                        <th className="p-2.5">יחידה</th>
                        <th className="p-2.5 text-left">פעולה</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a3942]">
                      {config.products.map((p) => (
                        <tr key={p.id} className="hover:bg-[#182229]">
                          <td className="p-2.5 font-medium">{p.name}</td>
                          <td className="p-2.5 text-[#8696a0]">{p.category}</td>
                          <td className="p-2.5 text-[#00a884] font-bold">{p.price}</td>
                          <td className="p-2.5 text-[#8696a0]">{p.unit}</td>
                          <td className="p-2.5 text-left">
                            <button
                              onClick={() => removeProduct(p.id)}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: WEBHOOK & JONI PLUGIN MONITOR */}
          {adminTab === 'logs' && (
            <div className="space-y-6">
              {/* Webhook Test Runner Banner */}
              <div className="bg-[#202c33] border border-[#00a884]/40 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[#e9edef] font-bold text-base flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-[#00a884]" />
                    סימולטור וובהוק נכנס (WhatsApp Listener v2.4 Test Runner)
                  </h3>
                  <button
                    onClick={handleRunTestWebhook}
                    disabled={isTestLoading}
                    className="px-5 py-2.5 bg-[#00a884] text-[#111b21] font-bold rounded-lg text-xs hover:bg-[#029676] disabled:opacity-50 flex items-center gap-2 shadow-md"
                    id="btn-run-test-webhook"
                  >
                    {isTestLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    שגר וובהוק ניסיון
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-[#8696a0] mb-1">טלפון שולח (senderPhone):</label>
                    <input
                      type="text"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      className="w-full bg-[#111b21] border border-[#2a3942] rounded-lg p-2 text-xs text-[#e9edef]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#8696a0] mb-1">שם שולח (senderName):</label>
                    <input
                      type="text"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                      className="w-full bg-[#111b21] border border-[#2a3942] rounded-lg p-2 text-xs text-[#e9edef]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#8696a0] mb-1">תוכן הודעה (messageText):</label>
                    <input
                      type="text"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      className="w-full bg-[#111b21] border border-[#2a3942] rounded-lg p-2 text-xs text-[#e9edef]"
                    />
                  </div>
                </div>

                {/* Test Result JSON Inspector */}
                {testResult !== null && (
                  <div className="mt-4 bg-[#111b21] border border-[#2a3942] p-3 rounded-lg font-mono text-xs dir-ltr text-left overflow-x-auto">
                    <span className="text-[#8696a0] text-[10px] block mb-1 font-sans text-right dir-rtl">תגובת וובהוק (JSON Response):</span>
                    <pre className="text-emerald-400">{JSON.stringify(testResult, null, 2)}</pre>
                  </div>
                )}
              </div>

              {/* Logs Table */}
              <div className="bg-[#202c33] border border-[#2a3942] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[#e9edef] font-bold text-base flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-blue-400" />
                    יומן אירועים ואינטגרציות JONI / GAS (Live Payload Logs)
                  </h3>
                  <button
                    onClick={clearWebhookLogs}
                    className="text-xs text-[#8696a0] hover:text-red-400 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    נקה יומן
                  </button>
                </div>

                <div className="overflow-x-auto border border-[#2a3942] rounded-lg">
                  <table className="w-full text-right text-xs text-[#e9edef]">
                    <thead className="bg-[#111b21] text-[#8696a0] border-b border-[#2a3942]">
                      <tr>
                        <th className="p-2.5">זמן</th>
                        <th className="p-2.5">טלפון שולח</th>
                        <th className="p-2.5">שם לקוח</th>
                        <th className="p-2.5">הודעה נכנסת</th>
                        <th className="p-2.5">מענה נועה AI</th>
                        <th className="p-2.5">סטטוס</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a3942]">
                      {webhookLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-[#8696a0]">
                            אין יומני וובהוקים עדיין
                          </td>
                        </tr>
                      ) : (
                        webhookLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-[#182229]">
                            <td className="p-2.5 font-mono text-[#8696a0]">{log.timestamp}</td>
                            <td className="p-2.5 font-mono">{log.senderPhone}</td>
                            <td className="p-2.5 font-medium">{log.senderName}</td>
                            <td className="p-2.5 max-w-xs truncate">{log.messageText}</td>
                            <td className="p-2.5 max-w-xs truncate text-emerald-300">{log.autoReply}</td>
                            <td className="p-2.5">
                              <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] px-2 py-0.5 rounded font-mono">
                                200 OK ({log.durationMs || 120}ms)
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Control Center Footer Metadata */}
        <footer className="px-6 py-3 bg-[#0a0b10] border-t border-white/10 flex justify-between items-center font-mono text-[10px] text-[#e0e6ed]/40 shrink-0">
          <span>COORDINATES: 32.1624° N, 34.8447° E</span>
          <span className="text-[#00ffaa]">NOA_AI_ENGINE_STATE: NOMINAL</span>
          <span>DEVICE: ADMIN_CONSOLE_X1</span>
        </footer>
      </div>

      <GroupChatModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
      />
    </div>
  );
};
