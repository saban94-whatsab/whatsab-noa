import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Contact, Message, MessageStatus, SystemConfig, WebhookLog, ProductItem, CustomerRecord, LogisticsDictionaryItem, OrderRecord, LogisticsDiscrepancy, GROUP_JIDS, OrderStatus } from '../types';
import { 
  INITIAL_CONFIG, 
  INITIAL_CONTACTS, 
  INITIAL_MESSAGES, 
  INITIAL_CUSTOMERS, 
  INITIAL_LOGISTICS_DICTIONARY, 
  INITIAL_ORDERS, 
  INITIAL_DISCREPANCIES,
  fetchLiveOrderLogAndCustomers,
  fetchLiveLogisticsDictionary,
  mapDictionaryToProducts
} from '../data/initialData';
import { playIncomingSound, playOutgoingSound, triggerBrowserNotification } from '../utils/audio';
import { syncOrderToGoogleSheets } from '../utils/googleSheetsSync';
import { getSavedStatuses, saveOrderStatus, sendStatusUpdateToWhatsApp } from '../utils/orderStatusService';


export function formatWhatsAppOutboundTemplate(order: OrderRecord): string {
  const originHeader = order.origin === 'comax'
    ? '✨ הזמנה חדשה עלתה לקומקס ✨'
    : '💬 הזמנה חדשה מקבוצת ווטסאפ 💬';

  const itemsFormatted = order.items
    .map((item) => `- ${item.sku} | ${item.name} x ${item.quantity} ${item.unit}`)
    .join('\n');

  return `📦 *${order.orderNumber}* - *${order.customerName}*

${originHeader}

👤 *שם לקוח:* ${order.customerName}
🏢 *מחסן יוצא:* ${order.warehouse}
📍 *כתובת אספקה:* ${order.address}
🧾 *מספר הזמנה:* ${order.orderNumber}

👋 *הנה לך חישוב צפי הגעה והוראות ניווט עבור ${order.driverName}:*
🚚 *מרחק נסיעה ממחסן החרש:* ${order.distance}
⏱️ *צפי זמן הגעה מוערך:* ${order.duration}
🧭 *ניווט Waze מקוצר:* ${order.wazeUrl}

🛒 *רשימת מוצרים:*
${itemsFormatted}

🛡️ *אימות פקדונות:*
- *בלות:* ${order.blowStatus}
- *משטחים:* ${order.palletStatus}
- *סטטוס:* *${order.status}*

sent via JONI`;
}

interface WhatsAppState {
  contacts: Contact[];
  messages: Record<string, Message[]>;
  activeChatId: string;
  config: SystemConfig;
  webhookLogs: WebhookLog[];
  customers: CustomerRecord[];
  logisticsDictionary: LogisticsDictionaryItem[];
  orders: OrderRecord[];
  discrepancies: LogisticsDiscrepancy[];
  isAdminOpen: boolean;
  isAdminAuthenticated: boolean;
  isPasscodeModalOpen: boolean;
  adminTab: 'metrics' | 'analytics' | 'crm' | 'customers' | 'orders' | 'discrepancies' | 'dictionary' | 'prompt' | 'logs';
  searchQuery: string;
  activeFilter: 'all' | 'unread' | 'favorites' | 'groups';
  isSoundMuted: boolean;
  isSendingApi: boolean;
  activeNewOrderToast: OrderRecord | null;

  // Actions
  setActiveChatId: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setActiveFilter: (filter: 'all' | 'unread' | 'favorites' | 'groups') => void;
  setIsAdminOpen: (open: boolean) => void;
  setIsPasscodeModalOpen: (open: boolean) => void;
  setIsAdminAuthenticated: (auth: boolean) => void;
  requestAdminAccess: () => void;
  setAdminTab: (tab: 'metrics' | 'analytics' | 'crm' | 'customers' | 'orders' | 'discrepancies' | 'dictionary' | 'prompt' | 'logs') => void;
  toggleSoundMuted: () => void;
  dismissNewOrderToast: () => void;
  simulateIncomingOrder: () => void;

