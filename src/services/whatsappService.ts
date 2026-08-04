/**
 * Enterprise WhatsApp Service
 * Manages UI and automated messaging, bidirectional local server sync,
 * and Google Sheets activity logging.
 */

import { gasGetRequest, gasPostRequest } from './gasRouter';

export interface WhatsAppMessagePayload {
  id?: string;
  phone: string;
  senderName: string;
  incomingMessage?: string;
  outgoingMessage?: string;
  text?: string;
  timestamp?: string;
  isGroup?: boolean;
  groupJid?: string;
  origin?: 'ui' | 'auto_reply' | 'local_server' | 'gas';
}

export interface SyncStatus {
  localServerActive: boolean;
  gasWebhookConfigured: boolean;
  activeLogsCount: number;
  serverTime: string;
}

const LOCAL_STORAGE_MESSAGES_KEY = 'saban_whatsapp_live_messages';

export class WhatsAppService {
  private localServerBaseUrl: string;

  constructor() {
    this.localServerBaseUrl =
      typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_LOCAL_SERVER_URL
        ? import.meta.env.VITE_LOCAL_SERVER_URL.replace(/\/$/, '')
        : '';
  }

  /**
   * Retrieves stored live messages from localStorage to prevent loss on refresh
   */
  public getStoredMessages(): WhatsAppMessagePayload[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_MESSAGES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Persists live messages to localStorage
   */
  public saveMessagesToStorage(messages: WhatsAppMessagePayload[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_MESSAGES_KEY, JSON.stringify(messages.slice(-200)));
    } catch {
      // Swallowed safely
    }
  }

  /**
   * Fetches latest sync status from local server (C:\ap94) or GAS router
   */
  public async syncChatState(): Promise<{
    success: boolean;
    messages: WhatsAppMessagePayload[];
    chats: any[];
    status: SyncStatus;
  }> {
    const defaultStatus: SyncStatus = {
      localServerActive: true,
      gasWebhookConfigured: true,
      activeLogsCount: 0,
      serverTime: new Date().toISOString(),
    };

    // 1. Attempt local Express server first (if configured)
    if (this.localServerBaseUrl) {
      try {
        const localRes = await fetch(`${this.localServerBaseUrl}/api/chat/sync`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        }).catch(() => null);

        if (localRes && localRes.ok) {
          const json = await localRes.json().catch(() => null);
          if (json && json.success) {
            return {
              success: true,
              messages: Array.isArray(json.messages) ? json.messages : [],
              chats: Array.isArray(json.chats) ? json.chats : [],
              status: {
                localServerActive: true,
                gasWebhookConfigured: Boolean(json.listenerStatus?.gasWebhookConfigured),
                activeLogsCount: json.activeLogsCount || 0,
                serverTime: json.serverTime || new Date().toISOString(),
              },
            };
          }
        }
      } catch (err) {
        console.warn('[WhatsAppService] Local server sync fallback:', err);
      }
    }

    // 2. Fallback to /api/chat/sync if on internal dev server
    try {
      const internalRes = await fetch('/api/chat/sync', {
        headers: { Accept: 'application/json' },
      }).catch(() => null);

      if (internalRes && internalRes.ok) {
        const contentType = internalRes.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await internalRes.json().catch(() => null);
          if (json && json.success) {
            return {
              success: true,
              messages: Array.isArray(json.messages) ? json.messages : [],
              chats: Array.isArray(json.chats) ? json.chats : [],
              status: {
                localServerActive: true,
                gasWebhookConfigured: Boolean(json.listenerStatus?.gasWebhookConfigured),
                activeLogsCount: json.activeLogsCount || 0,
                serverTime: json.serverTime || new Date().toISOString(),
              },
            };
          }
        }
      }
    } catch {
      // Swallowed safely
    }

    // 3. Fallback to GAS Router getMessages action
    const gasResponse = await gasGetRequest('getMessages');
    return {
      success: gasResponse.success,
      messages: gasResponse.messages || [],
      chats: gasResponse.chats || [],
      status: defaultStatus,
    };
  }

  /**
   * Sends a manual WhatsApp message (initiated by UI action)
   */
  public async sendManualMessage(payload: WhatsAppMessagePayload): Promise<boolean> {
    const formattedPayload: WhatsAppMessagePayload = {
      ...payload,
      id: payload.id || `msg-${Date.now()}`,
      timestamp: payload.timestamp || new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      origin: 'ui',
    };

    // Store message locally right away so user sees instant optimistic update
    const currentList = this.getStoredMessages();
    this.saveMessagesToStorage([...currentList, formattedPayload]);

    // Send to Local listener server if configured
    if (this.localServerBaseUrl) {
      try {
        await fetch(`${this.localServerBaseUrl}/api/chat/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formattedPayload),
        }).catch(() => null);
      } catch (err) {
        console.warn('[WhatsAppService] Local server dispatch warning:', err);
      }
    }

    // Also push to Google Apps Script Webhook
    const gasRes = await gasPostRequest('sendMessage', formattedPayload);
    return gasRes.success;
  }

  /**
   * Triggers an automated system response (e.g. AI bot auto-reply)
   */
  public async triggerAutomatedReply(payload: WhatsAppMessagePayload): Promise<boolean> {
    const autoPayload: WhatsAppMessagePayload = {
      ...payload,
      id: `auto-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      origin: 'auto_reply',
    };

    const currentList = this.getStoredMessages();
    this.saveMessagesToStorage([...currentList, autoPayload]);

    const gasRes = await gasPostRequest('sendMessage', autoPayload);
    return gasRes.success;
  }
}

export const whatsappService = new WhatsAppService();
