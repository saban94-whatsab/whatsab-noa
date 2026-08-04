import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, MessageSquarePlus, CircleDashed, Bot, UserCheck, Pin, User, 
  Settings, SlidersHorizontal, ShieldCheck, RefreshCw, FileSpreadsheet, 
  Send, Phone, MapPin, Building, ArrowLeft, MoreVertical, Sparkles, AlertCircle, X, Bell
} from 'lucide-react';
import { useWhatsAppStore } from '../store/useWhatsAppStore';
import { Contact, Message } from '../types';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';
import { CustomerProfileDrawer } from './CustomerProfileDrawer';
import { NoaCommandCenter } from './NoaCommandCenter';
import { HeaderMenuDropdown } from './HeaderMenuDropdown';

// Dual-tone WhatsApp Web sound chime synthesizer
const playNotificationChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    // WhatsApp style bell frequencies
    osc1.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
    osc2.frequency.setValueAtTime(1318.51, audioCtx.currentTime); // E6

    osc1.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.15);
    osc2.frequency.exponentialRampToValueAtTime(2637, audioCtx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(audioCtx.currentTime + 0.35);
    osc2.stop(audioCtx.currentTime + 0.35);
  } catch (err) {
    console.warn('Notification chime audio issue:', err);
  }
};

interface ToastNotification {
  id: string;
  senderName: string;
  messageText: string;
}

