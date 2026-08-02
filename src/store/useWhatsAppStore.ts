import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Contact, Message, MessageStatus, SystemConfig, WebhookLog, ProductItem } from '../types';
import { INITIAL_CONFIG, INITIAL_CONTACTS, INITIAL_MESSAGES } from '../data/initialData';
import { playIncomingSound, playOutgoingSound } from '../utils/audio';

interface WhatsAppState {
  contacts: Contact[];
  messages: Record<string, Message[]>;
  activeChatId: string;
  config: SystemConfig;
  webhookLogs: WebhookLog[];
  isAdminOpen: boolean;
  adminTab: 'metrics' | 'crm' | 'prompt' | 'logs';
  searchQuery: string;
  activeFilter: 'all' | 'unread' | 'favorites' | 'groups';
  isSoundMuted: boolean;
  isSendingApi: boolean;

  // Actions
  setActiveChatId: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setActiveFilter: (filter: 'all' | 'unread' | 'favorites' | 'groups') => void;
  setIsAdminOpen: (open: boolean) => void;
  setAdminTab: (tab: 'metrics' | 'crm' | 'prompt' | 'logs') => void;
  toggleSoundMuted: () => void;

  // Messages & Chat logic
  sendMessage: (chatId: string, text: string, type?: Message['type'], mediaUrl?: string, fileName?: string) => Promise<void>;
  updateMessageStatus: (chatId: string, messageId: string, status: MessageStatus) => void;
  receiveIncomingMessage: (phone: string, text: string, senderName?: string) => Promise<void>;
  toggleContactAI: (chatId: string) => void;
  toggleGlobalAI: () => void;
  overrideChatAI: (chatId: string, customText: string) => Promise<void>;
  
  // Config & Products
  updateConfig: (newConfig: Partial<SystemConfig>) => void;
  addProduct: (product: Omit<ProductItem, 'id'>) => void;
  removeProduct: (id: string) => void;
  updateProduct: (id: string, product: Partial<ProductItem>) => void;

  // Logs
  addWebhookLog: (log: WebhookLog) => void;
  clearWebhookLogs: () => void;
  
  // Helpers
  createNewContact: (name: string, phone: string) => string;
}

