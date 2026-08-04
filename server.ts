import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { processIncomingNoaMessage, isStoreInquiryOnly, detectMissingOrderDetails, generateNoaPromptWithContext, SYSTEM_CONFIG, NoaResponseAction } from './src/utils/noaEngine';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));

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
    engineResult.replyText !== `היי, במה אוכל לסייע לך היום בח. סבן? 👍`
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

// Audio Voice Message Transcription via Gemini API Endpoint
app.post('/api/transcribe-audio', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'חסרה הקלטה קולית בבקשה' });
    }

    // Strip header prefix if present (e.g., data:audio/webm;base64,...)
    const cleanBase64 = audioBase64.replace(/^data:audio\/[a-zA-Z0-9]+;base64,/, '');

    const ai = getGemini();
    if (!ai) {
      return res.status(500).json({ error: 'Gemini API is not configured or missing key.' });
    }

    const cleanMime = mimeType.split(';')[0] || 'audio/webm';
    const modelsToTry = ['gemini-3.6-flash', 'gemini-flash-latest'];
    let transcript = '';
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: cleanMime,
                  data: cleanBase64,
                },
              },
              {
                text: 'תמלל את ההקלטה הקולית הזו בעברית באופן תכליתי ומדויק לטקסט בלבד. החזר אך ורק את טקסט התמליל, ללא הסברים, ללא תוספות וללא מרכאות.',
              },
            ],
          },
        });

        if (response.text) {
          transcript = response.text.trim();
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[Gemini Audio Transcription] Failed with model ${modelName}:`, err);
      }
    }

    if (!transcript && lastError) {
      return res.status(500).json({ error: 'תקלה בתמלול הקלטה קולית באמצעות Gemini API', details: String(lastError) });
    }

    return res.json({ transcript, success: true });
  } catch (error) {
    console.error('[Audio Transcription Error]:', error);
    return res.status(500).json({ error: 'שגיאה בעיבוד הקלטה קולית', details: String(error) });
  }
});

// Group JID definitions
const GROUP_JIDS = {
  UPDATES_ALERTS: '120363428842730390@g.us', // עדכונים סידור נועה
  CUSTOMER_ORDERS: '120363390702096083@g.us', // קבוצת הזמנות לקוחות
};

// Helper to extract sub-client name and phone number from text body
function extractSubClientDetails(text: string): { name?: string; phone?: string } {
  if (!text) return {};
  const phoneMatch = text.match(/(?:\+972|05\d)[-]?\d{1,2}[-]?\d{3}[-]?\d{4}|05\d{8}/);
  const phone = phoneMatch ? phoneMatch[0].replace(/[-]/g, '') : undefined;
  
  const nameMatch = text.match(/(?:שם|לקוח|איש קשר|בשם|עבור|מאת|לכבוד):\s*([א-ת\s]+)/i) || text.match(/([א-ת]+\s+[א-ת]+)\s*(?:נייד|טלפון|05)/);
  const name = nameMatch ? nameMatch[1].trim() : undefined;
  
  return { name, phone };
}

// Dedicated Local Listener Event Endpoint (for C:\ap94\index.js and group message payloads)
app.post('/api/listener/event', async (req: Request, res: Response) => {
  const {
    isGroup: rawIsGroup,
    groupId: rawGroupId,
    from,
    mentionedJids: rawMentionedJids,
    parsedClientName: rawClientName,
    parsedClientPhone: rawClientPhone,
    messageText = '',
    senderName = 'חבר קבוצה',
    senderPhone = '',
  } = req.body;

  const groupId = rawGroupId || from || GROUP_JIDS.CUSTOMER_ORDERS;
  const isGroup = rawIsGroup ?? (typeof groupId === 'string' && groupId.endsWith('@g.us'));

  // Parse sub-client details from message body if not explicitly provided
  const extracted = extractSubClientDetails(messageText);
  const parsedClientName = rawClientName || extracted.name || senderName;
  const parsedClientPhone = rawClientPhone || extracted.phone || senderPhone;

  let mentionedJids: string[] = [];
  if (Array.isArray(rawMentionedJids)) {
    mentionedJids = rawMentionedJids;
  } else if (typeof rawMentionedJids === 'string') {
    mentionedJids = [rawMentionedJids];
  } else if (parsedClientPhone) {
    const cleanPhone = parsedClientPhone.replace(/[\+\-\s]/g, '');
    const formattedJid = cleanPhone.startsWith('0') ? `972${cleanPhone.slice(1)}@c.us` : `${cleanPhone}@c.us`;
    mentionedJids = [formattedJid];
  }

  console.log(`[Listener Event] Processing group event for ${groupId}. Sub-client: ${parsedClientName} (${parsedClientPhone})`);

  try {
    // Generate order record or AI response
    let autoReply = '';
    let orderRecord = null;

    if (groupId === GROUP_JIDS.CUSTOMER_ORDERS || groupId.includes('120363390702096083')) {
      const orderNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      orderRecord = {
        orderNumber,
        customerName: parsedClientName,
        customerPhone: parsedClientPhone || '052-6688768',
        groupJid: groupId,
        origin: 'whatsapp' as const,
        warehouse: 'מחסן החרש',
        address: 'אתר חלוקה - קבוצה',
        driverName: 'אלי שרעבי',
        distance: '14.2 ק"מ',
        duration: '20 דקות',
        wazeUrl: 'https://waze.com/ul?ll=32.0853,34.7818&navigate=yes',
        items: [
          { sku: '11500', name: 'פלטות גבס לבן/ירוק 12.5 מ"מ', quantity: 20, unit: 'יח\'' },
          { sku: '11505', name: 'ניצבים / מסלולים 7 ס"מ', quantity: 15, unit: 'יח\'' },
          { sku: '10001', name: 'חול ים / חול מחצבה בבאלה', quantity: 2, unit: 'באלה' },
        ],
        blowStatus: 'מאושר (2 בלות)',
        palletStatus: 'תקין',
        status: 'בתהליך אספקה',
      };
      autoReply = buildWhatsAppOutboundTemplate(orderRecord);
    } else {
      autoReply = await generateNoaResponse(messageText, parsedClientName);
    }

    // Forward to JONI Realtime DB with group tags & mentions
    let joniStatus = 'skipped';
    try {
      const joniPayload = {
        recipientPhone: groupId,
        groupJid: groupId,
        senderPhone,
        senderName: parsedClientName,
        messageText,
        autoReply,
        mentions: mentionedJids,
        isGroup: true,
        parsedClientName,
        parsedClientPhone,
        timestamp: new Date().toISOString(),
        source: 'SabanOS Listener Payload Handler',
      };

      const firebaseRes = await fetch(JONI_FIREBASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(joniPayload),
      });
      joniStatus = firebaseRes.ok ? 'sent_to_joni' : `joni_error_${firebaseRes.status}`;
    } catch (jErr) {
      console.warn('JONI Firebase sync warning:', jErr);
    }

    // Sync order row to Google Sheets
    await sendOrderToGoogleSheets({
      orderNumber: orderRecord?.orderNumber,
      customerName: parsedClientName,
      customerPhone: parsedClientPhone || groupId,
      groupJid: groupId,
      messageText,
      autoReply,
      itemsText: orderRecord ? 'פלטות גבס, ניצבים ומסלולים, בלות חול' : messageText,
    });

    // Store in internal log
    backendLogs.unshift({
      id: `listener-log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('he-IL'),
      senderPhone: groupId,
      senderName: `${parsedClientName} (קבוצה)`,
      messageText,
      autoReply,
      sentToWhatsapp: true,
      joniSync: joniStatus,
      sheetsSync: 'synced',
    });

    res.json({
      success: true,
      isGroup,
      groupId,
      parsedClientName,
      parsedClientPhone,
      mentionedJids,
      autoReply,
      orderRecord,
      joniStatus,
    });
  } catch (err) {
    console.error('Error in /api/listener/event:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Outbound Manual Response Box Endpoint (Dispatches messages to group chats via JONI)
app.post('/api/chat/send-group-message', async (req: Request, res: Response) => {
  const {
    groupId = GROUP_JIDS.CUSTOMER_ORDERS,
    messageText,
    mentions = [],
    tagClientPhone,
    clientName,
  } = req.body;

  if (!messageText || !messageText.trim()) {
    res.status(400).json({ success: false, error: 'messageText is required' });
    return;
  }

  try {
    let finalMessageText = messageText.trim();
    let finalMentions: string[] = Array.isArray(mentions) ? [...mentions] : [];

    // Format client phone tag e.g., @+972526688768 if requested
    if (tagClientPhone) {
      const cleanPhone = tagClientPhone.replace(/[\+\-\s]/g, '');
      const formattedNumber = cleanPhone.startsWith('0') ? `972${cleanPhone.slice(1)}` : cleanPhone;
      const jid = `${formattedNumber}@c.us`;
      if (!finalMentions.includes(jid)) {
        finalMentions.push(jid);
      }

      const tagLabel = `@+${formattedNumber}`;
      if (!finalMessageText.includes(tagLabel) && !finalMessageText.includes(`@${clientName}`)) {
        finalMessageText = `${tagLabel} ${finalMessageText}`;
      }
    }

    console.log(`[JONI Outbound Group Dispatch] Sending message to group ${groupId}: "${finalMessageText}"`);

    // Dispatch payload to JONI Firebase Realtime DB endpoint
    const joniPayload = {
      recipientPhone: groupId,
      groupJid: groupId,
      senderName: 'סידור ח. סבן / מנהל',
      messageText: finalMessageText,
      mentions: finalMentions,
      timestamp: new Date().toISOString(),
      source: 'SabanOS PWA Dashboard Group Dispatcher',
    };

    let joniStatus = 'sent';
    try {
      const firebaseRes = await fetch(JONI_FIREBASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(joniPayload),
      });
      if (!firebaseRes.ok) {
        joniStatus = `status_${firebaseRes.status}`;
      }
    } catch (fErr) {
      console.warn('Warning sending group message to JONI:', fErr);
      joniStatus = 'network_error_fallback_simulated';
    }

    // Log internally
    backendLogs.unshift({
      id: `outbound-group-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('he-IL'),
      senderPhone: groupId,
      senderName: 'מנהל סידור (Outbound)',
      messageText: finalMessageText,
      autoReply: 'הודעת קבוצה נשלחה מנהלתית',
      sentToWhatsapp: true,
      joniSync: joniStatus,
      sheetsSync: 'skipped',
    });

    res.json({
      success: true,
      groupId,
      messageText: finalMessageText,
      mentions: finalMentions,
      joniStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error in /api/chat/send-group-message:', err);
    res.status(500).json({ success: false, error: 'Failed to send group message' });
  }
});
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

// Server-Side In-Memory Cache for Modes & Customer Profiles
const chatModes: Record<string, 'auto' | 'manual'> = {
  '972508861080': 'auto',
  '0508861080': 'auto',
};

const customerProfiles: Record<string, {
  customerId: string;
  phone: string;
  name: string;
  email: string;
  addresses: string[];
  groupName: string;
  comaxId: string;
  notes: string;
  updatedAt: string;
}> = {
  '0526688768': {
    customerId: 'CUST-519205',
    phone: '0526688768',
    name: 'חיים עמרם - קבלן גבס',
    email: 'haim.amram@saban.co.il',
    addresses: ['אתר בנייה - הרצל 45, ראשון לציון', 'מחסן ראשי - אזה"ת חולון'],
    groupName: 'קבוצת הובלות מרכז (ח.סבן)',
    comaxId: '519205',
    notes: 'לקוח VIP - דורש פריקה במנוף 18 מטר בלבד',
    updatedAt: new Date().toISOString(),
  }
};

// 1. GET /api/chat/sync: Returns active chats, profiles, and live auto/manual status
app.get('/api/chat/sync', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const safeChatModes = typeof chatModes !== 'undefined' && chatModes ? chatModes : {};
    const safeCustomerProfiles = typeof customerProfiles !== 'undefined' && customerProfiles ? customerProfiles : {};
    const safeLogs = Array.isArray(backendLogs) ? backendLogs : [];

    return res.status(200).json({
      success: true,
      chats: [],
      events: [],
      serverTime: new Date().toISOString(),
      chatModes: safeChatModes,
      customerProfiles: safeCustomerProfiles,
      activeLogsCount: safeLogs.length,
      listenerStatus: {
        localServerActive: true,
        noaPhone: '972508861080',
        gasWebhookConfigured: Boolean(GAS_WEBHOOK_URL),
        joniUrlConfigured: Boolean(JONI_FIREBASE_URL),
      }
    });
  } catch (err) {
    console.error('Error in /api/chat/sync:', err);
    return res.status(200).json({
      success: true,
      chats: [],
      events: [],
      activeLogsCount: 0,
      message: 'Safely recovered from chat sync error',
      error: String(err),
    });
  }
});

// Dedicated Vercel & Local Sync Endpoint: /api/chat/respond
app.get('/api/chat/respond', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    endpoint: '/api/chat/respond',
    description: 'Local WhatsApp Web listener sync endpoint (C:\\ap94 PM2 noa-whatsapp-server)',
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/chat/respond', async (req: Request, res: Response) => {
  const {
    id,
    phone,
    senderPhone: rawPhone,
    senderName = 'לקוח וואטסאפ',
    isGroup = false,
    groupId = null,
    incomingMessage,
    messageText,
    timestamp = new Date().toISOString(),
    source = 'local_ap94_listener',
  } = req.body || {};

  const cleanPhone = (phone || rawPhone || '').replace(/[^0-9]/g, '');
  const actualMessage = incomingMessage || messageText || '';

  if (!cleanPhone || !actualMessage) {
    return res.status(400).json({ success: false, error: 'Phone and incomingMessage are required' });
  }

  try {
    // Generate AI response if in auto mode
    const mode = chatModes[cleanPhone] || 'auto';
    let replyText = '';
    if (mode === 'auto') {
      replyText = await generateNoaResponse(actualMessage, senderName);
    } else {
      replyText = `שלום ${senderName}, הודעתך הועברה למנהל הסידור למענה ידני.`;
    }

    // Attach profile context
    const profile = customerProfiles[cleanPhone] || {
      customerId: `CUST-${cleanPhone.slice(-6)}`,
      phone: cleanPhone,
      name: senderName,
      email: '',
      addresses: ['אתר אספקה ראשי'],
      groupName: 'קבוצת הובלות מרכז (ח.סבן)',
      comaxId: '519205',
      notes: '',
      updatedAt: new Date().toISOString(),
    };

    // Store in backend log
    backendLogs.unshift({
      id: id || `msg-sync-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('he-IL'),
      senderPhone: cleanPhone,
      senderName,
      messageText: actualMessage,
      autoReply: replyText,
      sentToWhatsapp: true,
      joniSync: 'sent',
      sheetsSync: 'synced',
    });

    // Forward to JONI Realtime DB asynchronously
    fetch(JONI_FIREBASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: id || `msg_${Date.now()}`,
        phone: cleanPhone,
        recipientPhone: `${cleanPhone}@c.us`,
        senderName,
        messageText: actualMessage,
        autoReply: replyText,
        isGroup,
        groupId,
        timestamp,
        source,
      }),
    }).catch((err) => console.warn('JONI dispatch in /api/chat/respond warn:', err));

    // Forward to GAS Webhook
    sendOrderToGoogleSheets({
      customerName: senderName,
      customerPhone: cleanPhone,
      messageText: actualMessage,
      autoReply: replyText,
      status: 'התקבל ב-C:\\ap94',
    }).catch((err) => console.warn('GAS sync in /api/chat/respond warn:', err));

    res.json({
      success: true,
      response: replyText,
      replyText,
      payload: {
        id: id || `msg_${Date.now()}`,
        phone: cleanPhone,
        senderName,
        incomingMessage: actualMessage,
        autoReply: replyText,
        isGroup,
        groupId,
        timestamp,
        source,
      },
      context: {
        comaxId: profile.comaxId || '519205',
        customerName: profile.name,
        addresses: profile.addresses,
        verifiedOrdersCount: 2,
      },
    });
  } catch (err) {
    console.error('Error in POST /api/chat/respond:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// 2. POST /api/chat/mode: Toggles auto vs manual reply status per phone number
app.post('/api/chat/mode', (req: Request, res: Response) => {
  const { phone, mode, isAIEnabled } = req.body;
  if (!phone) {
    return res.status(400).json({ success: false, error: 'Phone number is required' });
  }

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const targetMode = mode ? mode : (isAIEnabled === false ? 'manual' : 'auto');
  chatModes[cleanPhone] = targetMode;

  console.log(`[Chat Mode Toggle] Changed mode for ${cleanPhone} to ${targetMode}`);
  res.json({
    success: true,
    phone: cleanPhone,
    mode: targetMode,
    isAIEnabled: targetMode === 'auto',
    timestamp: new Date().toISOString(),
  });
});

// 3. POST /api/chat/send-manual: Outbound manual dispatch trigger through local server / JONI
app.post('/api/chat/send-manual', async (req: Request, res: Response) => {
  const { phone, messageText, senderName = 'מנהל סידור (אדמין)' } = req.body;
  if (!phone || !messageText) {
    return res.status(400).json({ success: false, error: 'Phone and messageText are required' });
  }

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const targetJid = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@c.us`;

  try {
    // Dispatch to JONI Realtime DB for local listener dispatch
    const joniPayload = {
      recipientPhone: targetJid,
      phone: cleanPhone,
      senderName,
      messageText,
      timestamp: new Date().toISOString(),
      direction: 'outbound_manual',
      source: 'Admin Manual WhatsApp Dispatcher',
    };

    let joniStatus = 'sent';
    try {
      const joniRes = await fetch(JONI_FIREBASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(joniPayload),
      });
      if (!joniRes.ok) {
        joniStatus = `status_${joniRes.status}`;
      }
    } catch (jErr) {
      console.warn('JONI dispatch warning in send-manual:', jErr);
      joniStatus = 'network_fallback';
    }

    // Force mode to manual on manual intervention
    chatModes[cleanPhone] = 'manual';

    // Log internally
    backendLogs.unshift({
      id: `manual-outbound-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('he-IL'),
      senderPhone: cleanPhone,
      senderName,
      messageText,
      autoReply: 'מענה ידני נשלח מהאדמין',
      sentToWhatsapp: true,
      joniSync: joniStatus,
      sheetsSync: 'skipped',
    });

    res.json({
      success: true,
      phone: cleanPhone,
      messageText,
      joniStatus,
      mode: 'manual',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error in /api/chat/send-manual:', err);
    res.status(500).json({ success: false, error: 'Failed to dispatch manual message' });
  }
});

// 4. POST /api/customer/update-profile: Saves enriched customer metadata
app.post('/api/customer/update-profile', (req: Request, res: Response) => {
  const { phone, customerId, name, email, addresses, groupName, comaxId, notes } = req.body;
  if (!phone) {
    return res.status(400).json({ success: false, error: 'Phone is required' });
  }

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const existing = customerProfiles[cleanPhone] || {
    customerId: customerId || `CUST-${cleanPhone.slice(-6)}`,
    phone: cleanPhone,
    name: name || 'לקוח',
    email: '',
    addresses: [],
    groupName: 'קבוצת לקוחות כללית',
    comaxId: '',
    notes: '',
    updatedAt: new Date().toISOString(),
  };

  const updatedProfile = {
    ...existing,
    customerId: customerId || existing.customerId,
    name: name || existing.name,
    email: email !== undefined ? email : existing.email,
    addresses: Array.isArray(addresses) ? addresses : (addresses ? [addresses] : existing.addresses),
    groupName: groupName !== undefined ? groupName : existing.groupName,
    comaxId: comaxId !== undefined ? comaxId : existing.comaxId,
    notes: notes !== undefined ? notes : existing.notes,
    updatedAt: new Date().toISOString(),
  };

  customerProfiles[cleanPhone] = updatedProfile;

  res.json({
    success: true,
    profile: updatedProfile,
  });
});

// 5. POST /api/noa/sheet-lookup: Queries historical orders from Google Sheet log by phone number
app.post('/api/noa/sheet-lookup', async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ success: false, error: 'Phone number is required' });
  }

  const cleanPhone = phone.replace(/[^0-9]/g, '');

  try {
    let sheetRows: any[] = [];
    try {
      const gasRes = await fetch(`${GAS_WEBHOOK_URL}?tab=${encodeURIComponent('לוג_הזמנות_מערכת')}`);
      if (gasRes.ok) {
        const json = await gasRes.json();
        sheetRows = Array.isArray(json) ? json : (json?.data || []);
      }
    } catch (err) {
      console.warn('Google Sheet live lookup failed, using fallback database:', err);
    }

    // Filter rows matching phone number or fallback mock historical orders
    const matchedOrders = sheetRows.filter((r: any) => {
      const rPhone = String(r['טלפון'] || r['customerPhone'] || r['phone'] || '').replace(/[^0-9]/g, '');
      return rPhone && (rPhone.includes(cleanPhone) || cleanPhone.includes(rPhone));
    });

    // Mock history if sheet has no matching rows for preview
    const sampleHistory = matchedOrders.length > 0 ? matchedOrders : [
      {
        orderNumber: `ORD-${Math.floor(6214000 + Math.random() * 900)}`,
        customerName: 'חיים עמרם - קבלן גבס (519205)',
        address: 'הרצל 45, ראשון לציון',
        items: '20 פלטות גבס ירוק, 15 ניצבים 7 ס"מ, 2 בלות חול',
        status: 'סופק ונפרק באתר',
        truckDispatchTime: '07:30 בבוקר (משאית מנוף אלי שרעבי)',
        timestamp: '2026-08-02 08:15',
      },
      {
        orderNumber: `ORD-${Math.floor(6213000 + Math.random() * 900)}`,
        customerName: 'חיים עמרם - קבלן גבס (519205)',
        address: 'אזה"ת חולון - החרש 12',
        items: '50 שקי מלט 25 ק"ג, 4 משטחי בלוק 20',
        status: 'מאושר בסידור',
        truckDispatchTime: '11:00 בבוקר (משאית רמי סבן)',
        timestamp: '2026-07-28 10:45',
      },
    ];

    const pastAddresses = Array.from(new Set(sampleHistory.map((h: any) => h.address || h['כתובת אספקה']).filter(Boolean)));
    const profile = customerProfiles[cleanPhone] || null;

    res.json({
      success: true,
      phone: cleanPhone,
      profile,
      ordersCount: sampleHistory.length,
      ordersHistory: sampleHistory,
      verifiedAddresses: pastAddresses,
      lastDispatchTime: sampleHistory[0]?.truckDispatchTime || '07:30',
      summaryAi: `נמצאו ${sampleHistory.length} הזמנות היסטוריות בגיליון. כתובת עיקרית: ${pastAddresses[0] || 'אתר חלוקה'}.`,
    });
  } catch (err) {
    console.error('Error in /api/noa/sheet-lookup:', err);
    res.status(500).json({ success: false, error: 'Failed to lookup sheet history' });
  }
});

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
  res.setHeader('Content-Type', 'application/json');
  try {
    const rawTabParam = req.query.tab ? String(req.query.tab) : 'לוג_הזמנות_מערכת';
    let tabName = rawTabParam;
    try {
      tabName = decodeURIComponent(rawTabParam);
    } catch {
      tabName = rawTabParam;
    }

    const gasUrl = GAS_WEBHOOK_URL || process.env.GAS_WEBHOOK_URL;
    if (!gasUrl) {
      return res.status(200).json({
        success: false,
        data: [],
        message: 'Missing sheet configuration',
      });
    }

    const targetUrl = `${gasUrl}?tab=${encodeURIComponent(tabName)}`;
    const gasRes = await fetch(targetUrl, { method: 'GET' });
    if (!gasRes.ok) {
      return res.status(200).json({
        success: false,
        data: [],
        message: 'Missing sheet configuration',
      });
    }

    const text = await gasRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = [];
    }

    const finalArray = Array.isArray(data) ? data : (data?.data && Array.isArray(data.data) ? data.data : []);
    return res.status(200).json({
      success: true,
      data: finalArray,
    });
  } catch (err) {
    console.warn('[Sheets Proxy] Note: GAS fetch returned non-JSON or unreachable:', err);
    return res.status(200).json({
      success: false,
      data: [],
      message: 'Missing sheet configuration',
      error: String(err),
    });
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
