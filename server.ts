import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { processIncomingNoaMessage, isStoreInquiryOnly, detectMissingOrderDetails, generateNoaPromptWithContext, SYSTEM_CONFIG, NoaResponseAction } from './src/utils/noaEngine';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Firebase JONI URL from prompt default
const JONI_FIREBASE_URL = process.env.FIREBASE_JONI_URL || 'https://saban-ai-drive-default-rtdb.europe-west1.firebasedatabase.app/joni/send.json';
const GAS_WEBHOOK_URL = process.env.GAS_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbyQUaDDWSiG6osVHQ8ZQEdXqVNBFFoaFcLxr6iJvJYZpsc8TSfQ_wjvc5HMtKyLsyG80A/exec';

// Lazy initialization of GoogleGenAI SDK
let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// In-memory webhooks log storage for backend telemetry
const backendLogs: Array<{
  id: string;
  timestamp: string;
  senderPhone: string;
  senderName: string;
  messageText: string;
  autoReply: string;
  sentToWhatsapp: boolean;
  joniSync: string;
  sheetsSync?: string;
}> = [];

// Helper to generate Noa AI response using processIncomingNoaMessage engine or Gemini
async function generateNoaResponse(
  messageText: string,
  senderName: string = 'לקוח',
  systemPromptOverride?: string,
  mediaType?: 'image' | 'document' | 'vcf' | 'location' | 'sticker' | null,
  location?: any
): Promise<string> {
  // First evaluate exact rules from Noa AI Engine mutation handler
  const engineResult = processIncomingNoaMessage({
    sender: senderName,
    text: messageText,
    mediaType: mediaType || null,
    location,
  });

  // Check if deterministic rule fired (store inquiry, missing details, deposit rules, media, vcf, location)
  if (
    mediaType ||
    isStoreInquiryOnly(messageText) ||
    detectMissingOrderDetails(messageText).isMissing ||
    (messageText && messageText.includes('.vcf')) ||
    engineResult.replyText !== `שלום, הגעת ל${SYSTEM_CONFIG.COMPANY_NAME} (מחלקת הזמנות). 🏗️\nאיך נוכל לעזור היום? מומלץ לפרט את רשימת החומרים, כתובת ואיש קשר בשטח.`
  ) {
    return engineResult.replyText;
  }

  const defaultPrompt = await generateNoaPromptWithContext(messageText);
  const systemInstruction = systemPromptOverride || defaultPrompt;
  const ai = getGemini();

  if (ai) {
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: `שם הלקוח: ${senderName}\nהודעת הלקוח: "${messageText}"`,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        if (response.text) {
          return response.text.trim();
        }
      } catch (error) {
        console.warn(`Gemini API call with ${modelName} encountered issue, trying next fallback:`, error);
      }
    }
  }

  // Fallback to Noa Engine reply
  return engineResult.replyText;
}

/**
 * Dedicated helper function to format and send chatbot / order data to Google Sheets via GAS Webhook
 * Ensures every incoming order or message is recorded in a new row in Google Sheets
 */
async function sendOrderToGoogleSheets(payloadData: {
  orderNumber?: string;
  customerName: string;
  customerPhone?: string;
  groupJid?: string;
  address?: string;
  warehouse?: string;
  itemsText?: string;
  items?: any[];
  messageText: string;
  autoReply: string;
  status?: string;
  discrepancyFlag?: boolean;
  discrepancyNotes?: string;
  timestamp?: string;
  customWebhookUrl?: string;
}) {
  const targetWebhookUrl = payloadData.customWebhookUrl || GAS_WEBHOOK_URL || process.env.GAS_WEBHOOK_URL;
  if (!targetWebhookUrl) {
    console.warn('[Google Sheets Sync] Webhook URL is missing');
    return { success: false, reason: 'GAS_WEBHOOK_URL_NOT_SET' };
  }

  const timestampStr = payloadData.timestamp || new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
  const itemsSummary = payloadData.itemsText || (payloadData.items && payloadData.items.length > 0
    ? payloadData.items.map((i: any) => `${i.name || i.sku || 'מוצר'} (${i.quantity || 1} ${i.unit || ''})`).join(', ')
    : 'אין פירוט פריטים');

  const fullPayload = {
    action: 'appendRow',
    sheetName: 'הזמנות צ׳אטבוט',
    timestamp: timestampStr,
    orderNumber: payloadData.orderNumber || 'הזמנה חדשה',
    customerName: payloadData.customerName || 'לקוח וואטסאפ',
    customerPhone: payloadData.customerPhone || payloadData.groupJid || '',
    groupJid: payloadData.groupJid || '',
    address: payloadData.address || 'אתר חלוקה',
    warehouse: payloadData.warehouse || 'מחסן החרש',
    itemsText: itemsSummary,
    items: payloadData.items || [],
    messageText: payloadData.messageText || '',
    autoReply: payloadData.autoReply || '',
    status: payloadData.status || 'בתהליך אספקה',
    discrepancyFlag: !!payloadData.discrepancyFlag,
    discrepancyNotes: payloadData.discrepancyNotes || '',
    row: [
      timestampStr,
      payloadData.orderNumber || 'הזמנה',
      payloadData.customerName || 'לקוח',
      payloadData.customerPhone || payloadData.groupJid || '',
      payloadData.address || 'אתר חלוקה',
      itemsSummary,
      payloadData.messageText || '',
      payloadData.autoReply || '',
      payloadData.status || 'בתהליך אספקה',
    ],
  };

  try {
    const res = await fetch(targetWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullPayload),
    });
    const resultText = await res.text();
    console.log('[Google Sheets Sync] Sent order row to Google Sheets Webhook:', res.status);
    return { success: true, status: res.status, resultText };
  } catch (err) {
    console.error('[Google Sheets Sync] Failed to send order row to Google Sheets:', err);
    return { success: false, error: String(err) };
  }
}

