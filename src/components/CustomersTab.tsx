import React, { useState } from 'react';
import { UserPlus, Folder, CreditCard, Phone, MapPin, Search, FileText, CheckCircle, Trash2, Edit, ExternalLink } from 'lucide-react';
import { useWhatsAppStore } from '../store/useWhatsAppStore';
import { CustomerRecord } from '../types';

export const CustomersTab: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useWhatsAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingModalOpen, setIsAddingModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState('₪100,000');
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
      creditLimit: creditLimit || '₪100,000',
      currentBalance: '₪0',
      comaxId: comaxId || `CMX-${Math.floor(1000 + Math.random() * 9000)}`,
      notes,
    });

    setName('');
    setPhone('');
    setAddress('');
    setCreditLimit('₪100,000');
    setComaxId('');
    setNotes('');
    setIsAddingModalOpen(false);
  };

  const handleOpenDrive = (driveUrl?: string) => {
    const targetUrl = driveUrl || 'https://drive.google.com';
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#202c33] p-4 rounded-xl border border-[#2a3942]">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 absolute right-3 top-3 text-[#8696a0]" />
          <input
            type="text"
            placeholder="חפש לפי שם לקוח, טלפון או קוד קומקס..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-10 py-2 bg-[#111b21] border border-[#2a3942] rounded-lg text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884]"
            id="input-search-customers"
          />
        </div>

        <button
          onClick={() => setIsAddingModalOpen(true)}
          className="px-4 py-2 bg-[#00a884] hover:bg-[#008f70] text-[#111b21] font-semibold text-sm rounded-lg flex items-center gap-2 transition-colors shrink-0"
          id="btn-open-add-customer-modal"
        >
          <UserPlus className="w-4 h-4" />
          <span>יצירת תיק לקוח חדש (תיק_לקוח_וחשבונות)</span>
        </button>
      </div>

      {/* Customers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCustomers.map((c) => (
          <div
            key={c.id}
            className="bg-[#202c33] border border-[#2a3942] hover:border-[#00a884]/40 rounded-xl p-5 transition-all flex flex-col justify-between"
            id={`customer-card-${c.id}`}
          >
            <div>
              <div className="flex justify-between items-start gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#00a884]/20 text-[#00a884] flex items-center justify-center font-bold text-lg">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-[#e9edef] text-base">{c.name}</h4>
                    <span className="text-xs text-[#8696a0] font-mono">מזהה: {c.id} • קומקס: {c.comaxId || 'אין'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenDrive(c.driveFolderUrl)}
                    className="p-2 text-blue-400 hover:bg-blue-950/40 rounded-lg text-xs font-semibold flex items-center gap-1 border border-blue-900 transition-colors"
                    title="פתח תיק לקוח בדרייב"
                    id={`btn-drive-${c.id}`}
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>דרייב</span>
                  </button>

                  <button
                    onClick={() => deleteCustomer(c.id)}
                    className="p-2 text-red-400 hover:bg-red-950/40 rounded-lg text-xs transition-colors"
                    title="מחק לקוח"
                    id={`btn-delete-cust-${c.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-[#111b21] p-3 rounded-lg border border-[#2a3942] text-xs mb-3">
                <div className="flex items-center gap-2 text-[#8696a0]">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="block text-[11px]">מסגרת אשראי:</span>
                    <strong className="text-[#e9edef]">{c.creditLimit}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[#8696a0]">
                  <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <div>
                    <span className="block text-[11px]">יתרה חובה נוכחית:</span>
                    <strong className="text-[#e9edef]">{c.currentBalance}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[#8696a0]">
                  <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <div>
                    <span className="block text-[11px]">טלפון ליצירת קשר:</span>
                    <span className="text-[#e9edef] dir-ltr inline-block">{c.phone}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[#8696a0]">
                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <div>
                    <span className="block text-[11px]">כתובת ראשית:</span>
                    <span className="text-[#e9edef] truncate block max-w-[120px]">{c.address}</span>
                  </div>
                </div>
              </div>

              {c.notes && (
                <p className="text-xs text-[#8696a0] bg-[#182229] p-2 rounded border border-[#2a3942]">
                  📝 <strong className="text-[#e9edef]">הערות:</strong> {c.notes}
                </p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[#2a3942] flex justify-between items-center text-xs text-[#8696a0]">
              <span>תאריך פתיחה: {c.createdAt}</span>
              <span className="px-2 py-0.5 rounded bg-[#00a884]/20 text-[#00a884] font-semibold">
                {c.activeOrdersCount || 0} הזמנות פעילות
              </span>
            </div>
          </div>
        ))}

        {filteredCustomers.length === 0 && (
          <div className="col-span-full py-12 text-center text-[#8696a0] bg-[#202c33] rounded-xl border border-[#2a3942]">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>לא נמצאו תיקי לקוחות התואמים את הניטור.</p>
          </div>
        )}
      </div>

      {/* Modal Add Customer */}
      {isAddingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#202c33] border border-[#2a3942] rounded-2xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold text-[#e9edef] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#00a884]" />
              <span>יצירת תיק לקוח חדש בתיק_לקוח_וחשבונות</span>
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
                  <label className="block text-xs text-[#8696a0] mb-1">קוד לקוח בקומקס (Comax ID)</label>
                  <input
                    type="text"
                    placeholder="CMX-9900"
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
