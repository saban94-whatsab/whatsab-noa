import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, Smartphone, Bell, CheckCircle2 } from 'lucide-react';
import { triggerBrowserNotification, playMobileRingtone } from '../utils/audio';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [pwaInstallPrompt, setPwaInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowSyncSuccess(true);
      setTimeout(() => setShowSyncSuccess(false), 4000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // PWA BeforeInstallPrompt listener
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPwaInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallApp = async () => {
    if (pwaInstallPrompt) {
      pwaInstallPrompt.prompt();
      const choiceResult = await pwaInstallPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted PWA installation');
      }
      setPwaInstallPrompt(null);
    } else {
      alert('להתקנת האפליקציה במכשיר: לחץ על שלוש הנקודות בדפדפן ובחר "הוסף למסך הבית" או "התקן אפליקציה" (PWA)');
    }
  };

  const handleTestNotification = () => {
    triggerBrowserNotification('נועה AI - ח. סבן 🏗️', 'התקבלה הזמנה חדשה מקבוצת וואטסאפ - לחץ לצפייה בפרטים', true);
  };

  return (
    <>
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-600/90 text-white px-4 py-2 text-xs flex items-center justify-between border-b border-amber-500 shadow-md shrink-0 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 animate-pulse shrink-0" />
            <span>
              <strong>מצב אופליין פעיל:</strong> כל השיחות וההזמנות נשמרות בזיכרון המקומי בדפדפן. סנכרון לגליון יתחדש בהתחברות לרשת.
            </span>
          </div>
          <span className="bg-black/20 px-2 py-0.5 rounded text-[10px] font-mono">PWA Offline</span>
        </div>
      )}

      {/* Reconnected Sync Toast */}
      {showSyncSuccess && isOnline && (
        <div className="bg-[#00a884] text-[#111b21] px-4 py-2 text-xs font-bold flex items-center justify-between border-b border-emerald-400 shadow-md shrink-0 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>החיבור לרשת חודש! נתוני השיחות וההזמנות מסונכרנים כעת מול גליון Google Sheets ו-Firebase.</span>
          </div>
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        </div>
      )}
    </>
  );
};
