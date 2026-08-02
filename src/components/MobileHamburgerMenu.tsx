import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Lock, MessageSquare, Bell, Smartphone, Volume2, VolumeX, Shield, Wifi, RefreshCw, Layers } from 'lucide-react';
import { useWhatsAppStore } from '../store/useWhatsAppStore';
import { triggerBrowserNotification, playMobileRingtone } from '../utils/audio';

interface MobileHamburgerMenuProps {
  onOpenAdminAuth: () => void;
}

export const MobileHamburgerMenu: React.FC<MobileHamburgerMenuProps> = ({ onOpenAdminAuth }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const { isSoundMuted, toggleSoundMuted, activeFilter, setActiveFilter } = useWhatsAppStore();
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide idle timer logic (2 seconds of inactivity -> dim / auto-hide button)
  const resetIdleTimer = () => {
    setIsIdle(false);
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, 2000); // 2 seconds auto-hide requirement
  };

  useEffect(() => {
    resetIdleTimer();

    const handleUserActivity = () => {
      resetIdleTimer();
    };

    window.addEventListener('touchstart', handleUserActivity, { passive: true });
    window.addEventListener('mousemove', handleUserActivity, { passive: true });
    window.addEventListener('scroll', handleUserActivity, { passive: true });

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
    };
  }, []);

  const handleTestRingtone = () => {
    triggerBrowserNotification('נועה AI - בדיקת צלצול מובייל', 'בדיקת מנוע התראות דפדפן וצלצול מובייל פעיל', true);
  };

  return (
    <>
      {/* Floating Hamburger Toggle Button (Positioned at top-left/top-right with auto-hide layer) */}
      <div
        className={`fixed top-3 left-3 z-40 transition-all duration-500 ease-in-out ${
          isIdle && !isOpen
            ? 'opacity-30 scale-90 translate-x-2'
            : 'opacity-100 scale-100 translate-x-0'
        }`}
        onMouseEnter={resetIdleTimer}
        onTouchStart={resetIdleTimer}
      >
        <button
          onClick={() => {
            resetIdleTimer();
            setIsOpen(!isOpen);
          }}
          className="bg-[#00a884] text-[#111b21] p-2.5 rounded-full shadow-2xl border border-emerald-400/50 hover:bg-[#029676] active:scale-95 transition-all flex items-center gap-1.5 font-bold text-xs"
          title="תפריט המבורגר מובייל"
          id="btn-mobile-hamburger-trigger"
        >
          {isOpen ? <X className="w-5 h-5 stroke-[2.5]" /> : <Menu className="w-5 h-5 stroke-[2.5]" />}
          <span className="hidden sm:inline">תפריט</span>
        </button>
      </div>

      {/* Slide-over Mobile Drawer Navigation Layer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex dir-rtl animate-in fade-in duration-200">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-80 max-w-[85vw] bg-[#111b21] border-l border-[#2a3942] h-full flex flex-col justify-between shadow-2xl z-10 text-[#e9edef] animate-in slide-in-from-right duration-300">
            <div>
              {/* Drawer Header */}
              <div className="p-5 bg-[#202c33] border-b border-[#2a3942] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#00a884]/20 border border-[#00a884] flex items-center justify-center">
                    <img
                      src="https://i.ibb.co/Zz6H1zth/1785576538638.png"
                      alt="נועה AI"
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#e9edef]">נועה AI - ח. סבן</h3>
                    <span className="text-[10px] text-[#00a884] font-medium block">
                      ממשק מובייל PWA v2.5
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-[#8696a0] hover:text-[#e9edef] rounded-full hover:bg-[#2a3942]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Navigation List */}
              <div className="p-4 space-y-2">
                <div className="text-[11px] font-bold text-[#8696a0] uppercase tracking-wider px-2 mb-1">
                  ניווט ראשי ותצוגה
                </div>

                {/* Full WhatsApp Chat Option */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full text-right px-3 py-3 rounded-xl bg-[#202c33] border border-[#2a3942] text-xs font-bold text-[#e9edef] flex items-center gap-3 hover:bg-[#2a3942] transition-colors"
                >
                  <div className="p-2 bg-[#00a884]/20 text-[#00a884] rounded-lg">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <span>צ'אט וואטסאפ ראשי (100% מסך)</span>
                </button>

                {/* Password Lock Admin Access Button (Default PIN: 1125) */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenAdminAuth();
                  }}
                  className="w-full text-right px-3 py-3 rounded-xl bg-gradient-to-l from-[#00a884]/20 to-[#202c33] border border-[#00a884]/40 text-xs font-bold text-[#e9edef] flex items-center justify-between hover:border-[#00a884] transition-all"
                  id="btn-drawer-admin-passcode"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#00a884] text-[#111b21] rounded-lg shadow-sm">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[#e9edef]">דפי ניהול מוגנים</span>
                      <span className="text-[10px] text-[#00a884] font-normal">קוד מנהל מוגן (1125)</span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-[#00a884]/30 text-[#00a884] border border-[#00a884]/50 px-2 py-0.5 rounded font-mono font-bold">
                    1125
                  </span>
                </button>

                <div className="pt-3 text-[11px] font-bold text-[#8696a0] uppercase tracking-wider px-2 mb-1">
                  התראות, צליל ו-PWA
                </div>

                {/* Browser Notification & Ringtone Test */}
                <button
                  onClick={handleTestRingtone}
                  className="w-full text-right px-3 py-2.5 rounded-xl bg-[#182229] border border-[#2a3942] text-xs font-medium text-[#e9edef] flex items-center gap-3 hover:bg-[#202c33] transition-colors"
                  id="btn-drawer-test-ringtone"
                >
                  <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
                    <Bell className="w-4 h-4" />
                  </div>
                  <span>בדיקת צלצול מובייל והתראה</span>
                </button>

                {/* Mute/Unmute audio toggle */}
                <button
                  onClick={toggleSoundMuted}
                  className="w-full text-right px-3 py-2.5 rounded-xl bg-[#182229] border border-[#2a3942] text-xs font-medium text-[#e9edef] flex items-center justify-between hover:bg-[#202c33] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
                      {isSoundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </div>
                    <span>השתקת צלילי הודעות</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    isSoundMuted ? 'bg-rose-950 text-rose-400' : 'bg-emerald-950 text-emerald-400'
                  }`}>
                    {isSoundMuted ? 'מושתק' : 'פעיל'}
                  </span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#182229] border-t border-[#2a3942] text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-[#00a884] font-medium mb-1">
                <Shield className="w-3.5 h-3.5" />
                <span>מערכת JONI - ח. סבן חומרי בניין</span>
              </div>
              <p className="text-[10px] text-[#8696a0]">
                עבודה אופליין מלאה • סנכרון Firebase & Google Sheets
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
