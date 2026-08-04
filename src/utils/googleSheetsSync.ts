import { gasPostRequest } from '../services/gasRouter';

/**
 * Utility function to send order & chatbot interaction data directly to Google Sheets via GAS_WEBHOOK_URL
 * Ensures every incoming order or message is recorded as a new row in Google Sheets without 500 error loops.
 */

export interface GoogleSheetsOrderPayload {
  orderNumber?: string;
  customerName: string;
  customerPhone?: string;
  groupJid?: string;
  address?: string;
  warehouse?: string;
  itemsText?: string;
  items?: Array<{
    sku?: string;
    name?: string;
    quantity?: number;
    unit?: string;
    price?: number;
  }>;
  messageText: string;
  autoReply?: string;
  status?: string;
  discrepancyFlag?: boolean;
  discrepancyNotes?: string;
  timestamp?: string;
}

export async function syncOrderToGoogleSheets(
  payload: GoogleSheetsOrderPayload,
  _customWebhookUrl?: string
) {
  const timestampStr =
    payload.timestamp || new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });

  // Format items list into human-readable string for Google Sheets cell
  const itemsFormatted =
    payload.itemsText ||
    (payload.items && payload.items.length > 0
      ? payload.items
          .map((i) => `${i.name || i.sku || 'מוצר'} x${i.quantity || 1} ${i.unit || ''}`)
          .join(', ')
      : 'לא צוינו פריטים');

  const sheetPayload = {
    action: 'appendRow',
    sheetName: 'הזמנות צ׳אטבוט',
    timestamp: timestampStr,
    orderNumber: payload.orderNumber || 'הזמנה חדשה',
    customerName: payload.customerName || 'לקוח וואטסאפ',
    customerPhone: payload.customerPhone || payload.groupJid || 'לא צוין',
    groupJid: payload.groupJid || '',
    address: payload.address || 'אתר חלוקה',
    warehouse: payload.warehouse || 'מחסן החרש',
    itemsText: itemsFormatted,
    items: payload.items || [],
    messageText: payload.messageText || '',
    autoReply: payload.autoReply || '',
    status: payload.status || 'בתהליך אספקה',
    discrepancyFlag: !!payload.discrepancyFlag,
    discrepancyNotes: payload.discrepancyNotes || '',
    row: [
      timestampStr,
      payload.orderNumber || 'הזמנה',
      payload.customerName || 'לקוח',
      payload.customerPhone || payload.groupJid || '',
      payload.address || 'אתר חלוקה',
      itemsFormatted,
      payload.messageText || '',
      payload.autoReply || '',
      payload.status || 'בתהליך אספקה',
    ],
  };

  try {
    const res = await gasPostRequest('appendRow', sheetPayload);
    return { success: res.success, data: res.data };
  } catch (err) {
    console.error('[Google Sheets Frontend Sync] Note:', err);
    return { success: false, error: String(err) };
  }
}
