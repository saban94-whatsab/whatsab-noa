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

export interface SystemMetrics {
  totalChats: number;
  totalMessages: number;
  aiResponsesCount: number;
  avgResponseTimeMs: number;
  firebaseStatus: 'connected' | 'disconnected' | 'testing';
  gasStatus: 'active' | 'inactive' | 'testing';
  lastSyncTime?: string;
}