  // Messages & Chat logic
  sendMessage: (chatId: string, text: string, type?: Message['type'], mediaUrl?: string, fileName?: string) => Promise<void>;
  updateMessageStatus: (chatId: string, messageId: string, status: MessageStatus) => void;
  receiveIncomingMessage: (phone: string, text: string, senderName?: string) => Promise<void>;
  toggleContactAI: (chatId: string) => void;
  toggleGlobalAI: () => void;
  overrideChatAI: (chatId: string, customText: string) => Promise<void>;
  
  // Customer & Order & Discrepancy Actions
  addCustomer: (customer: Omit<CustomerRecord, 'id' | 'createdAt'>) => void;
  updateCustomer: (id: string, customer: Partial<CustomerRecord>) => void;
  deleteCustomer: (id: string) => void;
  createOrder: (order: Partial<OrderRecord>) => OrderRecord;
  updateOrderStatus: (orderNumber: string, status: OrderStatus, notifyWhatsApp?: boolean) => Promise<boolean>;
  resolveDiscrepancy: (id: string, notes?: string) => void;
  processGroupOrderMessage: (senderName: string, text: string, groupJid?: string, comaxPdfQtyMap?: Record<string, number>) => Promise<OrderRecord>;

  // Config & Products
  updateConfig: (newConfig: Partial<SystemConfig>) => void;
  addProduct: (product: Omit<ProductItem, 'id'>) => void;
  removeProduct: (id: string) => void;
  updateProduct: (id: string, product: Partial<ProductItem>) => void;

  // Logs & Sync
  syncLiveSheetData: () => Promise<void>;
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
      customers: INITIAL_CUSTOMERS,
      logisticsDictionary: INITIAL_LOGISTICS_DICTIONARY,
      orders: INITIAL_ORDERS,
      discrepancies: INITIAL_DISCREPANCIES,
      webhookLogs: [],
      isAdminOpen: false,
      isAdminAuthenticated: false,
      isPasscodeModalOpen: false,
      adminTab: 'metrics',
      searchQuery: '',
      activeFilter: 'all',
      isSoundMuted: false,
      isSendingApi: false,
      activeNewOrderToast: null,

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
      setIsPasscodeModalOpen: (open: boolean) => set({ isPasscodeModalOpen: open }),
      setIsAdminAuthenticated: (auth: boolean) => set({ isAdminAuthenticated: auth }),
      requestAdminAccess: () => {
        const { isAdminAuthenticated } = get();
        if (isAdminAuthenticated) {
          set({ isAdminOpen: true });
        } else {
          set({ isPasscodeModalOpen: true });
        }
      },
      setAdminTab: (tab) => set({ adminTab: tab }),
      toggleSoundMuted: () => set((state) => ({ isSoundMuted: !state.isSoundMuted })),
      dismissNewOrderToast: () => set({ activeNewOrderToast: null }),
      simulateIncomingOrder: () => {
        const simOrderNum = Math.floor(6214600 + Math.random() * 900);
        const simOrder: OrderRecord = {
          orderNumber: String(simOrderNum),
          customerName: 'קבלן הדמה - יצחק יצחקי (518999)',
          customerPhone: '054-9876543',
          origin: 'comax',
          warehouse: '🏭 4 (החרש)',
          address: 'רחוב הרצל 45, ראשון לציון',
          driverName: 'סידור מנופים ח. סבן',
          distance: '18.2 ק"מ (22 דקות)',
          duration: '22 דקות',
          wazeUrl: 'https://waze.com/ul?q=הרצל 45 ראשון לציון',
          items: [
            { sku: '11500', name: 'חול שק', quantity: 50, unit: 'יח\'', price: 15 },
            { sku: '10015', name: 'בטון מהיר מוכן 25 ק"ג', quantity: 10, unit: 'יח\'', price: 42 },
          ],
          blowStatus: '✅ מאושר',
          palletStatus: '✅ תקין',
          status: 'מאושר',
          timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
          formattedTemplate: 'נועה AI: הזמנה חדשה התקבלה מלוג הזמנות מערכת בגליון',
        };

        set((state) => ({
          orders: [simOrder, ...state.orders],
          activeNewOrderToast: simOrder,
        }));

        if (!get().isSoundMuted) {
          triggerBrowserNotification(
            `🚨 הזמנה חדשה התקבלה ב-Google Sheets! (#${simOrder.orderNumber})`,
            `לקוח: ${simOrder.customerName} | כתובת: ${simOrder.address}`,
            true
          );
        }
      },

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

