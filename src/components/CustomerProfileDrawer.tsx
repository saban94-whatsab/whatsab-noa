import React, { useState, useEffect } from 'react';
import { 
  X, User, Phone, Mail, MapPin, Building, ShieldCheck, 
  Bot, UserCheck, RefreshCw, FileSpreadsheet, Plus, Trash2, 
  Clock, Truck, CheckCircle2, AlertTriangle, Save, Loader2, Sparkles, Hash
} from 'lucide-react';
import { Contact, CustomerRecord } from '../types';
import { useWhatsAppStore } from '../store/useWhatsAppStore';

interface CustomerProfileDrawerProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerProfileDrawer: React.FC<CustomerProfileDrawerProps> = ({
  contact,
  isOpen,
  onClose,
}) => {
  const { toggleContactAI, updateCustomer, customers } = useWhatsAppStore();

  const [comaxId, setComaxId] = useState('');
  const [email, setEmail] = useState('');
  const [groupName, setGroupName] = useState('קבוצת הובלות מרכז (ח.סבן)');
  const [addresses, setAddresses] = useState<string[]>([]);
  const [newAddressInput, setNewAddressInput] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sheet Verification State
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [sheetHistory, setSheetHistory] = useState<any[]>([]);
  const [verifiedAddresses, setVerifiedAddresses] = useState<string[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // Find linked customer record
  const cleanPhone = contact?.phone.replace(/[^0-9]/g, '') || '';
  const customerRecord = customers.find(c => c.phone.replace(/[^0-9]/g, '') === cleanPhone);

  useEffect(() => {
    if (contact) {
      if (customerRecord) {
        setComaxId(customerRecord.comaxId || '');
        setAddresses(customerRecord.address ? [customerRecord.address] : []);
        setNotes(customerRecord.notes || '');
      } else {
        setComaxId(`51${Math.floor(1000 + Math.random() * 8999)}`);
        setAddresses(['אתר חלוקה ראשי']);
      }

      // Initial fetch of profile from backend API if available
      fetchProfileAndHistory(cleanPhone);
    }
  }, [contact, customerRecord]);

  const fetchProfileAndHistory = async (phoneStr: string) => {
    if (!phoneStr) return;
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/noa/sheet-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneStr }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.profile) {
          if (data.profile.email) setEmail(data.profile.email);
          if (data.profile.groupName) setGroupName(data.profile.groupName);
          if (data.profile.addresses && data.profile.addresses.length > 0) {
            setAddresses(data.profile.addresses);
          }
          if (data.profile.comaxId) setComaxId(data.profile.comaxId);
          if (data.profile.notes) setNotes(data.profile.notes);
        }
        setSheetHistory(data.ordersHistory || []);
        setVerifiedAddresses(data.verifiedAddresses || []);
        setAiSummary(data.summaryAi || null);
      }
    } catch (err) {
      console.warn('Sheet history lookup failed:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  if (!isOpen || !contact) return null;

  const handleAddAddress = () => {
    if (!newAddressInput.trim()) return;
    setAddresses(prev => [...prev, newAddressInput.trim()]);
    setNewAddressInput('');
  };

  const handleRemoveAddress = (index: number) => {
    setAddresses(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // 1. Update backend API profile endpoint
      await fetch('/api/customer/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          customerId: `CUST-${comaxId || cleanPhone}`,
          name: contact.name,
          email,
          addresses,
          groupName,
          comaxId,
          notes,
        }),
      });

      // 2. Update local Zustand Store
      if (customerRecord) {
        updateCustomer(customerRecord.id, {
          comaxId,
          address: addresses[0] || customerRecord.address,
          notes,
        });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update customer profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#111b21] h-full text-[#e9edef] flex flex-col border-r border-[#222d34] shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#202c33] px-5 py-4 flex items-center justify-between border-b border-[#222d34]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#00a884]/20 border border-[#00a884]/40 flex items-center justify-center text-[#00ffaa]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-[#e9edef] leading-tight">{contact.name}</h2>
              <p className="text-xs text-[#8696a0] dir-ltr flex items-center gap-1">
                <span>+{contact.phone}</span>
                <span className="text-[#00ffaa]">●</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">

          {/* Mode Switch Banner (Auto-Noa vs Manual Admin) */}
          <div className="bg-[#202c33] rounded-xl p-4 border border-[#2a3942] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {contact.isAIEnabled ? (
                  <Bot className="w-5 h-5 text-[#00ffaa] animate-pulse" />
                ) : (
                  <UserCheck className="w-5 h-5 text-amber-400" />
                )}
                <div>
                  <h3 className="text-sm font-semibold text-[#e9edef]">מצב מענה בצ'אט</h3>
                  <p className="text-xs text-[#8696a0]">
                    {contact.isAIEnabled ? 'רובוט נועה AI משיב אוטומטית' : 'מצב ידני בלבד - מענה אנושי מהמנהל'}
                  </p>
                </div>
              </div>

              {/* Mode Toggle Button */}
              <button
                onClick={() => toggleContactAI(contact.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  contact.isAIEnabled
                    ? 'bg-[#00ffaa]/20 border-[#00ffaa]/50 text-[#00ffaa] hover:bg-[#00ffaa]/30'
                    : 'bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30'
                }`}
                id="btn-toggle-drawer-mode"
              >
                {contact.isAIEnabled ? (
                  <>
                    <span>🤖 Auto-Noa</span>
                    <span className="w-2 h-2 rounded-full bg-[#00ffaa] animate-ping" />
                  </>
                ) : (
                  <>
                    <span>👤 Manual Admin</span>
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Enriched Customer Details Form */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#8696a0] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#00ffaa]" />
              פרטי לקוח מורחבים (מזהה ח.סבן & Comax)
            </h3>

            {/* Comax ID & Account Number */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#8696a0] mb-1 block">מזהה לקוח Comax</label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-[#8696a0] absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={comaxId}
                    onChange={(e) => setComaxId(e.target.value)}
                    placeholder="לדוגמה: 519205"
                    className="w-full bg-[#111b21] border border-[#2a3942] rounded-lg pr-9 pl-3 py-2 text-xs text-[#e9edef] focus:outline-none focus:border-[#00ffaa]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[#8696a0] mb-1 block">שיוך לקבוצת הובלות</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-[#8696a0] absolute right-3 top-2.5" />
                  <select
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full bg-[#111b21] border border-[#2a3942] rounded-lg pr-9 pl-2 py-2 text-xs text-[#e9edef] focus:outline-none focus:border-[#00ffaa]"
                  >
                    <option value="קבוצת הובלות מרכז (ח.סבן)">מרכז (חולון / ראשל"צ)</option>
                    <option value="קבוצת הובלות צפון (ח.סבן)">צפון (חיפה / קריות)</option>
                    <option value="קבוצת הובלות דרום (ח.סבן)">דרום (באר שבע)</option>
                    <option value="קבוצת לקוחות VIP למנופים">קבוצת VIP מנופים</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="text-xs text-[#8696a0] mb-1 block">כתובת דוא"ל למשלוח חשבוניות</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8696a0] absolute right-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@saban.co.il"
                  className="w-full bg-[#111b21] border border-[#2a3942] rounded-lg pr-9 pl-3 py-2 text-xs text-[#e9edef] focus:outline-none focus:border-[#00ffaa]"
                />
              </div>
            </div>

            {/* Delivery Sites / Addresses List */}
            <div>
              <label className="text-xs text-[#8696a0] mb-1 block">כתובות אתרי אספקה מאושרים</label>
              <div className="space-y-2 mb-2">
                {addresses.map((addr, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-[#202c33] px-3 py-1.5 rounded-lg border border-[#2a3942] text-xs">
                    <span className="flex items-center gap-2 text-[#e9edef] truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#00ffaa] shrink-0" />
                      {addr}
                    </span>
                    <button
                      onClick={() => handleRemoveAddress(idx)}
                      className="text-red-400 hover:text-red-300 p-1"
                      title="הסר כתובת"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAddressInput}
                  onChange={(e) => setNewAddressInput(e.target.value)}
                  placeholder="הוסף כתובת אתר חדשה..."
                  className="flex-1 bg-[#111b21] border border-[#2a3942] rounded-lg px-3 py-2 text-xs text-[#e9edef] focus:outline-none focus:border-[#00ffaa]"
                />
                <button
                  onClick={handleAddAddress}
                  className="px-3 py-2 bg-[#2a3942] hover:bg-[#3b4a54] text-[#00ffaa] rounded-lg text-xs font-semibold flex items-center gap-1 border border-[#00ffaa]/30"
                >
                  <Plus className="w-3.5 h-3.5" />
                  הוסף
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs text-[#8696a0] mb-1 block">הערות לוגיסטיות מנהל</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="הנחיות מנוף, שעות פריקה, איש קשר באתר..."
                rows={2}
                className="w-full bg-[#111b21] border border-[#2a3942] rounded-lg p-2.5 text-xs text-[#e9edef] focus:outline-none focus:border-[#00ffaa] resize-none"
              />
            </div>

            {/* Save Profile Button */}
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full py-2.5 bg-[#00ffaa] hover:bg-[#00cc88] text-[#0a0b10] font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#00ffaa]/20"
              id="btn-save-customer-profile"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  שומר פרטי לקוח...
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-950" />
                  נשמר בהצלחה במערכת!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  עדכן פרופיל לקוח מורחב
                </>
              )}
            </button>
          </div>

          {/* Real-Time Sheet Order History Verification Section */}
          <div className="bg-[#202c33] rounded-xl p-4 border border-[#2a3942] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#e9edef] flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                אימות היסטוריה מול גליון 'לוג_הזמנות'
              </h3>
              <button
                onClick={() => fetchProfileAndHistory(cleanPhone)}
                disabled={isLoadingHistory}
                className="p-1 text-[#00ffaa] hover:bg-[#2a3942] rounded-md transition-colors"
                title="רענן אימות מול Sheets"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {aiSummary && (
              <div className="p-2.5 bg-[#111b21] rounded-lg border border-[#00ffaa]/20 text-xs text-[#00ffaa] flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>{aiSummary}</span>
              </div>
            )}

            {isLoadingHistory ? (
              <div className="py-6 text-center text-xs text-[#8696a0] flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#00ffaa]" />
                סורק נתוני הזמנות היסטוריות בגליון...
              </div>
            ) : sheetHistory.length === 0 ? (
              <p className="text-xs text-[#8696a0] py-2">לא נמצאו רשומות קודמות עבור מספר זה בגליון.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {sheetHistory.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-[#111b21] rounded-lg border border-[#2a3942] space-y-1 text-xs">
                    <div className="flex justify-between items-center text-[#e9edef] font-semibold">
                      <span>{item.orderNumber || `ORD-${idx + 1}`}</span>
                      <span className="text-[10px] text-[#00ffaa] bg-[#00ffaa]/10 px-1.5 py-0.5 rounded">
                        {item.status || 'מאושר'}
                      </span>
                    </div>
                    <p className="text-[#8696a0] line-clamp-1">📍 {item.address || item['כתובת אספקה'] || 'אתר פריקה'}</p>
                    <p className="text-[#8696a0] line-clamp-1">📦 {item.items || 'פריטי הובלה'}</p>
                    {item.truckDispatchTime && (
                      <p className="text-[10px] text-amber-400 flex items-center gap-1 mt-1">
                        <Truck className="w-3 h-3" />
                        זמן יציאת משאית: {item.truckDispatchTime}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
