import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(express.json());

const JONI_FIREBASE_URL = process.env.FIREBASE_JONI_URL || 'https://saban-ai-drive-default-rtdb.europe-west1.firebasedatabase.app/joni/send.json';
const GAS_WEBHOOK_URL = process.env.GAS_WEBHOOK_URL || '';

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

async function generateNoaResponse(messageText: string, senderName: string = 'לקוח'): Promise<string> {
  const defaultPrompt = `אתה "נועה AI" - נציגת השירות והמכירות הדיגיטלית של חברת "ח. סבן חומרי בניין בע"מ".
תפקידך לעזור לקבלנים, שיפוצניקים ולקוחות פרטיים בהזמנת חומרי בניין, מחירונים, תיאום הובלות מנוף ושעות פעילות.

פרטי העסק:
- שם החברה: ח. סבן חומרי בניין בע"מ
- שעות פעילות: א'-ה' 06:00-18:00, ו' 06:00-13:00. שבת סגור.
- מוצרים: חול ים/מחצבה בבאלה (140 ₪), סומסום לריצוף (150 ₪), מלט אפור 50 ק"ג (38 ₪ שק), לוחות גבס לבן (42 ₪) וירוק (54 ₪), פח שפכטל (75 ₪), בלוק בטון (4.80 ₪), פריקת מנוף (350 ₪).

ענה בעברית בסגנון הודעת וואטסאפ קצרה עם אימוג'י מתאים (🏗️, 🧱, 🚛, 👍).`;

  const ai = getGemini();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `שם הלקוח: ${senderName}\nהודעת הלקוח: "${messageText}"`,
        config: { systemInstruction: defaultPrompt, temperature: 0.7 },
      });
      if (response.text) return response.text.trim();
    } catch (err) {
      console.error('Vercel API Gemini error:', err);
    }
  }

  const lower = messageText.toLowerCase();
  if (lower.includes('שעות') || lower.includes('פתוח')) {
    return 'שלום! 👋 סניפי ח. סבן פתוחים בימים א\'-ה\' מ-06:00 עד 18:00 ובימי שישי מ-06:00 עד 13:00! 🏗️';
  }
  if (lower.includes('חול') || lower.includes('סומסום') || lower.includes('באלה')) {
    return 'אהלן! 🧱 באלה חול ים/מחצבה עולה 140 ₪, ובאלה סומסום שטוף עולה 150 ₪. נשמח לתאם פריקת מנוף! 👍';
  }
  return `שלום ${senderName}! 👋 קיבלתי את הודעתך: "${messageText}". אני נועה AI מח. סבן חומרי בניין. מעבירה לצוות הסידור האנושי שיחזור אליך בהקדם! 🏗️`;
}

app.all('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    system: 'סידור / נועה AI - ח. סבן חומרי בניין (Vercel Serverless Function)',
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/webhook', async (req: Request, res: Response) => {
  const { senderPhone, messageText, senderName = 'לקוח וואטסאפ' } = req.body;
  if (!senderPhone || !messageText) {
    res.status(400).json({ success: false, error: 'senderPhone and messageText required' });
    return;
  }

  const autoReply = await generateNoaResponse(messageText, senderName);

  try {
    await fetch(JONI_FIREBASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderPhone,
        senderName,
        messageText,
        autoReply,
        timestamp: new Date().toISOString(),
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
  });
});

export default app;