      addCustomer: (customerData) => {
        const id = `CUST-${Math.floor(1000 + Math.random() * 9000)}`;
        const newCustomer: CustomerRecord = {
          ...customerData,
          id,
          createdAt: new Date().toISOString().split('T')[0],
          driveFolderUrl: customerData.driveFolderUrl || `https://drive.google.com/drive/folders/saban_${id.toLowerCase()}`,
          activeOrdersCount: 0,
        };
        set((state) => ({
          customers: [newCustomer, ...state.customers],
        }));
      },

      updateCustomer: (id, customerData) => {
        set((state) => ({
          customers: state.customers.map((c) => (c.id === id ? { ...c, ...customerData } : c)),
        }));
      },

      deleteCustomer: (id) => {
        set((state) => ({
          customers: state.customers.filter((c) => c.id !== id),
        }));
      },

      createOrder: (orderData) => {
        const orderNumber = orderData.orderNumber || `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
        const timestamp = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        
        const newOrder: OrderRecord = {
          orderNumber,
          customerName: orderData.customerName || 'לקוח וואטסאפ',
          customerPhone: orderData.customerPhone || '054-0000000',
          groupJid: orderData.groupJid || GROUP_JIDS.CUSTOMER_ORDERS,
          origin: orderData.origin || 'whatsapp',
          warehouse: orderData.warehouse || 'מחסן החרש',
          address: orderData.address || 'אתר חלוקה',
          driverName: orderData.driverName || 'אלי שרעבי',
          distance: orderData.distance || '10.5 ק"מ',
          duration: orderData.duration || '15 דקות',
          wazeUrl: orderData.wazeUrl || 'https://waze.com/ul?ll=32.0853,34.7818&navigate=yes',
          items: orderData.items && orderData.items.length > 0 ? orderData.items : [
            { sku: '10002', name: 'שק מלט אפור 50 ק"ג', quantity: 80, unit: 'שק', price: 38 },
            { sku: '10001', name: 'חול ים / חול מחצבה בבאלה', quantity: 4, unit: 'באלה', price: 140 },
          ],
          blowStatus: orderData.blowStatus || 'מאושר (פקדון מוסדר)',
          palletStatus: orderData.palletStatus || 'ללא משטחים',
          status: orderData.status || 'בתהליך אספקה',
          timestamp,
        };

        newOrder.formattedTemplate = formatWhatsAppOutboundTemplate(newOrder);

        set((state) => ({
          orders: [newOrder, ...state.orders],
        }));

        // Sync to Google Sheets Webhook automatically
        syncOrderToGoogleSheets({
          orderNumber: newOrder.orderNumber,
          customerName: newOrder.customerName,
          customerPhone: newOrder.customerPhone,
          groupJid: newOrder.groupJid,
          address: newOrder.address,
          warehouse: newOrder.warehouse,
          items: newOrder.items,
          messageText: `יצירת הזמנה חדשה במערכת - ${newOrder.orderNumber}`,
          autoReply: newOrder.formattedTemplate,
          status: newOrder.status,
        }).catch((err) => console.warn('Sync to Google Sheets failed:', err));

        return newOrder;
      },

      updateOrderStatus: async (orderNumber, status, notifyWhatsApp = true) => {
        saveOrderStatus(orderNumber, status);
        const targetOrder = get().orders.find((o) => String(o.orderNumber) === String(orderNumber));

        set((state) => ({
          orders: state.orders.map((o) =>
            String(o.orderNumber) === String(orderNumber) ? { ...o, status } : o
          ),
        }));

        if (notifyWhatsApp && targetOrder) {
          const success = await sendStatusUpdateToWhatsApp(
            String(orderNumber),
            targetOrder.customerName,
            status,
            targetOrder.driverName
          );
          return success;
        }
        return true;
      },

      resolveDiscrepancy: (id, notes) => {
        set((state) => ({
          discrepancies: state.discrepancies.map((d) =>
            d.id === id ? { ...d, status: 'RESOLVED', notes: notes || 'אושר על ידי מנהל' } : d
          ),
        }));
      },

      processGroupOrderMessage: async (senderName, text, groupJid = GROUP_JIDS.CUSTOMER_ORDERS, comaxPdfQtyMap) => {
        const { customers, logisticsDictionary, createOrder, addCustomer } = get();
        const timestamp = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

        // 1. Match or Create Customer in תיק_לקוח_וחשבונות
        let customer = customers.find(
          (c) => c.name.includes(senderName) || senderName.includes(c.name)
        );

        if (!customer) {
          const newCustId = `CUST-${Math.floor(1000 + Math.random() * 9000)}`;
          customer = {
            id: newCustId,
            name: senderName,
            phone: '054-9998877',
            address: 'אתר בנייה מרכזי',
            creditLimit: '₪100,000',
            currentBalance: '₪0',
            driveFolderUrl: `https://drive.google.com/drive/folders/saban_${newCustId.toLowerCase()}`,
            comaxId: `CMX-${Math.floor(1000 + Math.random() * 9000)}`,
            createdAt: new Date().toISOString().split('T')[0],
            notes: 'נוצר אוטומטית מקבוצת הזמנות נועה AI',
            activeOrdersCount: 1,
          };
          addCustomer(customer);
        }

        // 2. Map SKUs using Logistics Dictionary (מילון_לוגיסטי)
        const parsedItems: OrderRecord['items'] = [];
        const textLower = text.toLowerCase();

        logisticsDictionary.forEach((item) => {
          const isMatched = item.aliases.some((alias) => textLower.includes(alias.toLowerCase()));
          if (isMatched) {
            // Find numbers preceding or following the alias
            let qty = 1;
            const regex = new RegExp(`(\\d+)\\s*(?:${item.aliases.join('|')})|(?:${item.aliases.join('|')})\\s*(\\d+)`, 'i');
            const match = text.match(regex);
            if (match) {
              const num = parseInt(match[1] || match[2], 10);
              if (!isNaN(num) && num > 0) {
                qty = num;
              }
            } else if (textLower.includes('80')) {
              qty = 80;
            } else if (textLower.includes('4') || textLower.includes('ארבע')) {
              qty = 4;
            }

            parsedItems.push({
              sku: item.sku,
              name: item.productName,
              quantity: qty,
              unit: item.unit,
              price: item.unitPrice,
            });
          }
        });

        if (parsedItems.length === 0) {
          // Default fallback items if parsing is broad
          parsedItems.push(
            { sku: '10002', name: 'שק מלט אפור 50 ק"ג', quantity: 80, unit: 'שק', price: 38 },
            { sku: '10001', name: 'חול ים / חול מחצבה בבאלה', quantity: 4, unit: 'באלה', price: 140 }
          );
        }

        // 3. Create Order
        const orderNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
        const orderObj: Partial<OrderRecord> = {
          orderNumber,
          customerName: customer.name,
          customerPhone: customer.phone,
          groupJid,
          origin: 'whatsapp',
          warehouse: 'מחסן החרש',
          address: customer.address || 'אתר חלוקה רמת גן',
          driverName: 'אלי שרעבי',
          distance: '12.4 ק"מ',
          duration: '18 דקות',
          wazeUrl: 'https://waze.com/ul?ll=32.0853,34.7818&navigate=yes',
          items: parsedItems,
          blowStatus: 'מאושר (4 בלות)',
          palletStatus: '2 משטחי עץ (פקדון הוחזר)',
          status: 'בתהליך אספקה',
        };

        const createdOrder = createOrder(orderObj);

        // 4. Discrepancy Cross-Validation (WhatsApp vs PDF/Comax)
        // If comaxPdfQtyMap is provided or if WhatsApp asked for 80 bags of cement (SKU 10002) while Comax PDF says 30
        const cementItem = parsedItems.find((i) => i.sku === '10002');
        const pdfCementQty = comaxPdfQtyMap ? (comaxPdfQtyMap['10002'] || 30) : 30;

        if (cementItem && cementItem.quantity > pdfCementQty) {
          const diff = cementItem.quantity - pdfCementQty;
          const discId = `DISC-${Math.floor(100 + Math.random() * 900)}`;

          const newDiscrepancy: LogisticsDiscrepancy = {
            id: discId,
            orderNumber,
            customerName: customer.name,
            sku: cementItem.sku,
            productName: cementItem.name,
            whatsappQty: cementItem.quantity,
            comaxPdfQty: pdfCementQty,
            difference: diff,
            severity: 'HIGH',
            timestamp,
            status: 'PENDING_REVIEW',
            notes: `פער חריג בין בקשת הוואטסאפ (${cementItem.quantity} שקים) לבין טופס ההזמנה מקומקס/PDF (${pdfCementQty} שקים בלבד).`,
          };

          set((state) => ({
            discrepancies: [newDiscrepancy, ...state.discrepancies],
          }));

          // Post alert to Group 'עדכונים סידור נועה' (120363428842730390@g.us)
          const alertMsgText = `⚠️ *התראת חריגה לוגיסטית בקבוצת הזמנות* ⚠️

🧾 *מספר הזמנה:* ${orderNumber}
👤 *לקוח:* ${customer.name}
🧱 *מוצר:* ${cementItem.name} (מק"ט ${cementItem.sku})
💬 *כמות מבוקשת בוואטסאפ:* ${cementItem.quantity} שקים
📄 *כמות במסמך קומקס/PDF:* ${pdfCementQty} שקים
🚨 *פער חריג:* +${diff} שקים (חריגה גבוהה!)

מערכת נועה AI רשמה חריגה זו ב'חריגות_לוגיסטיות'. נדרש אישור מנהל לפני תחילת העמסה!`;

          const alertMsg: Message = {
            id: `msg-alert-${Date.now()}`,
            chatId: 'chat-group-updates-alerts',
            sender: 'system',
            senderName: 'מערכת בקרת חריגות (Noa Audit)',
            text: alertMsgText,
            timestamp,
            status: 'read',
          };

          set((state) => ({
            messages: {
              ...state.messages,
              'chat-group-updates-alerts': [
                ...(state.messages['chat-group-updates-alerts'] || []),
                alertMsg,
              ],
            },
          }));
        }

        // 5. Post Formatted Confirmation to Customer Order Group (120363390702096083@g.us)
        const confirmationMsg: Message = {
          id: `msg-grp-resp-${Date.now()}`,
          chatId: 'chat-group-customer-orders',
          sender: 'ai',
          senderName: 'נועה AI',
          text: createdOrder.formattedTemplate || formatWhatsAppOutboundTemplate(createdOrder),
          timestamp,
          status: 'read',
        };

        set((state) => ({
          messages: {
            ...state.messages,
            'chat-group-customer-orders': [
              ...(state.messages['chat-group-customer-orders'] || []),
              confirmationMsg,
            ],
          },
        }));

        return createdOrder;
      },

      syncLiveSheetData: async () => {
        try {
          set({ isSendingApi: true });
          const { orders: rawLiveOrders, customers: liveCustomers } = await fetchLiveOrderLogAndCustomers();
          const liveDict = await fetchLiveLogisticsDictionary();
          const liveProducts = mapDictionaryToProducts(liveDict);

          const savedStatuses = getSavedStatuses();
          const liveOrders = rawLiveOrders.map((o) => ({
            ...o,
            status: savedStatuses[o.orderNumber] || o.status,
          }));

          const currentOrders = get().orders;
          const currentOrderNums = new Set(currentOrders.map((o) => String(o.orderNumber)));

          // Detect brand new orders coming from Google Sheets
          const newOrdersFromSheets = liveOrders.filter(
            (o) => !currentOrderNums.has(String(o.orderNumber))
          );

          // If currentOrders was not empty (i.e. app is already open/running) and new orders detected:
          if (currentOrders.length > 0 && newOrdersFromSheets.length > 0) {
            const newest = newOrdersFromSheets[0];
            set({ activeNewOrderToast: newest });

            if (!get().isSoundMuted) {
              triggerBrowserNotification(
                `🚨 הזמנה חדשה התקבלה ב-Google Sheets! (#${newest.orderNumber})`,
                `לקוח: ${newest.customerName} | כתובת: ${newest.address || 'לא צוינה'}`,
                true
              );
            }
          }

          set((state) => ({
            orders: liveOrders.length > 0 ? liveOrders : state.orders,
            customers: liveCustomers.length > 0 ? liveCustomers : state.customers,
            logisticsDictionary: liveDict.length > 0 ? liveDict : state.logisticsDictionary,
            config: {
              ...state.config,
              products: liveProducts.length > 0 ? liveProducts : state.config.products,
            },
            isSendingApi: false,
          }));
        } catch (err) {
          console.error('❌ שגיאה בסנכרון נתונים חיים מהגליון:', err);
          set({ isSendingApi: false });
        }
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
