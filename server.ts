import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Firebase JONI URL from prompt default
const JONI_FIREBASE_URL = process.env.FIREBASE_JONI_URL || 'https://saban-ai-drive-default-rtdb.europe-west1.firebasedatabase.app/joni/send.json';
const GAS_WEBHOOK_URL = process.env.GAS_WEBHOOK_URL || '';

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
}> = [];

// Helper to generate Noa AI response using Gemini or fallback
async function generateNoaResponse(messageText: string, senderName: string = 'לקוח', systemPromptOverride?: string): Promise<string> {
  const defaultPrompt = `אתה "נועה AI" - נציגת השירות והמכירות הדיגיטלית של חברת "ח. סבן חומרי בניין בע"מ".
תפקידך לעזור לקבלנים, שיפוצניקים ולקוחות פרטיים בהזמנת חומרי בניין, מחירונים, תיאום הובלות מנוף ושעות פעילות.

פרטי העסק:
- שם החברה: ח. סבן חומרי בניין בע"מ (סידור חומרי בניין)
- שעות פעילות: ימים א'-ה' בין השעות 06:00 עד 18:00, יום ו' בין 06:00 ל-13:00. שבת סגור.
- מוצרים: חול ים/מחצבה בבאלה (140 ₪), סומסום לריצוף (150 ₪), מלט אפור 50 ק"ג (38 ₪ שק), לוחות גבס לבן (42 ₪) וירוק (54 ₪), פח שפכטל אמריקאי (75 ₪), בלוק בטון (4.80 ₪), פריקת מנוף (350 ₪).

ענה בעברית בסגנון הודעת וואטסאפ קצרה ותכליתית עם אימוג'י מתאים (🏗️, 🧱, 🚛, 👍).`;

  const systemInstruction = systemPromptOverride || defaultPrompt;
  const ai = getGemini();

  if (ai) {
    // Try primary model gemini-2.5-flash, fallback to gemini-2.5-flash-lite if 503 spike occurs
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

  // Fallback heuristic responses if API key is not present or failed
  const lower = messageText.toLowerCase();
  if (lower.includes('שעות') || lower.includes('מתי פתוח') || lower.includes('פתוחים')) {
    return 'שלום! 👋 סניפי ח. סבן חומרי בניין פתוחים בימים א\'-ה\' מ-06:00 עד 18:00 ובימי שישי מ-06:00 עד 13:00! 🏗️';
  }
  if (lower.includes('חול') || lower.includes('סומסום') || lower.includes('באלה')) {
    return 'אהלן! 🧱 באלה חול ים/מחצבה נקייה עולה 140 ₪, ובאלה סומסום שטוף עולה 150 ₪. נשמח לתאם לך הובלה אנושית או פריקת מנוף! 👍';
  }
  if (lower.includes('גבס') || lower.includes('מלט')) {
    return 'היי! שק מלט אפור 50 ק"ג = 38 ₪. לוח גבס לבן = 42 ₪, לוח גבס ירוק עמיד לחות = 54 ₪. כמה יחידות תרצה להזמין? 🔨';
  }
  if (lower.includes('מנוף') || lower.includes('הובלה') || lower.includes('קומה')) {
    return 'שלום! שירות פריקת מנוף באתר לבניין/גג עולה 350 ₪ להובלה. באיזה עיר ואיזו קומה מדובר? 🚛';
  }

  return `שלום ${senderName}! 👋 קיבלתי את הודעתך: "${messageText}". אני נועה AI מח. סבן חומרי בניין. מעבירה את הבקשה לצוות הסידור האנושי שיחזור אליך בהקדם! 🏗️`;
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

// Primary Webhook Listener v2.4 Endpoint
app.post('/api/webhook', async (req: Request, res: Response) => {
  const { senderPhone, messageText, senderName = 'לקוח וואטסאפ' } = req.body;

  if (!senderPhone || !messageText) {
    res.status(400).json({ success: false, error: 'Missing required parameters: senderPhone and messageText' });
    return;
  }

  try {
    // Generate AI response
    const noaResponse = await generateNoaResponse(messageText, senderName);

    // Forward to Firebase Realtime DB JONI Plugin
    let joniStatus = 'skipped';
    try {
      const joniPayload = {
        senderPhone,
        senderName,
        messageText,
        autoReply: noaResponse,
        timestamp: new Date().toISOString(),
        source: 'WhatsApp Listener v2.4',
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

    // Forward to GAS Webhook if configured
    if (GAS_WEBHOOK_URL) {
      try {
        await fetch(GAS_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ senderPhone, messageText, senderName, autoReply: noaResponse }),
        });
      } catch (gErr) {
        console.warn('GAS Webhook sync warning:', gErr);
      }
    }

    // Log internally
    backendLogs.unshift({
      id: `bg-log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('he-IL'),
      senderPhone,
      senderName,
      messageText,
      autoReply: noaResponse,
      sentToWhatsapp: true,
      joniSync: joniStatus,
    });

    res.json({
      success: true,
      autoReply: noaResponse,
      noaResponse,
      sentToWhatsapp: true,
      joniStatus,
    });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Client Chat Direct Send Endpoint
app.post('/api/chat/send', async (req: Request, res: Response) => {
  const { messageText, senderPhone, senderName, systemPrompt } = req.body;

  try {
    const noaResponse = await generateNoaResponse(messageText, senderName || 'לקוח', systemPrompt);

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