export const WhatsAppMirror: React.FC = () => {
  const {
    contacts,
    activeChatId,
    setActiveChatId,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    toggleContactAI,
    createNewContact,
    requestAdminAccess,
    syncLiveSheetData,
  } = useWhatsAppStore();

  const [activeTab, setActiveTab] = useState<'chats' | 'noa_command'>('chats');
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [selectedDrawerContact, setSelectedDrawerContact] = useState<Contact | null>(null);

  // Real-time toast notifications state
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const prevLogsCountRef = useRef<number>(0);

  // Poll /api/chat/sync every 2 seconds for incoming messages from C:\ap94
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/chat/sync');
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.activeLogsCount === 'number') {
            if (prevLogsCountRef.current > 0 && data.activeLogsCount > prevLogsCountRef.current) {
              // New message arrived via sync!
              playNotificationChime();
              setToast({
                id: `toast-${Date.now()}`,
                senderName: 'חיים עמרם (לקוח)',
                messageText: 'הודעה חדשה התקבלה דרך שרת C:\\ap94',
              });

              // Auto dismiss toast after 4 seconds
              setTimeout(() => {
                setToast(null);
              }, 4000);
            }
            prevLogsCountRef.current = data.activeLogsCount;
          }
        }
      } catch {
        // Silent catch for background polling
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, []);

  const activeContact = contacts.find((c) => c.id === activeChatId) || contacts[0];

  // Pin Noa AI at top, then sort remainder
  const sortedContacts = [...contacts].sort((a, b) => {
    if (a.id === 'chat-noa-ai') return -1;
    if (b.id === 'chat-noa-ai') return 1;
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  // Filter contacts logic
  const filteredContacts = sortedContacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeFilter === 'unread') return c.unreadCount > 0;
    if (activeFilter === 'favorites') return c.isPinned;
    if (activeFilter === 'groups') return c.tags?.includes('קבוצה');

    return true;
  });

  const handleOpenProfileDrawer = (contact: Contact) => {
    setSelectedDrawerContact(contact);
    setIsProfileDrawerOpen(true);
  };

  return (
    <div className="w-full h-full bg-[#0b141a] flex flex-col overflow-hidden text-[#e9edef] select-none font-sans dir-rtl relative">
      
      {/* Toast Notification Banner Overlay */}
      {toast && (
        <div className="absolute top-14 left-6 z-50 bg-[#202c33] border border-[#00ffaa]/50 text-[#e9edef] p-3.5 rounded-xl shadow-2xl flex items-start gap-3 max-w-sm animate-in slide-in-from-top duration-300">
          <div className="w-8 h-8 rounded-full bg-[#00ffaa]/20 border border-[#00ffaa]/50 flex items-center justify-center text-[#00ffaa] shrink-0">
            <Bell className="w-4 h-4 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-xs text-[#00ffaa] flex items-center gap-1">
              <span>📩 הודעה חדשה מסנכרון C:\ap94</span>
            </h4>
            <p className="text-xs font-semibold text-[#e9edef] mt-0.5 truncate">{toast.senderName}</p>
            <p className="text-[11px] text-[#8696a0] line-clamp-1">{toast.messageText}</p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="p-1 text-[#8696a0] hover:text-[#e9edef] rounded-full hover:bg-[#2a3942]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Global Navigation Bar - Mirror Mode Switcher */}
      <div className="bg-[#111b21] px-4 py-2 border-b border-[#222d34] flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00ffaa]/20 border border-[#00ffaa]/40 flex items-center justify-center text-[#00ffaa]">
            <Bot className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold text-xs text-[#00ffaa] tracking-wider block leading-none">
              ח. סבן בע"מ - WhatsApp Web Mirror & Control Center
            </span>
            <span className="text-[10px] text-[#8696a0] dir-ltr inline-block">
              +972508861080 (נועה AI Listener)
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-[#202c33] p-1 rounded-lg border border-[#2a3942] text-xs">
          <button
            onClick={() => setActiveTab('chats')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'chats'
                ? 'bg-[#00ffaa] text-[#0a0b10] shadow-md'
                : 'text-[#8696a0] hover:text-[#e9edef]'
            }`}
            id="tab-btn-chats-mirror"
          >
            <span>💬 צ'אטים ולקוחות (WhatsApp Mirror)</span>
          </button>

          <button
            onClick={() => setActiveTab('noa_command')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'noa_command'
                ? 'bg-[#00ffaa] text-[#0a0b10] shadow-md'
                : 'text-[#8696a0] hover:text-[#e9edef]'
            }`}
            id="tab-btn-noa-command"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>🤖 מרכז שליטה נועה AI (Command Hub)</span>
          </button>
        </div>

        {/* Sync & Admin Quick Access */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playNotificationChime();
              syncLiveSheetData();
            }}
            className="p-1.5 bg-[#202c33] hover:bg-[#2a3942] text-[#00ffaa] rounded-lg transition-colors border border-[#00ffaa]/30 text-xs flex items-center gap-1"
            title="סנכרן נתונים בזמן אמת מ-Google Sheets"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">סנכרן גליון</span>
          </button>

          <button
            onClick={() => requestAdminAccess()}
            className="px-2.5 py-1.5 bg-[#202c33] hover:bg-[#2a3942] text-amber-400 rounded-lg text-xs font-bold border border-amber-500/30 flex items-center gap-1"
            title="פאנל ניהול אדמין"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ניהול אדמין</span>
          </button>
        </div>
      </div>

      {/* Main Body View */}
      {activeTab === 'noa_command' ? (
        <NoaCommandCenter />
      ) : (
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Left Column: 1:1 WhatsApp Web Chat List Sidebar */}
          <aside className={`${activeChatId ? 'hidden md:flex' : 'flex'} w-full md:w-[350px] lg:w-[380px] h-full bg-[#111b21] border-l border-[#222d34] flex-col shrink-0 relative z-10`}>
            
            {/* Sidebar Header */}
            <div className="h-[60px] bg-[#202c33] px-4 flex items-center justify-between shrink-0 border-b border-[#222d34]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#00ffaa]/20 border border-[#00ffaa]/40 flex items-center justify-center text-[#00ffaa]">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-xs text-[#e9edef]">נועה AI - סידור הובלות</h2>
                  <span className="text-[10px] text-[#00ffaa] font-semibold">● מחובר 24/7 (C:\ap94)</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[#8696a0]">
                <button
                  onClick={() => requestAdminAccess()}
                  className="p-1.5 hover:text-[#e9edef] rounded-full hover:bg-[#2a3942] transition-colors"
                  title="סטטוס מערכת"
                >
                  <CircleDashed className="w-5 h-5 text-emerald-400" />
                </button>
                <HeaderMenuDropdown onOpenNewContact={() => {}} />
              </div>
            </div>

            {/* Search Bar */}
            <div className="p-2 bg-[#111b21]">
              <div className="bg-[#202c33] rounded-lg flex items-center px-3 py-1.5 border border-transparent focus-within:border-[#00ffaa]/60 transition-colors">
                <Search className="w-4 h-4 text-[#8696a0] ml-2 shrink-0" />
                <input
                  type="text"
                  placeholder="חפש או התחל צ'אט חדש..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs text-[#e9edef] placeholder-[#8696a0] focus:outline-none"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="px-3 py-1 bg-[#111b21] flex items-center gap-1 border-b border-[#222d34] overflow-x-auto custom-scrollbar">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                  activeFilter === 'all'
                    ? 'bg-[#00a884] text-[#111b21] font-bold'
                    : 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef]'
                }`}
              >
                הכל
              </button>
              <button
                onClick={() => setActiveFilter('unread')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                  activeFilter === 'unread'
                    ? 'bg-[#00a884] text-[#111b21] font-bold'
                    : 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef]'
                }`}
              >
                לא נקרא
              </button>
              <button
                onClick={() => setActiveFilter('favorites')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                  activeFilter === 'favorites'
                    ? 'bg-[#00a884] text-[#111b21] font-bold'
                    : 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef]'
                }`}
              >
                מועדפים
              </button>
              <button
                onClick={() => setActiveFilter('groups')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                  activeFilter === 'groups'
                    ? 'bg-[#00a884] text-[#111b21] font-bold'
                    : 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef]'
                }`}
              >
                קבוצות
              </button>
            </div>

            {/* Chat List Stream */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#222d34] custom-scrollbar">
              {filteredContacts.map((contact) => {
                const isActive = contact.id === activeChatId;
                const isNoaChat = contact.id === 'chat-noa-ai';

                return (
                  <div
                    key={contact.id}
                    onClick={() => setActiveChatId(contact.id)}
                    className={`p-3 flex items-center gap-3 cursor-pointer transition-colors relative group ${
                      isActive ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <img
                        src={contact.avatar}
                        alt={contact.name}
                        className="w-12 h-12 rounded-full object-cover border border-[#2a3942]"
                      />
                      {isNoaChat ? (
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#00ffaa] rounded-full border-2 border-[#111b21] flex items-center justify-center">
                          <Bot className="w-2.5 h-2.5 text-[#111b21]" />
                        </span>
                      ) : (
                        <span
                          className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#111b21] ${
                            contact.isAIEnabled ? 'bg-[#00ffaa]' : 'bg-amber-400'
                          }`}
                          title={contact.isAIEnabled ? 'רובוט אוטומטי פעיל' : 'מצב ידני'}
                        />
                      )}
                    </div>

                    {/* Chat Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <div className="flex items-center gap-1.5 truncate">
                          {contact.isPinned && <Pin className="w-3 h-3 text-[#8696a0] rotate-45 shrink-0" />}
                          <h3 className="font-bold text-sm text-[#e9edef] truncate">{contact.name}</h3>
                          {isNoaChat && (
                            <span className="text-[10px] bg-[#00ffaa]/20 text-[#00ffaa] px-1.5 py-0.2 rounded font-extrabold border border-[#00ffaa]/30">
                              מלשינון AI
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#8696a0] shrink-0">{contact.lastTimestamp || 'עכשיו'}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs text-[#8696a0]">
                        <p className="truncate text-[#8696a0]">{contact.lastMessage || 'אין הודעות קודמות'}</p>
                        
                        {/* Auto vs Manual Badge & Unread */}
                        <div className="flex items-center gap-1 shrink-0 mr-1">
                          {contact.unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-[#00a884] text-[#111b21] font-bold text-[10px] rounded-full">
                              {contact.unreadCount}
                            </span>
                          )}

                          {/* Profile Drawer Trigger Icon */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenProfileDrawer(contact);
                            }}
                            className="p-1 hover:text-[#00ffaa] rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="פתח פרופיל לקוח מורחב"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Right Column: Active Chat Area */}
          <main className={`${activeChatId ? 'flex' : 'hidden md:flex'} flex-1 flex-col h-full bg-[#0b141a] relative`}>
            
            {/* Active Chat Header */}
            {activeContact && (
              <header className="h-[60px] bg-[#202c33] px-4 flex items-center justify-between shrink-0 border-b border-[#222d34] z-10">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveChatId('')}
                    className="md:hidden p-1 text-[#8696a0] hover:text-[#e9edef]"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="relative cursor-pointer" onClick={() => handleOpenProfileDrawer(activeContact)}>
                    <img
                      src={activeContact.avatar}
                      alt={activeContact.name}
                      className="w-10 h-10 rounded-full object-cover border border-[#2a3942]"
                    />
                  </div>

                  <div className="cursor-pointer" onClick={() => handleOpenProfileDrawer(activeContact)}>
                    <h2 className="font-bold text-sm text-[#e9edef] flex items-center gap-2">
                      <span>{activeContact.name}</span>
                      <span className="text-[10px] font-mono text-[#8696a0] dir-ltr">({activeContact.phone})</span>
                    </h2>
                    <p className="text-xs text-[#8696a0] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#00ffaa] animate-pulse" />
                      <span>{activeContact.onlineStatus === 'online' ? 'מחובר כעת' : 'מחובר בסידור 24/7'}</span>
                    </p>
                  </div>
                </div>

                {/* Right Header Controls & Mode Switch Toggle */}
                <div className="flex items-center gap-3">
                  {/* Mode Switcher Button */}
                  <button
                    onClick={() => toggleContactAI(activeContact.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm ${
                      activeContact.isAIEnabled
                        ? 'bg-[#00ffaa]/20 border-[#00ffaa]/50 text-[#00ffaa] hover:bg-[#00ffaa]/30'
                        : 'bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30'
                    }`}
                    id="btn-header-mode-toggle"
                  >
                    {activeContact.isAIEnabled ? (
                      <>
                        <Bot className="w-4 h-4 text-[#00ffaa]" />
                        <span>🤖 Auto-Noa</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4 text-amber-400" />
                        <span>👤 Manual Admin</span>
                      </>
                    )}
                  </button>

                  {/* Open Profile Drawer */}
                  <button
                    onClick={() => handleOpenProfileDrawer(activeContact)}
                    className="p-2 text-[#8696a0] hover:text-[#00ffaa] hover:bg-[#2a3942] rounded-full transition-colors"
                    title="פתח פרופיל לקוח ואימות גליון"
                    id="btn-open-drawer-header"
                  >
                    <SlidersHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </header>
            )}

            {/* Message Stream */}
            <div className="flex-1 overflow-hidden relative">
              <MessageList />
            </div>

            {/* Input Bar */}
            <InputBar />

          </main>

          {/* Integrated Customer Profile Drawer */}
          <CustomerProfileDrawer
            contact={selectedDrawerContact}
            isOpen={isProfileDrawerOpen}
            onClose={() => setIsProfileDrawerOpen(false)}
          />

        </div>
      )}
    </div>
  );
};
