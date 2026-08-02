import React from 'react';
import { useWhatsAppStore } from '../store/useWhatsAppStore';
import { MainChatHeader } from './MainChatHeader';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';
import { Building2, ShieldCheck, Lock } from 'lucide-react';

export const MainChat: React.FC = () => {
  const { activeChatId, contacts, setIsAdminOpen, setAdminTab } = useWhatsAppStore();
  const activeContact = contacts.find((c) => c.id === activeChatId);

  if (!activeContact) {
    return (
      <main className="flex-1 h-full bg-[#222e35] flex flex-col items-center justify-center p-8 text-center select-none border-r border-[#222d34]">
        <div className="max-w-md flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-[#111b21] border border-[#2a3942] flex items-center justify-center text-[#00a884] shadow-xl">
            <Building2 className="w-12 h-12" />
          </div>

          <h1 className="text-2xl font-bold text-[#e9edef]">
            וואטסאפ ווב - סידור ח. סבן חומרי בניין
          </h1>

          <p className="text-sm text-[#8696a0] leading-relaxed">
            שלח וקבל הודעות בזמן אמת, נהל שיחות קבלנים, ובצע מעקב וובהוקים עם עוזרת AI נועה חכמה המחוברת ל-Firebase Realtime DB.
          </p>

          <button
            onClick={() => {
              setIsAdminOpen(true);
              setAdminTab('metrics');
            }}
            className="mt-4 px-6 py-2.5 bg-[#00a884] text-[#111b21] font-bold rounded-lg hover:bg-[#029676] transition-all shadow-md flex items-center gap-2"
            id="btn-empty-open-admin"
          >
            <ShieldCheck className="w-5 h-5" />
            פתח פאנל ניהול (Ctrl+Shift+A)
          </button>

          <div className="flex items-center gap-2 text-xs text-[#8696a0] mt-8">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>מוצפן מקצה לקצה • Listener v2.4 Active</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 h-full flex flex-col bg-[#0b141a] relative overflow-hidden">
      <MainChatHeader />
      <MessageList />
      <InputBar />
    </main>
  );
};
