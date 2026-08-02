import React, { useState } from 'react';
import { 
  UserPlus, 
  Folder, 
  CreditCard, 
  Phone, 
  MapPin, 
  Search, 
  FileText, 
  Trash2, 
  RefreshCw, 
  Package, 
  Navigation, 
  X, 
  CheckCircle,
  FolderOpen,
  Calendar
} from 'lucide-react';
import { useWhatsAppStore } from '../store/useWhatsAppStore';
import { CustomerRecord, OrderRecord } from '../types';

export const CustomersTab: React.FC = () => {
  const { 
    customers, 
    orders,
    addCustomer, 
    deleteCustomer, 
    syncLiveSheetData,
    isSendingApi 
  } = useWhatsAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingModalOpen, setIsAddingModalOpen] = useState(false);
  const [selectedFolderCustomer, setSelectedFolderCustomer] = useState<CustomerRecord | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState('₪150,000');
  const [comaxId, setComaxId] = useState('');
  const [notes, setNotes] = useState('');

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.comaxId && c.comaxId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addCustomer({
      name,
      phone: phone || '054-0000000',
      address: address || 'אתר חלוקה',
      creditLimit: creditLimit || '₪150,000',
      currentBalance: '₪0',
      comaxId: comaxId || `${Math.floor(500000 + Math.random() * 400000)}`,
      notes,
    });

    setName('');
    setPhone('');
    setAddress('');
    setCreditLimit('₪150,000');
    setComaxId('');
    setNotes('');
    setIsAddingModalOpen(false);
  };

  const handleOpenDrive = (customer: CustomerRecord) => {
    const targetUrl = customer.driveFolderUrl || `https://drive.google.com/drive/search?q=${encodeURIComponent(customer.name)}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  // Get retroactive orders belonging to a customer folder
  const getCustomerOrders = (customer: CustomerRecord): OrderRecord[] => {
    if (customer.orders && customer.orders.length > 0) {
      return customer.orders;
    }
    // Fallback match by name or comax ID
    return orders.filter(
      (o) =>
        o.customerName.toLowerCase().includes(customer.name.toLowerCase()) ||
        customer.name.toLowerCase().includes(o.customerName.toLowerCase())
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Action & Sync Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#202c33] p-4 rounded-xl border border-[#2a3942]">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 absolute right-3 top-3 text-[#8696a0]" />
          <input
            type="text"
            placeholder="חפש לפי שם לקוח, מספר לקוח (קומקס) או טלפון..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-10 py-2 bg-[#111b21] border border-[#2a3942] rounded-lg text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884]"
            id="input-search-customers"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={() => syncLiveSheetData()}
            disabled={isSendingApi}
            className="px-3.5 py-2 bg-[#111b21] hover:bg-[#182229] border border-[#00a884]/40 text-[#00a884] font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            title="רענן וסנכרן נתונים בזמן אמת מטאב לוג_הזמנות_מערכת"
            id="btn-sync-live-customers"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSendingApi ? 'animate-spin' : ''}`} />
            <span>{isSendingApi ? 'מסנכרן גליון...' : 'סנכרן מ-לוג_הזמנות_מערכת'}</span>
          </button>

          <button
            onClick={() => setIsAddingModalOpen(true)}
            className="px-4 py-2 bg-[#00a884] hover:bg-[#008f70] text-[#111b21] font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors shrink-0"
            id="btn-open-add-customer-modal"
          >
            <UserPlus className="w-4 h-4" />
            <span>יצירת תיק לקוח חדש</span>
          </button>
        </div>
      </div>

      {/* Header Info Banner */}
      <div className="bg-[#111b21] p-3.5 rounded-xl border border-[#2a3942] flex items-center justify-between text-xs text-[#8696a0]">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-[#00a884]" />
          <span>
            סה"כ תיקי לקוחות רשומים: <strong className="text-[#e9edef] font-mono">{customers.length}</strong> | 
            הזמנות משויכות רטרואקטיבית: <strong className="text-[#00a884] font-mono">{orders.length}</strong>
          </span>
        </div>
        <span className="hidden md:inline-block text-[11px] text-[#8696a0]">
          * כל תיק לקוח מכיל את שם הלקוח, מספר לקוח (קומקס), קישור דרייב והיסטוריית הזמנות.
        </span>
      </div>

      {/* Customers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCustomers.map((c) => {
          const custOrders = getCustomerOrders(c);
          const ordersCount = custOrders.length || c.activeOrdersCount || 0;

          return (
            <div
              key={c.id}
              className="bg-[#202c33] border border-[#2a3942] hover:border-[#00a884]/60 rounded-xl p-5 transition-all flex flex-col justify-between group shadow-lg"
              id={`customer-card-${c.id}`}
            >
              <div>
                {/* Top Title & Drive Action */}
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/40 flex items-center justify-center font-bold text-lg shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-[#e9edef] text-base group-hover:text-[#00a884] transition-colors">{c.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-[#8696a0] font-mono">
                        <span>מזהה: {c.id}</span>
                        <span>•</span>
                        <span className="text-[#00a884] font-bold">מס' לקוח: {c.comaxId || 'ללא'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenDrive(c)}
                      className="px-2.5 py-1.5 text-blue-400 hover:bg-blue-950/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-blue-900/60 transition-colors"
                      title="פתח תיק לקוח ב-Google Drive"
                      id={`btn-drive-${c.id}`}
                    >
                      <Folder className="w-3.5 h-3.5" />
                      <span>תיק דרייב</span>
                    </button>

                    <button
                      onClick={() => deleteCustomer(c.id)}
                      className="p-1.5 text-red-400 hover:bg-red-950/40 rounded-lg text-xs transition-colors"
                      title="מחק תיק לקוח"
                      id={`btn-delete-cust-${c.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2.5 bg-[#111b21] p-3 rounded-lg border border-[#2a3942] text-xs mb-3">
                  <div className="flex items-center gap-2 text-[#8696a0]">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <div>
                      <span className="block text-[10px]">מסגרת אשראי:</span>
                      <strong className="text-[#e9edef]">{c.creditLimit}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[#8696a0]">
                    <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <div>
                      <span className="block text-[10px]">יתרת סכום לקוח:</span>
                      <strong className="text-[#e9edef] font-mono">{c.currentBalance || '₪0'}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[#8696a0]">
                    <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <div>
                      <span className="block text-[10px]">טלפון ליצירת קשר:</span>
                      <span className="text-[#e9edef] dir-ltr inline-block">{c.phone}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[#8696a0]">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <div>
                      <span className="block text-[10px]">כתובת אספקה:</span>
                      <span className="text-[#e9edef] truncate block max-w-[130px]" title={c.address}>{c.address}</span>
                    </div>
                  </div>
                </div>

                {c.notes && (
                  <p className="text-[11px] text-[#8696a0] bg-[#182229] p-2 rounded border border-[#2a3942]">
                    📝 <strong className="text-[#e9edef]">הערות:</strong> {c.notes}
                  </p>
                )}
              </div>

              {/* Card Footer with Folder Orders Trigger */}
              <div className="mt-4 pt-3 border-t border-[#2a3942] flex justify-between items-center text-xs">
                <span className="text-[#8696a0]">פתיחת תיק: {c.createdAt}</span>

                <button
                  onClick={() => setSelectedFolderCustomer(c)}
                  className="px-3 py-1.5 bg-[#00a884]/20 hover:bg-[#00a884]/30 text-[#00a884] border border-[#00a884]/40 font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                  id={`btn-open-folder-${c.id}`}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>פתח תיק לקוח ({ordersCount} הזמנות)</span>
                </button>
              </div>
            </div>
          );
        })}

        {filteredCustomers.length === 0 && (
          <div className="col-span-full py-16 text-center text-[#8696a0] bg-[#202c33] rounded-xl border border-[#2a3942]">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-base font-semibold text-[#e9edef]">לא נמצאו תיקי לקוחות התואמים את הניטור.</p>
            <p className="text-xs mt-1">לחץ על "סנכרן מ-לוג_הזמנות_מערכת" לטעינת כל הלקוחות מ-Google Sheets.</p>
          </div>
        )}
      </div>

      {/* CUSTOMER FOLDER DRAWER / MODAL */}
      {selectedFolderCustomer && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-[#111b21] border border-[#2a3942] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#202c33] px-6 py-4 border-b border-[#2a3942] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/50 flex items-center justify-center font-bold text-xl">
                  {selectedFolderCustomer.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-[#e9edef]">{selectedFolderCustomer.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#00a884]/20 text-[#00a884] text-xs font-mono font-bold border border-[#00a884]/40">
                      מס' לקוח (קומקס): {selectedFolderCustomer.comaxId}
                    </span>
                  </div>
                  <span className="text-xs text-[#8696a0]">
                    מזהה תיק: {selectedFolderCustomer.id} | כתובת אספקה: {selectedFolderCustomer.address}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenDrive(selectedFolderCustomer)}
                  className="px-3 py-1.5 bg-blue-950 text-blue-400 hover:bg-blue-900 border border-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="פתח תיק לקוח בדרייב"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>תיק ב-Google Drive</span>
                </button>

                <button
                  onClick={() => setSelectedFolderCustomer(null)}
                  className="p-1.5 text-[#8696a0] hover:text-white rounded-lg hover:bg-[#2a3942] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body - Retroactive Orders List */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm dir-rtl">
              {/* Summary Metrics Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#202c33] p-4 rounded-xl border border-[#2a3942]">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-[#00a884]" />
                  <div>
                    <span className="block text-xs text-[#8696a0]">סה"כ הזמנות רשומות בתיק:</span>
                    <strong className="text-base text-[#e9edef] font-mono">
                      {getCustomerOrders(selectedFolderCustomer).length} הזמנות
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  <div>
                    <span className="block text-xs text-[#8696a0]">מסגרת אשראי מבוטחת:</span>
                    <strong className="text-base text-[#e9edef]">{selectedFolderCustomer.creditLimit}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-amber-400" />
                  <div>
                    <span className="block text-xs text-[#8696a0]">סכום כולל מתוך הגליון:</span>
                    <strong className="text-base text-[#e9edef] font-mono">
                      {selectedFolderCustomer.currentBalance || '₪0'}
                    </strong>
                  </div>
                </div>
              </div>

              <h4 className="font-bold text-[#e9edef] text-base flex items-center gap-2 pt-2 border-b border-[#2a3942] pb-2">
                <FolderOpen className="w-5 h-5 text-[#00a884]" />
                <span>הזמנות משוייכות רטרואקטיבית לתיק הלקוח ({selectedFolderCustomer.name})</span>
              </h4>

              {/* Retroactive Orders Cards */}
              <div className="space-y-4">
                {getCustomerOrders(selectedFolderCustomer).map((ord) => (
                  <div
                    key={ord.orderNumber}
                    className="bg-[#202c33] border border-[#2a3942] rounded-xl p-4 space-y-3"
                  >
                    {/* Order Top Bar */}
                    <div className="flex justify-between items-center border-b border-[#2a3942] pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#00a884] text-base">הזמנה #{ord.orderNumber}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-[#111b21] border border-[#2a3942] text-[#8696a0]">
                          מקור: {ord.origin === 'comax' ? '✨ קומקס' : '💬 ווטסאפ'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[#8696a0]">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{ord.timestamp ? new Date(ord.timestamp).toLocaleDateString('he-IL') : 'תקף'}</span>
                        <a
                          href={ord.wazeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-cyan-950 text-cyan-400 border border-cyan-800 rounded text-[11px] font-semibold flex items-center gap-1 hover:bg-cyan-900 transition-colors"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>Waze</span>
                        </a>
                      </div>
                    </div>

                    {/* Order Content Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="bg-[#111b21] p-3 rounded-lg border border-[#2a3942] space-y-1 text-[#8696a0]">
                        <p>🏭 <strong className="text-[#e9edef]">מחסן יוצא:</strong> {ord.warehouse}</p>
                        <p>📍 <strong className="text-[#e9edef]">כתובת אספקה:</strong> {ord.address}</p>
                        <p>👨‍✈️ <strong className="text-[#e9edef]">נהג/זרוע:</strong> {ord.driverName}</p>
                        <p>⏱️ <strong className="text-[#e9edef]">מסלול:</strong> {ord.distance}</p>
                      </div>

                      <div className="bg-[#111b21] p-3 rounded-lg border border-[#2a3942] space-y-1">
                        <span className="text-[#8696a0] font-semibold block border-b border-[#2a3942] pb-1">🛒 פירוט פריטים ומק"טים:</span>
                        <ul className="space-y-1 max-h-24 overflow-y-auto">
                          {ord.items.map((it, idx) => (
                            <li key={idx} className="flex justify-between items-center text-[#e9edef]">
                              <span>• {it.sku !== 'ללא מק"ט' && <span className="font-mono text-cyan-400 mr-1">[{it.sku}]</span>}{it.name}</span>
                              <strong className="font-mono text-[#00a884]">{it.quantity} יח'</strong>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {ord.formattedTemplate && (
                      <div className="bg-[#111b21] p-2.5 rounded border border-[#2a3942] text-xs text-[#8696a0]">
                        💡 <strong className="text-[#00a884]">מסקנות נועה AI / סטטוס:</strong> {ord.formattedTemplate}
                      </div>
                    )}
                  </div>
                ))}

                {getCustomerOrders(selectedFolderCustomer).length === 0 && (
                  <div className="py-8 text-center text-[#8696a0] bg-[#202c33] rounded-xl border border-[#2a3942]">
                    <Package className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    <p>טרם נרשמו הזמנות רטרואקטיביות לתיק לקוח זה.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-[#202c33] px-6 py-3 border-t border-[#2a3942] flex justify-end">
              <button
                onClick={() => setSelectedFolderCustomer(null)}
                className="px-5 py-2 bg-[#00a884] hover:bg-[#008f70] text-[#111b21] font-bold rounded-lg text-sm"
              >
                סגור תיק לקוח
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Customer */}
      {isAddingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#202c33] border border-[#2a3942] rounded-2xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold text-[#e9edef] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#00a884]" />
              <span>יצירת תיק לקוח חדש</span>
            </h3>

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs text-[#8696a0] mb-1">שם הלקוח / קבלן *</label>
                <input
                  type="text"
                  required
                  placeholder="למשל: יוסף בנייה בע״מ"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111b21] border border-[#2a3942] rounded-lg text-sm text-[#e9edef] focus:outline-none focus:border-[#00a884]"
                  id="input-cust-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#8696a0] mb-1">מספר טלפון</label>
                  <input
                    type="text"
                    placeholder="054-1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-[#111b21] border border-[#2a3942] rounded-lg text-sm text-[#e9edef] focus:outline-none focus:border-[#00a884]"
                    id="input-cust-phone"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#8696a0] mb-1">מסגרת אשראי (₪)</label>
                  <input
                    type="text"
                    placeholder="₪150,000"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    className="w-full px-3 py-2 bg-[#111b21] border border-[#2a3942] rounded-lg text-sm text-[#e9edef] focus:outline-none focus:border-[#00a884]"
                    id="input-cust-credit"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#8696a0] mb-1">מספר לקוח (קומקס / Comax ID)</label>
                  <input
                    type="text"
                    placeholder="519205"
                    value={comaxId}
                    onChange={(e) => setComaxId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#111b21] border border-[#2a3942] rounded-lg text-sm text-[#e9edef] focus:outline-none focus:border-[#00a884]"
                    id="input-cust-comax"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#8696a0] mb-1">כתובת ראשית</label>
                  <input
                    type="text"
                    placeholder="עיר, רחוב ומספר"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-[#111b21] border border-[#2a3942] rounded-lg text-sm text-[#e9edef] focus:outline-none focus:border-[#00a884]"
                    id="input-cust-address"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#8696a0] mb-1">הערות לוגיסטיות</label>
                <textarea
                  rows={2}
                  placeholder="לדוגמה: דורש פריקת מנוף קטן בלבד"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111b21] border border-[#2a3942] rounded-lg text-sm text-[#e9edef] focus:outline-none focus:border-[#00a884]"
                  id="input-cust-notes"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingModalOpen(false)}
                  className="px-4 py-2 bg-[#2a3942] hover:bg-[#3b4a54] text-[#e9edef] rounded-lg text-sm"
                  id="btn-cancel-cust"
                >
                  ביטול
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00a884] hover:bg-[#008f70] text-[#111b21] font-bold rounded-lg text-sm"
                  id="btn-submit-cust"
                >
                  שמור תיק לקוח
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