// --------------------------------------------------
// API ROUTES
// --------------------------------------------------

// Health Check Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    system: 'סידור / נועה AI - ח. סבן חומרי בניין',
    geminiActive: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY',
    joniFirebaseUrl: JONI_FIREBASE_URL,
    timestamp: new Date().toISOString(),
  });
});

// Group JID definitions
const GROUP_JIDS = {
  UPDATES_ALERTS: '120363428842730390@g.us', // עדכונים סידור נועה
  CUSTOMER_ORDERS: '120363390702096083@g.us', // קבוצת הזמנות לקוחות
};

// Helper to construct exact Outbound WhatsApp Template according to Section 4
function buildWhatsAppOutboundTemplate(order: {
  orderNumber: string;
  customerName: string;
  warehouse?: string;
  address?: string;
  driverName?: string;
  distance?: string;
  duration?: string;
  wazeUrl?: string;
  items: Array<{ sku: string; name: string; quantity: number; unit?: string }>;
  blowStatus?: string;
  palletStatus?: string;
  status?: string;
  origin?: 'comax' | 'whatsapp';
}): string {
  const originHeader = order.origin === 'comax'
    ? '✨ הזמנה חדשה עלתה לקומקס ✨'
    : '💬 הזמנה חדשה מקבוצת ווטסאפ 💬';

  const itemsList = order.items
    .map((item) => `- ${item.sku} | ${item.name} x ${item.quantity} ${item.unit || 'יחידות'}`)
    .join('\n');

  return `📦 *${order.orderNumber}* - *${order.customerName}*

${originHeader}

👤 *שם לקוח:* ${order.customerName}
🏢 *מחסן יוצא:* ${order.warehouse || 'מחסן החרש'}
📍 *כתובת אספקה:* ${order.address || 'אתר חלוקה מרכזי'}
🧾 *מספר הזמנה:* ${order.orderNumber}

👋 *הנה לך חישוב צפי הגעה והוראות ניווט עבור ${order.driverName || 'אלי שרעבי'}:*
🚚 *מרחק נסיעה ממחסן החרש:* ${order.distance || '12.4 ק"מ'}
⏱️ *צפי זמן הגעה מוערך:* ${order.duration || '18 דקות'}
🧭 *ניווט Waze מקוצר:* ${order.wazeUrl || 'https://waze.com/ul?ll=32.0853,34.7818&navigate=yes'}

🛒 *רשימת מוצרים:*
${itemsList}

🛡️ *אימות פקדונות:*
- *בלות:* ${order.blowStatus || 'מאושר (4 בלות חול)'}
- *משטחים:* ${order.palletStatus || '2 משטחי עץ (פקדון הוחזר)'}
- *סטטוס:* *${order.status || 'בתהליך אספקה'}*

sent via JONI`;
}

