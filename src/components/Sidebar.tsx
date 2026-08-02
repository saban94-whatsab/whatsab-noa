import React, { useState } from 'react';
import { Search, MessageSquarePlus, CircleDashed, Users, CheckCheck, Pin, Bot, UserCheck, X } from 'lucide-react';
import { useWhatsAppStore } from '../store/useWhatsAppStore';
import { HeaderMenuDropdown } from './HeaderMenuDropdown';

export const Sidebar: React.FC = () => {
  const {
    contacts,
    activeChatId,
    setActiveChatId,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    createNewContact,
    setIsAdminOpen,
  } = useWhatsAppStore();

  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  // Filter contacts
  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeFilter === 'unread') return c.unreadCount > 0;
    if (activeFilter === 'favorites') return c.isPinned;
    if (activeFilter === 'groups') return c.tags?.includes('קבוצה');

    return true;
  });

  const handleCreateContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;
    const newId = createNewContact(newContactName.trim(), newContactPhone.trim());
    setActiveChatId(newId);
    setNewContactName('');
    setNewContactPhone('');
    setIsNewContactModalOpen(false);
  };

  return (
    <aside className="w-full md:w-[350px] lg:w-[380px] h-full bg-[#111b21] border-l border-white/10 flex flex-col shrink-0 select-none">
      {/* Sidebar Header */}
      <header className="h-[60px] bg-[#202c33] px-4 flex items-center justify-between shrink-0 border-b border-white/5">
        {/* User Profile Avatar & Admin Trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAdminOpen(true)}
            className="relative group focus:outline-none flex items-center gap-2"
            title="לחץ לפתיחת פאנל ניהול (Ctrl+Shift+A)"
            id="btn-profile-avatar-admin"
          >
            <div className="w-10 h-10 rounded-full bg-[#8696a0] flex items-center justify-center overflow-hidden shrink-0">
              <img
                src="https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?w=150&auto=format&fit=crop&q=80"
                alt="סידור ח. סבן"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <span className="text-xs font-bold bg-[#00a884]/20 text-[#00a884] px-2 py-0.5 rounded uppercase tracking-wider">
              מנהל
            </span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-4 text-[#8696a0]">
          <button
            onClick={() => setIsAdminOpen(true)}
            className="p-1.5 hover:text-[#e9edef] rounded-full hover:bg-[#2a3942] transition-colors"
            title="סטטוס מערכת ופאנל ניהול"
            id="btn-sidebar-admin-quick"
          >
            <CircleDashed className="w-5 h-5 text-emerald-400" />
          </button>

          <button
            onClick={() => setIsNewContactModalOpen(true)}
            className="p-1.5 hover:text-[#e9edef] rounded-full hover:bg-[#2a3942] transition-colors"
            title="צ'אט חדש"
            id="btn-sidebar-new-chat"
          >
            <MessageSquarePlus className="w-5 h-5" />
          </button>

          <HeaderMenuDropdown onOpenNewContact={() => setIsNewContactModalOpen(true)} />
        </div>
      </header>

      {/* Search Input Bar */}
      <div className="px-3 py-2 bg-[#111b21]">
        <div className="relative bg-[#202c33] rounded-lg flex items-center px-3 py-1.5 border border-transparent focus-within:border-[#00a884]/60 transition-colors">
          <Search className="w-4 h-4 text-[#8696a0] ml-2 shrink-0 stroke-[2.5]" />
          <input
            type="text"
            placeholder="חיפוש או התחלת צ'אט חדש"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-[#8696a0] text-[#e9edef] h-6"
            id="input-sidebar-search"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[#8696a0] hover:text-[#e9edef] p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-3 pb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-white/5">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            activeFilter === 'all'
              ? 'bg-[#005c4b] text-[#e9edef]'
              : 'bg-[#202c33] text-[#8696a0] hover:bg-[#2a3942] hover:text-[#e9edef]'
          }`}
          id="filter-tab-all"
        >
          הכל
        </button>
        <button
          onClick={() => setActiveFilter('unread')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            activeFilter === 'unread'
              ? 'bg-[#005c4b] text-[#e9edef]'
              : 'bg-[#202c33] text-[#8696a0] hover:bg-[#2a3942] hover:text-[#e9edef]'
          }`}
          id="filter-tab-unread"
        >
          שלא נקראו
        </button>
        <button
          onClick={() => setActiveFilter('favorites')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            activeFilter === 'favorites'
              ? 'bg-[#005c4b] text-[#e9edef]'
              : 'bg-[#202c33] text-[#8696a0] hover:bg-[#2a3942] hover:text-[#e9edef]'
          }`}
          id="filter-tab-pinned"
        >
          נעוצים
        </button>
        <button
          onClick={() => setActiveFilter('groups')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            activeFilter === 'groups'
              ? 'bg-[#005c4b] text-[#e9edef]'
              : 'bg-[#202c33] text-[#8696a0] hover:bg-[#2a3942] hover:text-[#e9edef]'
          }`}
          id="filter-tab-groups"
        >
          קבוצות
        </button>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto border-t border-white/5">
        {filteredContacts.length === 0 ? (
          <div className="p-8 text-center text-[#8696a0] text-sm flex flex-col items-center justify-center h-48 gap-2">
            <Users className="w-8 h-8 opacity-40 text-[#8696a0]" />
            <p>לא נמצאו שיחות מתאימות</p>
          </div>
        ) : (
          filteredContacts.map((contact) => {
            const isActive = contact.id === activeChatId;

            return (
              <div
                key={contact.id}
                onClick={() => setActiveChatId(contact.id)}
                className={`flex items-center px-3 py-3 border-b border-white/5 cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-[#2a3942]'
                    : 'hover:bg-[#202c33]'
                }`}
                id={`chat-item-${contact.id}`}
              >
                {/* Avatar */}
                <div className="relative shrink-0 ml-3">
                  <img
                    src={contact.avatar}
                    alt={contact.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  {contact.onlineStatus === 'online' && (
                    <span className="absolute bottom-0 left-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-[#111b21]" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 border-b border-transparent pb-0.5">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-medium text-sm text-[#e9edef] truncate">
                        {contact.name}
                      </span>
                      {contact.isAIEnabled ? (
                        <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 rounded flex items-center gap-0.5 shrink-0">
                          <Bot className="w-2.5 h-2.5" /> AI
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-800 px-1.5 rounded flex items-center gap-0.5 shrink-0">
                          <UserCheck className="w-2.5 h-2.5" /> אנושי
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#8696a0] shrink-0 font-mono">
                      {contact.lastTimestamp}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs text-[#8696a0]">
                    <div className="flex items-center gap-1 overflow-hidden whitespace-nowrap text-ellipsis max-w-[200px]">
                      {contact.onlineStatus === 'typing' ? (
                        <span className="text-[#00a884] font-medium animate-pulse">
                          מקליד/ה...
                        </span>
                      ) : (
                        <>
                          <CheckCheck className="w-4 h-4 text-[#53bdeb] shrink-0 stroke-[2]" />
                          <span className="truncate">{contact.lastMessage || '...' }</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {contact.isPinned && (
                        <Pin className="w-3.5 h-3.5 text-[#8696a0] rotate-45" />
                      )}
                      {contact.unreadCount > 0 && (
                        <span className="bg-[#00a884] text-[#111b21] rounded-full w-5 h-5 flex items-center justify-center font-bold text-[10px]">
                          {contact.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Contact Dialog Modal */}
      {isNewContactModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#222d34] border border-[#2a3942] rounded-xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#e9edef] flex items-center gap-2">
                <MessageSquarePlus className="w-5 h-5 text-[#00a884]" />
                התחלת שיחת וואטסאפ חדשה
              </h3>
              <button
                onClick={() => setIsNewContactModalOpen(false)}
                className="text-[#8696a0] hover:text-[#e9edef]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContactSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8696a0] mb-1">
                  שם הלקוח / קבלן
                </label>
                <input
                  type="text"
                  required
                  placeholder="לדוגמה: אברהם קבלן תשתיות"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="w-full bg-[#111b21] border border-[#2a3942] rounded-lg p-2.5 text-sm text-[#e9edef] focus:border-[#00a884] focus:outline-none"
                  id="input-new-contact-name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8696a0] mb-1">
                  מספר טלפון (וואטסאפ)
                </label>
                <input
                  type="text"
                  required
                  placeholder="050-1234567"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  className="w-full bg-[#111b21] border border-[#2a3942] rounded-lg p-2.5 text-sm text-[#e9edef] focus:border-[#00a884] focus:outline-none"
                  id="input-new-contact-phone"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewContactModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-[#8696a0] hover:bg-[#111b21]"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-sm bg-[#00a884] text-[#111b21] font-bold hover:bg-[#029676] transition-colors"
                  id="btn-submit-new-contact"
                >
                  התחל צ'אט
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
