/**
 * ====================================================================================
 *  ח. סבן חומרי בניין בע"מ - שרת לוגיסטיקת WhatsApp ואוטומציה 24/7 (נועה AI)
 *  קובץ ראשי: index.js (עבור C:\ap94\index.js)
 *  מבוסס: whatsapp-web.js, Express, Axios ו-LocalAuth לחיבור פקטור קבוע
 * ====================================================================================
 * 
 * 📌 הוראות התקנה והרצה כשירויות Windows בלתי פוסקת באמצעות PM2:
 * ------------------------------------------------------------------------------------
 * 1. פתח CMD / PowerShell כמנהל מערכת (Administrator) בתיקייה C:\ap94
 * 2. התקן תלויות פרויקט:
 *      npm install whatsapp-web.js express axios dotenv qrcode-terminal
 * 3. התקן PM2 ושירות Windows לגלגול אוטומטי בהפעלה מחדש של השרת:
 *      npm install -g pm2 pm2-windows-service
 * 4. הפעל את השרת בפעם הראשונה וסרוק את קוד ה-QR עבור מספר נועה (+972508861080):
 *      node index.js
 * 5. לאחר חיבור מוצלח, רשום את התהליך ב-PM2:
 *      pm2 start index.js --name "noa-whatsapp-server"
 *      pm2 save
 *      pm2-service-install -n PM2
 * ====================================================================================
 */

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

// ------------------------------------------------------------------------------------
// 1. הגדרת קונפיגורציה ומשתני סביבה
// ------------------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
const NOA_PHONE = process.env.NOA_PHONE_NUMBER || '972508861080';
const GAS_WEBHOOK_URL = process.env.GAS_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbyQUaDDWSiG6osVHQ8ZQEdXqVNBFFoaFcLxr6iJvJYZpsc8TSfQ_wjvc5HMtKyLsyG80A/exec';
const VERCEL_APP_URL = process.env.VERCEL_APP_URL || process.env.APP_URL || 'https://ais-dev-mxen265no7il3qqsmbdkhq-387808436292.europe-west2.run.app';
const FIREBASE_JONI_URL = process.env.FIREBASE_JONI_URL || 'https://saban-ai-drive-default-rtdb.europe-west1.firebasedatabase.app/joni/send.json';

console.log('🚀 [NOA_AI SERVER] מתחיל לעלות...');
console.log(`📌 מספר מוגדר עבור נועה: +${NOA_PHONE}`);
console.log(`🔗 GAS Webhook: ${GAS_WEBHOOK_URL ? 'מוגדר' : 'לא מוגדר'}`);
console.log(`🔗 Vercel/PWA App: ${VERCEL_APP_URL}`);

// ------------------------------------------------------------------------------------
// 2. אתחול לקוח WhatsApp Web עם LocalAuth ודפדפן Headless יציב
// ------------------------------------------------------------------------------------
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'noa-whatsapp-session',
    dataPath: './.wwebjs_auth', // שמירת Session קבועה למניעת ניתוקים בהפעלה מחדש
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--single-process',
    ],
  },
});

// ------------------------------------------------------------------------------------
// 3. אירועי לייף-סייקל של WhatsApp (QR, Ready, Disconnected)
// ------------------------------------------------------------------------------------

// הדפסת QR Code לסריקה בטרמינל
client.on('qr', (qr) => {
  console.log('\n========================================================');
  console.log('📱 אנא סרוק את קוד ה-QR הבא באמצעות הוואטסאפ של נועה:');
  console.log('========================================================\n');
  qrcode.generate(qr, { small: true });
});

// אישור חיבור מוצלח
client.on('ready', () => {
  console.log('\n✅ [NOA_AI ONLINE] השרת מחובר בהצלחה לוואטסאפ ומוכן לקבלת הודעות 24/7!');
  console.log(`📞 מחובר כמספר: ${client.info?.wid?.user || NOA_PHONE}\n`);
});

// טיפול בניתוקים ואחזור חיבור אוטומטי (Self-Healing)
client.on('disconnected', async (reason) => {
  console.warn(`⚠️ [NOA_AI WARNING] השרת נותק מוואטסאפ! סיבה: ${reason}`);
  console.log('🔄 מנסה לאתחל ולהתחבר מחדש באופן אוטומטי...');
  try {
    await client.destroy();
  } catch (e) {
    // להתעלם מכישלון בסגירה
  }
  setTimeout(() => {
    client.initialize().catch((err) => {
      console.error('❌ [NOA_AI ERROR] נכשל ניסיון התחברות מחדש:', err);
    });
  }, 5000);
});

// טיפול בכישלון אימות
client.on('auth_failure', (msg) => {
  console.error('❌ [NOA_AI AUTH ERROR] כישלון באימות WhatsApp Session:', msg);
});