export const useWhatsAppStore = create<WhatsAppState>()(
  persist(
    (set, get) => ({
      contacts: INITIAL_CONTACTS,
      messages: INITIAL_MESSAGES,
      activeChatId: 'chat-noa-ai',
      config: INITIAL_CONFIG,
      webhookLogs: [
        {
          id: 'log-1',
          timestamp: new Date().toLocaleTimeString('he-IL'),
          senderPhone: '0549876543',
          senderName: 'משה כהן',
          messageText: 'צריך דחוף 4 בות חול וסומסום לאתר ברמת גן קומה 3 מנוף',
          autoReply: 'אהלן משה! 🔨 קיבלנו את הבקשה ל-4 באלות חול וסומסום לקומה 3 ברמת גן. מנוף זרוע בתיאום.',
          noaResponse: 'אהלן משה! 🔨 קיבלנו את הבקשה ל-4 באלות חול וסומסום לקומה 3 ברמת גן.',
          sentToWhatsapp: true,
          status: 'success',
          durationMs: 420,
        },
      ],
      isAdminOpen: false,
      adminTab: 'metrics',
      searchQuery: '',
      activeFilter: 'all',
      isSoundMuted: false,
      isSendingApi: false,

      setActiveChatId: (id: string) => {
        set((state) => ({
          activeChatId: id,
          contacts: state.contacts.map((c) =>
            c.id === id ? { ...c, unreadCount: 0 } : c
          ),
        }));
      },

      setSearchQuery: (query: string) => set({ searchQuery: query }),
      setActiveFilter: (filter) => set({ activeFilter: filter }),
      setIsAdminOpen: (open: boolean) => set({ isAdminOpen: open }),
      setAdminTab: (tab) => set({ adminTab: tab }),
      toggleSoundMuted: () => set((state) => ({ isSoundMuted: !state.isSoundMuted })),

      updateMessageStatus: (chatId, messageId, status) => {
        set((state) => ({
          messages: {
            ...state.messages,
            [chatId]: (state.messages[chatId] || []).map((m) =>
              m.id === messageId ? { ...m, status } : m
            ),
          },
        }));
      },

      sendMessage: async (chatId, text, type = 'text', mediaUrl, fileName) => {
        const { isSoundMuted, messages, contacts, config } = get();
        if (!text.trim() && !mediaUrl) return;

        const timeStr = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        const msgId = `msg-${Date.now()}`;
        const newMessage: Message = {
          id: msgId,
          chatId,
          sender: 'user',
          text,
          timestamp: timeStr,
          status: 'sent',
          type,
          mediaUrl,
          fileName,
        };

        // Play sound
        if (!isSoundMuted) {
          playOutgoingSound();
        }

        // Update local state immediately
        const chatMsgs = messages[chatId] || [];
        set({
          messages: {
            ...messages,
            [chatId]: [...chatMsgs, newMessage],
          },
          contacts: contacts.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  lastMessage: text || (type === 'audio' ? '🎵 הודעה קולית' : '📎 קובץ מצורף'),
                  lastTimestamp: timeStr,
                }
              : c
          ),
        });

        // Simulate WhatsApp delivery progression: sent -> delivered -> read
        setTimeout(() => {
          get().updateMessageStatus(chatId, msgId, 'delivered');
        }, 400);

        setTimeout(() => {
          get().updateMessageStatus(chatId, msgId, 'read');
        }, 1300);

        // Check if contact has AI enabled and AI is globally enabled
        const targetContact = contacts.find((c) => c.id === chatId);
        if (targetContact && targetContact.isAIEnabled && config.isAIGloballyEnabled && type === 'text') {
          set({ isSendingApi: true });

          // Simulate Noa AI typing indicator
          set({
            contacts: get().contacts.map((c) =>
              c.id === chatId ? { ...c, onlineStatus: 'typing' } : c
            ),
          });

          const startTime = Date.now();
          try {
            // Call server backend endpoint for Gemini response
            const res = await fetch('/api/chat/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chatId,
                messageText: text,
                senderPhone: targetContact.phone,
                senderName: targetContact.name,
                systemPrompt: config.systemPrompt,
              }),
            });

            let responseText = '';
            if (res.ok) {
              const data = await res.json();
              responseText = data.noaResponse || data.autoReply || 'קיבלנו את הודעתך, נציג יחזור אלייך בהקדם!';
            } else {
              responseText = 'תודה שפנית לח. סבן חומרי בניין! 🏗️ קיבלתי את הודעתך והיא הועברה לצוות הטיפול.';
            }

            const durationMs = Date.now() - startTime;
            const replyTimeStr = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
            
            const aiMessage: Message = {
              id: `msg-ai-${Date.now()}`,
              chatId,
              sender: 'ai',
              senderName: 'נועה AI',
              text: responseText,
              timestamp: replyTimeStr,
              status: 'read',
            };

            // Play sound for incoming AI response
            if (!get().isSoundMuted) {
              playIncomingSound();
            }

            // Update messages & contact status
            const updatedMsgs = get().messages[chatId] || [];
            set({
              messages: {
                ...get().messages,
                [chatId]: [...updatedMsgs, aiMessage],
              },
              contacts: get().contacts.map((c) =>
                c.id === chatId
                  ? {
                      ...c,
                      onlineStatus: 'online',
                      lastMessage: responseText,
                      lastTimestamp: replyTimeStr,
                    }
                  : c
              ),
              webhookLogs: [
                {
                  id: `log-${Date.now()}`,
                  timestamp: replyTimeStr,
                  senderPhone: targetContact.phone,
                  senderName: targetContact.name,
                  messageText: text,
                  autoReply: responseText,
                  noaResponse: responseText,
                  sentToWhatsapp: true,
                  status: 'success',
                  durationMs,
                },
                ...get().webhookLogs,
              ],
            });
          } catch (err) {
            console.error('Error getting AI response:', err);
            // Fallback response
            const fallbackText = 'שלום! קיבלנו את הפנייה שלך בח. סבן. הצוות יחזור אליך בהקדם 👍';
            const aiMessage: Message = {
              id: `msg-ai-fallback-${Date.now()}`,
              chatId,
              sender: 'ai',
              senderName: 'נועה AI',
              text: fallbackText,
              timestamp: timeStr,
              status: 'read',
            };

            const updatedMsgs = get().messages[chatId] || [];
            set({
              messages: {
                ...get().messages,
                [chatId]: [...updatedMsgs, aiMessage],
              },
              contacts: get().contacts.map((c) =>
                c.id === chatId ? { ...c, onlineStatus: 'online', lastMessage: fallbackText } : c
              ),
            });
          } finally {
            set({ isSendingApi: false });
          }
        }
      },

      receiveIncomingMessage: async (phone, text, senderName = 'לקוח וואטסאפ') => {
        const { contacts, messages, activeChatId, isSoundMuted, config } = get();
        let targetContact = contacts.find((c) => c.phone === phone || c.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''));
        
        let chatId = targetContact?.id;

        if (!targetContact) {
          // Create new contact
          chatId = `chat-${Date.now()}`;
          targetContact = {
            id: chatId,
            phone,
            name: senderName,
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
            unreadCount: 1,
            lastMessage: text,
            lastTimestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
            onlineStatus: 'online',
            isAIEnabled: true,
            tags: ['וואטסאפ נכנס'],
          };
          set({ contacts: [targetContact, ...contacts] });
        }

        const timeStr = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        const incomingMsg: Message = {
          id: `msg-inc-${Date.now()}`,
          chatId: chatId!,
          sender: 'contact',
          senderName: targetContact.name,
          text,
          timestamp: timeStr,
          status: 'read',
        };

        if (!isSoundMuted) {
          playIncomingSound();
        }

        const chatMsgs = messages[chatId!] || [];
        set({
          messages: {
            ...messages,
            [chatId!]: [...chatMsgs, incomingMsg],
          },
          contacts: get().contacts.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  unreadCount: activeChatId === chatId ? 0 : c.unreadCount + 1,
                  lastMessage: text,
                  lastTimestamp: timeStr,
                }
              : c
          ),
        });

        // Trigger AI auto-reply if enabled
        if (targetContact.isAIEnabled && config.isAIGloballyEnabled) {
          set({
            contacts: get().contacts.map((c) =>
              c.id === chatId ? { ...c, onlineStatus: 'typing' } : c
            ),
          });

          const startTime = Date.now();
          try {
            const res = await fetch('/api/webhook', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                senderPhone: phone,
                messageText: text,
                senderName: targetContact.name,
              }),
            });

            if (res.ok) {
              const data = await res.json();
              const autoReply = data.autoReply || data.noaResponse || 'שלום! הודעתך התקבלה בח. סבן.';
              const durationMs = Date.now() - startTime;

              const aiReplyMsg: Message = {
                id: `msg-ai-webhook-${Date.now()}`,
                chatId: chatId!,
                sender: 'ai',
                senderName: 'נועה AI',
                text: autoReply,
                timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
                status: 'read',
              };

              const currentMsgs = get().messages[chatId!] || [];
              set({
                messages: {
                  ...get().messages,
                  [chatId!]: [...currentMsgs, aiReplyMsg],
                },
                contacts: get().contacts.map((c) =>
                  c.id === chatId ? { ...c, onlineStatus: 'online', lastMessage: autoReply } : c
                ),
                webhookLogs: [
                  {
                    id: `log-${Date.now()}`,
                    timestamp: new Date().toLocaleTimeString('he-IL'),
                    senderPhone: phone,
                    senderName: targetContact.name,
                    messageText: text,
                    autoReply,
                    noaResponse: autoReply,
                    sentToWhatsapp: true,
                    status: 'success',
                    durationMs,
                  },
                  ...get().webhookLogs,
                ],
              });
            }
          } catch (err) {
            console.error('Error handling webhook reply:', err);
          }
        }
      },

      toggleContactAI: (chatId: string) => {
        set((state) => ({
          contacts: state.contacts.map((c) =>
            c.id === chatId ? { ...c, isAIEnabled: !c.isAIEnabled } : c
          ),
        }));
      },

      toggleGlobalAI: () => {
        set((state) => ({
          config: {
            ...state.config,
            isAIGloballyEnabled: !state.config.isAIGloballyEnabled,
          },
        }));
      },

      overrideChatAI: async (chatId: string, customText: string) => {
        const { contacts, messages, isSoundMuted } = get();
        const contact = contacts.find((c) => c.id === chatId);
        if (!contact) return;

        const timeStr = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        const overrideMsg: Message = {
          id: `msg-override-${Date.now()}`,
          chatId,
          sender: 'system',
          senderName: 'מענה אנושי (נציג)',
          text: customText,
          timestamp: timeStr,
          status: 'read',
        };

        if (!isSoundMuted) {
          playOutgoingSound();
        }

        const chatMsgs = messages[chatId] || [];
        set({
          messages: {
            ...messages,
            [chatId]: [...chatMsgs, overrideMsg],
          },
          contacts: contacts.map((c) =>
            c.id === chatId ? { ...c, lastMessage: `[נציג אנושי]: ${customText}`, lastTimestamp: timeStr } : c
          ),
        });
      },

      updateConfig: (newConfig) => {
        set((state) => ({
          config: { ...state.config, ...newConfig },
        }));
      },

      addProduct: (product) => {
        const id = `prod-${Date.now()}`;
        set((state) => ({
          config: {
            ...state.config,
            products: [...state.config.products, { ...product, id }],
          },
        }));
      },

      removeProduct: (id) => {
        set((state) => ({
          config: {
            ...state.config,
            products: state.config.products.filter((p) => p.id !== id),
          },
        }));
      },

      updateProduct: (id, product) => {
        set((state) => ({
          config: {
            ...state.config,
            products: state.config.products.map((p) => (p.id === id ? { ...p, ...product } : p)),
          },
        }));
      },

      addWebhookLog: (log) => {
        set((state) => ({
          webhookLogs: [log, ...state.webhookLogs],
        }));
      },

      clearWebhookLogs: () => set({ webhookLogs: [] }),

      createNewContact: (name: string, phone: string) => {
        const id = `chat-custom-${Date.now()}`;
        const newContact: Contact = {
          id,
          phone,
          name,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`,
          unreadCount: 0,
          lastMessage: 'צ\'אט חדש נוצר',
          lastTimestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
          onlineStatus: 'online',
          isAIEnabled: true,
          tags: ['חדש'],
        };
        set((state) => ({
          contacts: [newContact, ...state.contacts],
          activeChatId: id,
          messages: {
            ...state.messages,
            [id]: [
              {
                id: `msg-init-${Date.now()}`,
                chatId: id,
                sender: 'ai',
                senderName: 'נועה AI',
                text: `שלום ${name}! 👋 במה אוכל לעזור לך מחומרי הבניין של ח. סבן?`,
                timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
                status: 'read',
              },
            ],
          },
        }));
        return id;
      },
    }),
    {
      name: 'saban-whatsapp-web-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        contacts: state.contacts,
        messages: state.messages,
        config: state.config,
        webhookLogs: state.webhookLogs,
        isSoundMuted: state.isSoundMuted,
      }),
    }
  )
);
