export type MessageStatus = 'sent' | 'delivered' | 'read';
export type MessageSender = 'user' | 'ai' | 'contact' | 'system';
export type MessageType = 'text' | 'audio' | 'document' | 'image';

export interface Message {
  id: string;
  chatId: string;
  sender: MessageSender;
  senderName?: string;
  text: string;
  timestamp: string; // ISO string or format HH:mm
  status: MessageStatus;
  type?: MessageType;
  mediaUrl?: string;
  audioDuration?: number; // in seconds
  fileName?: string;
  fileSize?: string;
  isGroup?: boolean;
  groupId?: string;
  mentionedJids?: string[];
  parsedClientName?: string;
  parsedClientPhone?: string;
  parsedItems?: Array<{ sku?: string; name: string; quantity: number; unit?: string }>;
}

export interface Contact {
  id: string;
  phone: string;
  name: string;
  avatar: string;
  unreadCount: number;
  lastMessage?: string;
  lastTimestamp?: string;
  onlineStatus: 'online' | 'offline' | 'typing';
  isAIEnabled: boolean; // whether Noa AI responds automatically to this chat
  isPinned?: boolean;
  isArchived?: boolean;
  tags?: string[];
  notes?: string;
}

export interface WebhookPayload {
  senderPhone: string;
  messageText: string;
  senderName?: string;
  timestamp?: string;
}

export interface WebhookLog {
  id: string;
  timestamp: string;
  senderPhone: string;
  senderName: string;
  messageText: string;
  autoReply: string;
  noaResponse: string;
  sentToWhatsapp: boolean;
  status: 'success' | 'failed' | 'pending';
  durationMs: number;
}

export interface ProductItem {
  id: string;
  name: string;
  category: string;
  price: string;
  unit: string;
  inStock: boolean;
  description?: string;
}

export interface SystemConfig {
  businessName: string;
  phone: string;
  businessHours: string;
  systemPrompt: string;
  isAIGloballyEnabled: boolean;
  gasWebhookUrl: string;
  firebaseJoniUrl: string;
  modelName: string;
  products: ProductItem[];
}

export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  address: string;
  creditLimit: string;
  currentBalance: string;
  driveFolderUrl?: string;
  comaxId: string;
  createdAt: string;
  notes?: string;
  activeOrdersCount?: number;
  totalSpent?: number;
  orders?: OrderRecord[];
}

export interface LogisticsDictionaryItem {
  sku: string;
  productName: string;
  category: string;
  aliases: string[];
  unit: string;
  unitPrice: number;
}

export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
}

export interface OrderRecord {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  groupJid?: string;
  origin: 'comax' | 'whatsapp';
  warehouse: string;
  address: string;
  driverName: string;
  distance: string;
  duration: string;
  wazeUrl: string;
  items: OrderItem[];
  blowStatus: string;
  palletStatus: string;
  status: string;
  timestamp: string;
  formattedTemplate?: string;
  discrepancyFlag?: boolean;
}

export interface LogisticsDiscrepancy {
  id: string;
  orderNumber: string;
  customerName: string;
  sku: string;
  productName: string;
  whatsappQty: number;
  comaxPdfQty: number;
  difference: number;
  severity: 'HIGH' | 'MEDIUM' | 'CRITICAL';
  timestamp: string;
  status: 'PENDING_REVIEW' | 'RESOLVED' | 'APPROVED';
  notes: string;
}

export const GROUP_JIDS = {
  UPDATES_ALERTS: '120363428842730390@g.us', // עדכונים סידור נועה
  CUSTOMER_ORDERS: '120363390702096083@g.us', // קבוצת הזמנות לקוחות
} as const;

export interface GroupWebhookPayload {
  groupJid?: string;
  recipientPhone?: string;
  phone?: string;
  to?: string;
  senderPhone?: string;
  senderName?: string;
  messageText?: string;
  timestamp?: string;
  origin?: 'comax' | 'whatsapp';
  comaxPdfData?: {
    orderNumber: string;
    items: Array<{ sku: string; quantity: number }>;
  };
}

export type OrderStatus = 'PENDING' | 'APPROVED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' | 'HOLD';

export interface OrderStatusInfo {
  label: string;
  icon: string;
  colorClass: string;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, OrderStatusInfo> = {
  PENDING: { label: 'ממתין לשיבוץ', icon: '⏳', colorClass: 'text-amber-400 bg-amber-500/20 border-amber-500/40' },
  APPROVED: { label: 'מאושר בסידור', icon: '✅', colorClass: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40' },
  IN_TRANSIT: { label: 'יצא לדרך / בנסיעה', icon: '🚛', colorClass: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/40' },
  DELIVERED: { label: 'סופק ונפרק באתר', icon: '📦', colorClass: 'text-green-400 bg-green-500/20 border-green-500/40' },
  HOLD: { label: 'מושהה בבירור', icon: '⚠️', colorClass: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40' },
  CANCELLED: { label: 'מבוטל', icon: '❌', colorClass: 'text-red-400 bg-red-500/20 border-red-500/40' },
};