// ------------------------------------------------------------------------------------
// 4. פייפליין קליטה וטיפול בהודעות נכנסות (client.on('message'))
// ------------------------------------------------------------------------------------
client.on('message', async (msg) => {
  try {
    // סינון: התעלמות מהודעות שנשלחו על ידי נועה עצמה
    if (msg.fromMe) return;

    // ניקוי וחילוף נתונים מההודעה
    const rawSender = msg.from || '';
    const cleanPhone = rawSender.replace('@c.us', '').replace('@g.us', '').replace(/[^0-9]/g, '');
    const isGroup = msg.from.endsWith('@g.us');
    const incomingText = msg.body || '';
    const timestamp = msg.timestamp ? new Date(msg.timestamp * 1000).toISOString() : new Date().toISOString();

    // קבלת שם איש הקשר
    let senderName = 'לקוח';
    try {
      const contact = await msg.getContact();
      senderName = contact.pushname || contact.name || contact.number || cleanPhone;
    } catch (e) {
      senderName = cleanPhone;
    }

    console.log(`\n📩 [הודעה נכנסת] מ: ${senderName} (${cleanPhone}) | קבוצה: ${isGroup ? 'כן' : 'לא'}`);
    console.log(`💬 תוכן: "${incomingText}"`);

    // מבנה Payload אחיד לסינכרון Webhooks
    const payload = {
      phone: cleanPhone,
      senderName: senderName,
      isGroup: isGroup,
      chatJid: msg.from,
      incomingMessage: incomingText,
      timestamp: timestamp,
      source: 'NOA_LOCAL_LISTENER_V2',
    };

    // א. שידור מקביל 1: שליחה ל-Google Apps Script (GAS) Webhook
    if (GAS_WEBHOOK_URL) {
      axios.post(GAS_WEBHOOK_URL, payload, { timeout: 8000 }).catch((err) => {
        console.warn('⚠️ [GAS WEBHOOK ERROR] נכשל סינכרון ל-Google Apps Script:', err.message);
      });
    }

    // ב. שידור מקביל 2: שליחה לשרת Vercel / PWA Dashboard לעדכון UI בזמן אמת
    let generatedResponse = null;
    if (VERCEL_APP_URL) {
      try {
        const dashboardRes = await axios.post(`${VERCEL_APP_URL.replace(/\/$/, '')}/api/chat/respond`, payload, {
          timeout: 10000,
        });
        if (dashboardRes.data && dashboardRes.data.replyText) {
          generatedResponse = dashboardRes.data.replyText;
        }
      } catch (err) {
        console.warn('⚠️ [VERCEL SYNC WARNING] לא התקבלה תשובה מ-Vercel Dashboard Endpoint, נעשה שימוש במנוע הגיבוי:', err.message);
      }
    }

    // אם Vercel לא החזיר תשובה, מייצרים תשובת ברירת מחדל אנושית וקצרה (חוק הפרופורציונליות)
    if (!generatedResponse) {
      const lowerText = incomingText.trim().toLowerCase();
      if (['היי', 'שלום', 'אהלן', 'בוקר טוב', 'ערב טוב', 'מה נשמע'].some((g) => lowerText.startsWith(g))) {
        generatedResponse = `היי! בוקר טוב, במה אפשר לעזור היום בח. סבן? 👋`;
      } else {
        generatedResponse = `קיבלתי את ההודעה! 👍 מעביר/ה לבדיקה מול צוות סידור ההובלות.`;
      }
    }

    // ג. השהיה אנושית (Humanized Typing Delay) של 2-3 שניות למניעת זיהוי רובוטי
    const typingDelay = Math.floor(Math.random() * 1000) + 2000; // 2000ms - 3000ms
    console.log(`⏳ [השהיה אנושית] ממתין ${(typingDelay / 1000).toFixed(1)} שניות לפני מענה...`);
    await new Promise((resolve) => setTimeout(resolve, typingDelay));

    // ד. שליחת המענה ללקוח ב-WhatsApp
    await client.sendMessage(msg.from, generatedResponse);
    console.log(`🤖 [NOA_AI SUCCESS] נועה השיבה בהצלחה ל-${senderName} (${cleanPhone})!`);

    // ה. עדכון גיבוי ב-Firebase JONI Realtime DB במידה ומוגדר
    if (FIREBASE_JONI_URL) {
      axios.post(FIREBASE_JONI_URL, {
        phone: cleanPhone,
        message: generatedResponse,
        timestamp: new Date().toISOString(),
        direction: 'outgoing',
        sender: 'NOA_AI',
      }).catch(() => {});
    }

  } catch (error) {
    console.error('❌ [MESSAGE PIPELINE ERROR] שגיאה בעבודת פייפליין ההודעות:', error);
  }
});

// ------------------------------------------------------------------------------------
// 5. שרת Express מקומי (Port 3000) לניטור סטטוס והפעלת טריגרים ידניים
// ------------------------------------------------------------------------------------
const app = express();
app.use(express.json());

// בדיקת Healthcheck
app.get('/health', (req, res) => {
  const isReady = client.info && client.info.wid;
  res.json({
    status: 'ok',
    whatsappConnected: Boolean(isReady),
    number: isReady ? client.info.wid.user : NOA_PHONE,
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// שליחת הודעה יזומה ידנית דרך API מקומי
app.post('/api/send-message', async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ error: 'חסרים פרטי טלפון או הודעה' });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const jid = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@c.us`;

    await client.sendMessage(jid, message);
    console.log(`📤 [MANUAL API] הודעה יזומה נשלחה ל-${cleanPhone}`);

    return res.json({ success: true, target: cleanPhone });
  } catch (err) {
    console.error('❌ [API SEND ERROR]:', err);
    return res.status(500).json({ error: 'שגיאה בשליחת הודעה ידנית', details: String(err) });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 [EXPRESS SERVER] שרת הניטור וה-API פועל בפורט ${PORT}`);
});

// ------------------------------------------------------------------------------------
// 6. הטיפול הגלובלי בקריסות (Anti-Crash Global Exception Handlers)
// ------------------------------------------------------------------------------------
process.on('uncaughtException', (err) => {
  console.error('💥 [CRITICAL UNCAUGHT EXCEPTION] נתפסה שגיאה גלובלית:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 [CRITICAL UNHANDLED REJECTION] דחיית פבטיחה שלא נתפסה:', reason);
});

// ------------------------------------------------------------------------------------
// 7. הפעלת מנוע ה-WhatsApp
// ------------------------------------------------------------------------------------
client.initialize().catch((err) => {
  console.error('❌ [INIT ERROR] נכשל אתחול ראשוני של WhatsApp Client:', err);
});
