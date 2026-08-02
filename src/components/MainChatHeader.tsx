import React from 'react';
import { Search, Bot, UserCheck, ShieldCheck, Phone, Video } from 'lucide-react';
import { useWhatsAppStore } from '../store/useWhatsAppStore';

export const MainChatHeader: React.FC = () => {
  const { contacts, activeChatId, toggleContactAI, setIsAdminOpen, setAdminTab } = useWhatsAppStore();
  const activeContact = contacts.find((c) => c.id === activeChatId);

  if (!activeContact) return null;

  return (
    <header className="h-[60px] bg-[#202c33] flex items-center justify-between px-4 shrink-0 z-10 border-r border-white/5 border-b border-white/5 select-none">
      {/* Contact Info */}
      <div className="flex items-center">
        <div className="relative shrink-0 ml-3">
          <img
            src={activeContact.avatar}
            alt={activeContact.name}
            className="w-10 h-10 rounded-full object-cover"
          />
          {activeContact.onlineStatus === 'online' && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#202c33]" />
          )}
        </div>

        <div>
          <div className="font-medium text-sm text-[#e9edef] flex items-center gap-2">
            {activeContact.name}
            {activeContact.tags?.map((tag) => (
              <span key={tag} className="text-[10px] bg-[#2a3942] text-[#8696a0] px-1.5 py-0.2 rounded font-normal">
                {tag}
              </span>
            ))}
          </div>
          <div className="text-[11px] text-[#8696a0]">
            {activeContact.onlineStatus === 'typing' ? (
              <span className="text-[#00a884] font-medium animate-pulse">נועה AI מקליד/ה...</span>
            ) : activeContact.onlineStatus === 'online' ? (
              'נועה AI מחוברת | פעיל כעת'
            ) : (
              `טלפון: ${activeContact.phone}`
            )}
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2">
        {/* Toggle AI Takeover Button */}
        <button
          onClick={() => toggleContactAI(activeContact.id)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
            activeContact.isAIEnabled
              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 hover:bg-emerald-900'
              : 'bg-amber-950/80 text-amber-400 border border-amber-700/60 hover:bg-amber-900'
          }`}
          title={activeContact.isAIEnabled ? 'לחץ למעבר להשתלטות אנושית' : 'לחץ להפעלת נועה AI למענה אוטומטי'}
          id="btn-header-toggle-contact-ai"
        >
          {activeContact.isAIEnabled ? (
            <>
              <Bot className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>נועה AI פעילה</span>
            </>
          ) : (
            <>
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>השתלטות אנושית</span>
            </>
          )}
        </button>

        {/* Call icons simulation */}
        <div className="hidden sm:flex items-center gap-1 text-[#8696a0] border-r border-[#2a3942] pr-2">
          <button className="p-2 hover:text-[#e9edef] hover:bg-[#2a3942] rounded-full transition-colors" title="שיחת וידאו">
            <Video className="w-4 h-4" />
          </button>
          <button className="p-2 hover:text-[#e9edef] hover:bg-[#2a3942] rounded-full transition-colors" title="שיחת קול">
            <Phone className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <button className="p-2 text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] rounded-full transition-colors" title="חפש בצ'אט">
          <Search className="w-5 h-5" />
        </button>

        {/* Admin Dashboard trigger button */}
        <button
          onClick={() => {
            setIsAdminOpen(true);
            setAdminTab('crm');
          }}
          className="p-2 text-[#00a884] hover:text-white hover:bg-[#00a884]/20 rounded-full transition-colors"
          title="פתח פאנל ניהול CRM (Ctrl+Shift+A)"
          id="btn-header-open-admin"
        >
          <ShieldCheck className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
