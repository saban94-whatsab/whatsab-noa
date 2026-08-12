import React, { useEffect } from 'react';
import { WhatsAppMirror } from './components/WhatsAppMirror';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { PasswordModal } from './components/PasswordModal';
import { MobileHamburgerMenu } from './components/MobileHamburgerMenu';
import { OfflineBanner } from './components/OfflineBanner';
import { NewOrderToast } from './components/NewOrderToast';
import { ToastHost } from './components/ToastHost';
import { useWhatsAppStore } from './store/useWhatsAppStore';
import { useUiStore, applyThemeToDocument } from './store/useUiStore';

export default function App() {
  const {
    setIsAdminOpen,
    isAdminOpen,
    isPasscodeModalOpen,
    setIsPasscodeModalOpen,
    setIsAdminAuthenticated,
    requestAdminAccess,
    syncLiveSheetData,
  } = useWhatsAppStore();

  const theme = useUiStore((s) => s.theme);

  // Ensure <html> reflects the persisted theme on mount
  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  // Auto-sync live Google Sheet data (order log tab & customer folders) on mount and poll every 15 seconds
  useEffect(() => {
    syncLiveSheetData();

    const interval = setInterval(() => {
      syncLiveSheetData();
    }, 15000);

    return () => clearInterval(interval);
  }, [syncLiveSheetData]);

  // Keyboard shortcut Ctrl+Shift+A to toggle Admin Panel securely
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a' || e.key === 'ש')) {
        e.preventDefault();
        requestAdminAccess();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [requestAdminAccess]);

  return (
    <div className="w-screen h-screen bg-[#0b141a] flex flex-col overflow-hidden font-sans dir-rtl text-[#e9edef] antialiased select-none relative">
      {/* Offline Status & Sync Banner */}
      <OfflineBanner />

      {/* Real-Time Incoming Order Toast Notification */}
      <NewOrderToast />

      {/* Mobile Auto-Hiding Hamburger Drawer */}
      <MobileHamburgerMenu onOpenAdminAuth={requestAdminAccess} />

      {/* 100% WhatsApp Web Outer Canvas Container */}
      <div className="w-full flex-1 flex overflow-hidden max-w-[1700px] mx-auto shadow-2xl relative">
        <WhatsAppMirror />
      </div>

      {/* Protected Admin Passcode Auth Modal (Default PIN: 1125) */}
      <PasswordModal
        isOpen={isPasscodeModalOpen}
        onClose={() => setIsPasscodeModalOpen(false)}
        onSuccess={() => {
          setIsAdminAuthenticated(true);
          setIsPasscodeModalOpen(false);
          setIsAdminOpen(true);
        }}
      />

      {/* Admin Management Dashboard Modal */}
      <AdminDashboardModal />
    </div>
  );
}

