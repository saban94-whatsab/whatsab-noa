import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, ShieldCheck, PlusCircle, Volume2, VolumeX, Bot, RefreshCw, Building2 } from 'lucide-react';
import { useWhatsAppStore } from '../store/useWhatsAppStore';

interface HeaderMenuDropdownProps {
  onOpenNewContact: () => void;
}

export const HeaderMenuDropdown: React.FC<HeaderMenuDropdownProps> = ({ onOpenNewContact }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { setIsAdminOpen, setAdminTab, config, toggleGlobalAI, isSoundMuted, toggleSoundMuted } = useWhatsAppStore();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-[#8696a0] hover:text-[#e9edef] rounded-full hover:bg-[#202c33] transition-colors focus:outline-none"
        title="תפריט אופציות"
        id="btn-main-header-menu"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 bg-[#233138] border border-[#2a3942] rounded-md shadow-2xl z-50 py-1.5 text-[#e9edef] text-sm animate-in fade-in zoom-in-95 duration-100">
          <button
            onClick={() => {
              setIsAdminOpen(true);
              setAdminTab('metrics');
              setIsOpen(false);
            }}
            className="w-full text-right px-4 py-2.5 hover:bg-[#182229] flex items-center justify-between text-[#00a884] font-medium"
            id="menu-item-admin"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              פאנל ניהול (Ctrl+Shift+A)
            </span>
            <span className="bg-[#00a884]/20 text-[#00a884] text-[10px] px-1.5 py-0.5 rounded font-mono">ADMIN</span>
          </button>

          <button
            onClick={() => {
              onOpenNewContact();
              setIsOpen(false);
            }}
            className="w-full text-right px-4 py-2.5 hover:bg-[#182229] flex items-center gap-2"
            id="menu-item-new-chat"
          >
            <PlusCircle className="w-4 h-4 text-[#8696a0]" />
            צ'אט חדש / הוספת לקוח
          </button>

          <button
            onClick={() => {
              toggleGlobalAI();
              setIsOpen(false);
            }}
            className="w-full text-right px-4 py-2.5 hover:bg-[#182229] flex items-center justify-between"
            id="menu-item-toggle-ai"
          >
            <span className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#8696a0]" />
              מענה נועה AI גלובלי
            </span>
            <span className={`w-2 h-2 rounded-full ${config.isAIGloballyEnabled ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`} />
          </button>

          <button
            onClick={() => {
              toggleSoundMuted();
              setIsOpen(false);
            }}
            className="w-full text-right px-4 py-2.5 hover:bg-[#182229] flex items-center gap-2"
            id="menu-item-toggle-sound"
          >
            {isSoundMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-[#8696a0]" />}
            {isSoundMuted ? 'הפעל התראות קוליות' : 'השתק צלילי וואטסאפ'}
          </button>

          <div className="border-t border-[#2a3942] my-1" />

          <button
            onClick={() => {
              setIsAdminOpen(true);
              setAdminTab('logs');
              setIsOpen(false);
            }}
            className="w-full text-right px-4 py-2.5 hover:bg-[#182229] flex items-center gap-2 text-xs text-[#8696a0]"
            id="menu-item-joni-logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            מוניטור וובהוק JONI Plugin
          </button>

          <div className="px-4 py-2 text-[11px] text-[#8696a0] flex items-center gap-1.5 border-t border-[#2a3942]">
            <Building2 className="w-3.5 h-3.5 text-[#00a884]" />
            ח. סבן חומרי בניין בע"מ v2.4
          </div>
        </div>
      )}
    </div>
  );
};