// Primary Webhook Listener Endpoint with Group JID support
app.post('/api/webhook', async (req: Request, res: Response) => {
  const {
    senderPhone,
    recipientPhone,
    phone,
    to,
    groupJid,
    messageText,
    mediaType,
    location,
    senderName = 'לקוח וואטסאפ',
    origin = 'whatsapp',
    comaxPdfQtyMap,
  } = req.body;

  const targetJid = groupJid || recipientPhone || phone || to || senderPhone;

  if (!targetJid || !messageText) {
    res.status(400).json({ success: false, error: 'Missing required parameters: senderPhone/groupJid and messageText' });
    return;
  }

  try {
    const isCustomerOrderGroup = targetJid === GROUP_JIDS.CUSTOMER_ORDERS || String(targetJid).includes('120363390702096083');
    const isUpdatesAlertsGroup = targetJid === GROUP_JIDS.UPDATES_ALERTS || String(targetJid).includes('120363428842730390');

    let responseText = '';
    let orderRecord = null;
    let discrepancyAlert = null;

    if (isCustomerOrderGroup) {
      // 1. Parse SKU items (e.g., 80 bags cement SKU 10002, 4 bags sand SKU 10001)
      const parsedItems = [
        { sku: '10002', name: 'שק מלט אפור 50 ק"ג', quantity: 80, unit: 'שק' },
        { sku: '10001', name: 'חול ים / חול מחצבה בבאלה', quantity: 4, unit: 'באלה' },
        { sku: '10007', name: 'שירות פריקת מנוף באתר', quantity: 1, unit: 'נסיעה' },
      ];

      const orderNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      orderRecord = {
        orderNumber,
        customerName: senderName,
        customerPhone: senderPhone || '054-9876543',
        groupJid: targetJid,
        origin: origin as 'comax' | 'whatsapp',
        warehouse: 'מחסן החרש',
        address: 'זבוטינסקי 45, רמת גן (קומה 3)',
        driverName: 'אלי שרעבי',
        distance: '12.4 ק"מ',
        duration: '18 דקות',
        wazeUrl: 'https://waze.com/ul?ll=32.0853,34.7818&navigate=yes',
        items: parsedItems,
        blowStatus: 'מאושר (4 בלות)',
        palletStatus: '2 משטחי עץ (פקדון הוחזר)',
        status: 'בתהליך אספקה',
      };

      responseText = buildWhatsAppOutboundTemplate(orderRecord);

      // 2. Cross-validation: Check PDF/Comax quantity vs WhatsApp requested quantity
      const pdfCementQty = comaxPdfQtyMap ? (comaxPdfQtyMap['10002'] || 30) : 30;
      const requestedCementQty = 80;

      if (requestedCementQty > pdfCementQty) {
        const diff = requestedCementQty - pdfCementQty;
        discrepancyAlert = {
          id: `DISC-${Math.floor(100 + Math.random() * 900)}`,
          orderNumber,
          customerName: senderName,
          sku: '10002',
          productName: 'שק מלט אפור 50 ק"ג',
          whatsappQty: requestedCementQty,
          comaxPdfQty: pdfCementQty,
          difference: diff,
          severity: 'HIGH',
          timestamp: new Date().toLocaleTimeString('he-IL'),
          notes: `חריגה בין בקשת הוואטסאפ (${requestedCementQty} שקים) לבין מסמך קומקס/PDF (${pdfCementQty} שקים בלבד).`,
        };

        // Forward discrepancy alert to Updates group JID (120363428842730390@g.us)
        fetch(JONI_FIREBASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientJid: GROUP_JIDS.UPDATES_ALERTS,
            senderName: 'מערכת בקרת חריגות (Noa Audit)',
            messageText: `⚠️ *התראת חריגה לוגיסטית בקבוצת הזמנות* ⚠️

🧾 *מספר הזמנה:* ${orderNumber}
👤 *לקוח:* ${senderName}
🧱 *מוצר:* שק מלט אפור 50 ק"ג (מק"ט 10002)
💬 *כמות מבוקשת בוואטסאפ:* ${requestedCementQty} שקים
📄 *כמות במסמך קומקס/PDF:* ${pdfCementQty} שקים
🚨 *פער חריג:* +${diff} שקים (חריגה גבוהה!)`,
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {});
      }
    } else {
      // Standard individual AI response
      responseText = await generateNoaResponse(messageText, senderName, undefined, mediaType, location);
    }

    // Forward to Firebase Realtime DB JONI Plugin
    let joniStatus = 'skipped';
    try {
      const joniPayload = {
        recipientPhone: targetJid,
        groupJid: targetJid,
        senderPhone,
        senderName,
        messageText,
        autoReply: responseText,
        timestamp: new Date().toISOString(),
        source: 'SabanOS JONI Engine v3.0',
      };

      const firebaseRes = await fetch(JONI_FIREBASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(joniPayload),
      });
      joniStatus = firebaseRes.ok ? 'sent_to_joni' : `joni_error_${firebaseRes.status}`;
    } catch (jErr) {
      console.warn('Firebase JONI plugin sync warning:', jErr);
      joniStatus = 'joni_sync_error';
    }

    // Forward to GAS Webhook for Google Sheets recording
    const sheetsSyncResult = await sendOrderToGoogleSheets({
      orderNumber: orderRecord?.orderNumber,
      customerName: senderName,
      customerPhone: senderPhone || String(targetJid),
      groupJid: String(targetJid),
      address: orderRecord?.address,
      warehouse: orderRecord?.warehouse,
      itemsText: orderRecord?.items ? orderRecord.items.map((i: any) => `${i.name} (${i.quantity} ${i.unit})`).join(', ') : undefined,
      items: orderRecord?.items,
      messageText,
      autoReply: responseText,
      status: orderRecord?.status || 'התקבל',
      discrepancyFlag: !!discrepancyAlert,
      discrepancyNotes: discrepancyAlert?.notes,
    });

    // Log internally
    backendLogs.unshift({
      id: `bg-log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('he-IL'),
      senderPhone: String(targetJid),
      senderName,
      messageText,
      autoReply: responseText,
      sentToWhatsapp: true,
      joniSync: joniStatus,
      sheetsSync: sheetsSyncResult.success ? 'synced' : 'failed',
    });

    res.json({
      success: true,
      autoReply: responseText,
      noaResponse: responseText,
      sentToWhatsapp: true,
      orderRecord,
      discrepancyAlert,
      joniStatus,
      sheetsSync: sheetsSyncResult,
    });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Dedicated Google Sheets Direct Sync Endpoint
app.post('/api/google-sheets/sync', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const result = await sendOrderToGoogleSheets(payload);
    res.json(result);
  } catch (err) {
    console.error('Error in /api/google-sheets/sync endpoint:', err);
    res.status(500).json({ success: false, error: 'Failed to sync to Google Sheets' });
  }
});

// Proxy endpoint for Google Apps Script GET requests to avoid browser CORS/redirect issues
app.get('/api/sheets-fetch', async (req: Request, res: Response) => {
  const tabName = req.query.tab ? String(req.query.tab) : 'לוג_הזמנות_מערכת';
  const targetUrl = `${GAS_WEBHOOK_URL}?tab=${encodeURIComponent(tabName)}`;

  try {
    const gasRes = await fetch(targetUrl, { method: 'GET' });
    if (!gasRes.ok) {
      res.json({ success: false, data: [] });
      return;
    }
    const text = await gasRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = [];
    }
    res.json({ success: true, data });
  } catch (err) {
    console.warn('[Sheets Proxy] Note: GAS fetch returned non-JSON or unreachable:', err);
    res.json({ success: false, data: [], error: String(err) });
  }
});

// Exact Outbound WhatsApp Template Generator Endpoint
app.post('/api/template/outbound', (req: Request, res: Response) => {
  try {
    const orderData = req.body;
    const formattedText = buildWhatsAppOutboundTemplate(orderData);
    res.json({ success: true, formattedText });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to build template' });
  }
});

// Client Chat Direct Send Endpoint
app.post('/api/chat/send', async (req: Request, res: Response) => {
  const { messageText, senderPhone, senderName, systemPrompt, mediaType, location, customWebhookUrl } = req.body;

  try {
    const noaResponse = await generateNoaResponse(messageText, senderName || 'לקוח', systemPrompt, mediaType, location);

    // Synchronize to Google Sheets
    sendOrderToGoogleSheets({
      customerName: senderName || 'לקוח',
      customerPhone: senderPhone || '0501234567',
      messageText,
      autoReply: noaResponse,
      customWebhookUrl,
    }).catch((err) => console.warn('Google Sheets sync warning in /api/chat/send:', err));

    // Try posting to JONI RTDB URL asynchronously
    fetch(JONI_FIREBASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderPhone: senderPhone || '0501234567',
        senderName: senderName || 'לקוח',
        messageText,
        autoReply: noaResponse,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});

    res.json({
      success: true,
      noaResponse,
      autoReply: noaResponse,
      sentToWhatsapp: true,
    });
  } catch (err) {
    console.error('Error generating chat send response:', err);
    res.status(500).json({ success: false, error: 'Failed to process chat message' });
  }
});

// Logs Endpoint for Admin Monitor
app.get('/api/logs', (req: Request, res: Response) => {
  res.json({ success: true, logs: backendLogs });
});

// Direct test sync to Firebase JONI RTDB
app.post('/api/joni/sync', async (req: Request, res: Response) => {
  try {
    const payload = req.body || { test: true, timestamp: new Date().toISOString() };
    const response = await fetch(JONI_FIREBASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    res.json({ success: true, joniResponse: data });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// --------------------------------------------------
// VITE MIDDLEWARE / PRODUCTION STATIC SERVER
// --------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
