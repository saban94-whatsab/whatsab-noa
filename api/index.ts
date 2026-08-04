import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { processIncomingNoaMessage, isStoreInquiryOnly, detectMissingOrderDetails, generateNoaPromptWithContext, SYSTEM_CONFIG } from '../src/utils/noaEngine';

dotenv.config();

const app = express();
app.use(express.json());

const JONI_FIREBASE_URL = process.env.FIREBASE_JONI_URL || 'https://saban-ai-drive-default-rtdb.europe-west1.firebasedatabase.app/joni/send.json';
const GAS_WEBHOOK_URL = process.env.GAS_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbyQUaDDWSiG6osVHQ8ZQEdXqVNBFFoaFcLxr6iJvJYZpsc8TSfQ_wjvc5HMtKyLsyG80A/exec';

const GROUP_JIDS = {
  UPDATES_ALERTS: '120363428842730390@g.us',
  CUSTOMER_ORDERS: '120363390702096083@g.us',
};

let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
  }
  return aiClient;
}

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

async function generateNoaResponse(
  messageText: string,
  senderName: string = 'לקוח',
  mediaType?: 'image' | 'document' | 'vcf' | 'location' | 'sticker' | null,
  location?: any
): Promise<string> {
  const engineResult = processIncomingNoaMessage({
    sender: senderName,
    text: messageText,
    mediaType: mediaType || null,
    location,
  });

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

  const ai = getGemini();
  if (ai) {
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: `שם הלקוח: ${senderName}\nהודעת הלקוח: "${messageText}"`,
          config: { systemInstruction: defaultPrompt, temperature: 0.7 },
        });
        if (response.text) return response.text.trim();
      } catch (err) {
        console.warn(`Vercel API ${modelName} issue:`, err);
      }
    }
  }

  return engineResult.replyText;
}

async function sendOrderToGoogleSheets(payloadData: any) {
  const targetWebhookUrl = payloadData.customWebhookUrl || GAS_WEBHOOK_URL || process.env.GAS_WEBHOOK_URL;
  if (!targetWebhookUrl) {
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
    return { success: true, status: res.status, resultText };
  } catch (err) {
    console.error('GAS Webhook sync error:', err);
    return { success: false, error: String(err) };
  }
}

app.all('/api/health', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    status: 'online',
    system: 'סידור / נועה AI - ח. סבן חומרי בניין (Vercel Serverless Function)',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/chat/sync', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    return res.status(200).json({
      success: true,
      chats: [],
      events: [],
      serverTime: new Date().toISOString(),
      chatModes: { '0508861080': 'auto' },
      customerProfiles: {},
      activeLogsCount: 0,
      listenerStatus: {
        localServerActive: true,
        noaPhone: '972508861080',
        gasWebhookConfigured: Boolean(GAS_WEBHOOK_URL),
        joniUrlConfigured: Boolean(JONI_FIREBASE_URL),
      }
    });
  } catch (err) {
    console.error('Error in Vercel /api/chat/sync:', err);
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
    console.warn('[Vercel Sheets Proxy] GAS fetch note:', err);
    return res.status(200).json({
      success: false,
      data: [],
      message: 'Missing sheet configuration',
      error: String(err),
    });
  }
});

app.get('/api/chat/respond', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    endpoint: '/api/chat/respond',
    description: 'Vercel Express Sync Endpoint for Saban-94 WhatsApp Listener (C:\\ap94)',
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/chat/respond', async (req: Request, res: Response) => {
  const {
    id,
    phone,
    senderPhone: rawSenderPhone,
    senderName = 'לקוח וואטסאפ',
    isGroup = false,
    groupId = null,
    incomingMessage,
    messageText,
    timestamp = new Date().toISOString(),
    source = 'local_ap94_listener',
  } = req.body || {};

  const cleanPhone = (phone || rawSenderPhone || '').replace(/[^0-9]/g, '');
  const actualMessage = incomingMessage || messageText || '';

  if (!cleanPhone || !actualMessage) {
    return res.status(400).json({ success: false, error: 'Phone and incomingMessage are required' });
  }

  const replyText = await generateNoaResponse(actualMessage, senderName);

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
      comaxId: '519205',
      customerName: senderName,
      addresses: ['הרצל 45, ראשון לציון', 'אזה"ת חולון'],
    },
  });
});

app.post('/api/webhook', async (req: Request, res: Response) => {
  const { senderPhone, recipientPhone, phone, to, groupJid, messageText, senderName = 'לקוח וואטסאפ', origin = 'whatsapp' } = req.body;
  const targetJid = groupJid || recipientPhone || phone || to || senderPhone;

  if (!targetJid || !messageText) {
    res.status(400).json({ success: false, error: 'targetJid and messageText required' });
    return;
  }

  const isCustomerGroup = targetJid === GROUP_JIDS.CUSTOMER_ORDERS || String(targetJid).includes('120363390702096083');
  let autoReply = '';
  let orderRecord = null;

  if (isCustomerGroup) {
    const parsedItems = [
      { sku: '10002', name: 'שק מלט אפור 50 ק"ג', quantity: 80, unit: 'שק' },
      { sku: '10001', name: 'חול ים / חול מחצבה בבאלה', quantity: 4, unit: 'באלה' },
    ];
    orderRecord = {
      orderNumber: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
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
    autoReply = buildWhatsAppOutboundTemplate(orderRecord);
  } else {
    autoReply = await generateNoaResponse(messageText, senderName);
  }

  try {
    sendOrderToGoogleSheets({
      orderNumber: orderRecord?.orderNumber,
      customerName: senderName,
      customerPhone: senderPhone || String(targetJid),
      groupJid: String(targetJid),
      address: orderRecord?.address,
      warehouse: orderRecord?.warehouse,
      itemsText: orderRecord?.items ? orderRecord.items.map((i: any) => `${i.name} (${i.quantity} ${i.unit})`).join(', ') : undefined,
      items: orderRecord?.items,
      messageText,
      autoReply,
      status: orderRecord?.status || 'התקבל',
    }).catch(() => {});

    await fetch(JONI_FIREBASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientPhone: targetJid,
        groupJid: targetJid,
        senderPhone,
        senderName,
        messageText,
        autoReply,
        timestamp: new Date().toISOString(),
        source: 'SabanOS JONI Engine v3.0 (Vercel)',
      }),
    });
  } catch (err) {
    console.warn('JONI Sync warn:', err);
  }

  res.json({
    success: true,
    autoReply,
    noaResponse: autoReply,
    sentToWhatsapp: true,
    orderRecord,
  });
});

app.post('/api/google-sheets/sync', async (req: Request, res: Response) => {
  try {
    const result = await sendOrderToGoogleSheets(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to sync to Google Sheets' });
  }
});

app.post('/api/template/outbound', (req: Request, res: Response) => {
  try {
    const formattedText = buildWhatsAppOutboundTemplate(req.body);
    res.json({ success: true, formattedText });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Template generation error' });
  }
});

export default app;
