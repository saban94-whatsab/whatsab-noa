import React, { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { MainChat } from './components/MainChat';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { useWhatsAppStore } from './store/useWhatsAppStore';

export default function App() {
  const { setIsAdminOpen, isAdminOpen } = useWhatsAppStore();

  // Keyboard shortcut Ctrl+Shift+A to toggle Admin Panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a' || e.key === 'ש')) {
        e.preventDefault();
        setIsAdminOpen(!isAdminOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdminOpen, setIsAdminOpen]);

  return (
    <div className="w-screen h-screen bg-[#0b141a] flex flex-col overflow-hidden font-sans dir-rtl text-[#e9edef] antialiased select-none">
      {/* WhatsApp Web Outer Canvas Container */}
      <div className="w-full h-full flex overflow-hidden max-w-[1700px] mx-auto shadow-2xl relative">
        <Sidebar />
        <MainChat />
      </div>

      {/* Hidden Admin Dashboard Modal */}
      <AdminDashboardModal />
    </div>
  );
}
