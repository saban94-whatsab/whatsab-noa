import { OrderStatus, ORDER_STATUS_LABELS, GROUP_JIDS } from '../types';

const STORAGE_KEY = 'saban_orders_status_v1';
const GAS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyQUaDDWSiG6osVHQ8ZQEdXqVNBFFoaFcLxr6iJvJYZpsc8TSfQ_wjvc5HMtKyLsyG80A/exec';

/**
 * טוען מפה של סטטוסים שמורים מ-localStorage
 */
export function getSavedStatuses(): Record<string, OrderStatus> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    console.error('❌ שגיאה בקריאת סטטוסים מ-localStorage:', e);
    return {};
  }
}

/**
 * שומר סטטוס של הזמנה ב-localStorage
 */
export function saveOrderStatus(orderNumber: string, status: OrderStatus): void {
  try {
    const current = getSavedStatuses();
    current[orderNumber] = status;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('❌ שגיאה בשמירת סטטוס ב-localStorage:', e);
  }
}

/**
 * שולח הודעת עדכון סטטוס ל-Webhook של WhatsApp לקבוצת עדכוני סידור
 */
export async function sendStatusUpdateToWhatsApp(
  orderNumber: string,
  customerName: string,
  newStatus: OrderStatus,
  driverName?: string
): Promise<boolean> {
  const statusInfo = ORDER_STATUS_LABELS[newStatus] || { label: newStatus, icon: '📌', colorClass: '' };
  
  const messageText = `📢 *עדכון סטטוס הזמנה מסידור עבודה* 📢

🧾 *מספר הזמנה:* ${orderNumber}
👤 *לקוח:* ${customerName}
${driverName ? `🚛 *נהג:* ${driverName}\n` : ''}📌 *סטטוס חדש:* ${statusInfo.icon} *${statusInfo.label}*
🕒 *זמן עדכון:* ${new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}

sent via Noa AI System`;

  try {
    const response = await fetch(GAS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_whatsapp_message',
        recipientJid: GROUP_JIDS.UPDATES_ALERTS, // קבוצת עדכונים סידור נועה
        message: messageText,
        orderNumber: orderNumber,
        status: newStatus,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('❌ שגיאה בשליחת עדכון סטטוס לווביהוק:', error);
    return false;
  }
}
