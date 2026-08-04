/**
 * Saban-94 WhatsApp Web Local Listener & Dispatcher (C:\ap94)
 * PM2 Process Name: noa-whatsapp-server
 * 
 * Functions:
 * 1. Connects to WhatsApp Web via whatsapp-web.js (Noa AI Account: +972508861080)
 * 2. Displays QR Code in terminal on startup
 * 3. Catches incoming messages & posts payload to Vercel App: `${VERCEL_APP_URL}/api/chat/respond`
 * 4. Listens for outbound messages from JONI Firebase RTDB / Local REST API & sends to WhatsApp JID
 */

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

const PORT = process.env.PORT || 3001;
const VERCEL_APP_URL = (process.env.VERCEL_APP_URL || 'https://saban-94-whatsapp-noa-ai.vercel.app').replace(/\/$/, '');
const FIREBASE_JONI_URL = process.env.FIREBASE_JONI_URL || 'https://saban-ai-drive-default-rtdb.europe-west1.firebasedatabase.app/joni/send.json';

const app = express();
app.use(express.json());

console.log('----------------------------------------------------');
console.log('🚀 Starting Saban-94 Local WhatsApp Listener (C:\\ap94)');
console.log(`🌐 Vercel Sync Target: ${VERCEL_APP_URL}/api/chat/respond`);
console.log('----------------------------------------------------');

// Initialize WhatsApp Web Client
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
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
    ],
  },
});

let isClientReady = false;
let qrCodeData = null;
let lastSyncedMessageId = null;

// QR Code Terminal Handler
client.on('qr', (qr) => {
  qrCodeData = qr;
  isClientReady = false;
  console.log('\n📱 [C:\\ap94] WhatsApp Web QR Code generated! Scan with Noa AI phone (+972508861080):\n');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log('✅ [C:\\ap94] WhatsApp Authentication Successful!');
});

client.on('auth_failure', (msg) => {
  console.error('❌ [C:\\ap94] WhatsApp Auth Failure:', msg);
});

client.on('ready', () => {
  isClientReady = true;
  qrCodeData = null;
  console.log('🟢 [C:\\ap94] PM2 process "noa-whatsapp-server" is READY and connected to WhatsApp!');
});

client.on('disconnected', (reason) => {
  isClientReady = false;
  console.warn('⚠️ [C:\\ap94] WhatsApp Client Disconnected:', reason);
  console.log('🔄 Attempting reconnection...');
  client.initialize();
});

// Catch Incoming Messages
client.on('message', async (msg) => {
  try {
    // Ignore status messages or self broadcasts
    if (msg.isStatus || msg.from === 'status@broadcast') return;

    const chat = await msg.getChat();
    const contact = await msg.getContact();

    const phoneClean = msg.from.replace(/[^0-9]/g, '');
    const senderName = contact.name || contact.pushname || contact.number || 'לקוח וואטסאפ';
    const isGroup = chat.isGroup;
    const groupId = isGroup ? chat.id._serialized : null;
    const incomingMessage = msg.body || '';

    console.log(`\n📩 [C:\\ap94 Incoming] From: ${senderName} (${phoneClean}) | Msg: "${incomingMessage}"`);

    const payload = {
      id: msg.id._serialized,
      phone: phoneClean,
      senderPhone: phoneClean,
      senderName,
      isGroup,
      groupId,
      incomingMessage,
      messageText: incomingMessage,
      timestamp: new Date(msg.timestamp * 1000).toISOString(),
      source: 'c_ap94_pm2_listener',
    };

    // Forward to Vercel Endpoint /api/chat/respond
    try {
      const syncUrl = `${VERCEL_APP_URL}/api/chat/respond`;
      console.log(`➡️ Posting payload to Vercel sync: ${syncUrl}`);
      
      const res = await axios.post(syncUrl, payload, { timeout: 8000 });
      console.log('✅ [Vercel Sync Success] Response status:', res.status);

      if (res.data && res.data.success && res.data.response) {
        const autoReplyText = res.data.response || res.data.replyText;
        console.log(`🤖 Auto-reply text from Vercel: "${autoReplyText}"`);

        // If auto-reply generated, send back on WhatsApp
        if (autoReplyText && autoReplyText.trim()) {
          await chat.sendMessage(autoReplyText);
          console.log('📤 [C:\\ap94 Outbound] Auto-reply dispatched to WhatsApp chat');
        }
      }
    } catch (apiErr) {
      console.error('⚠️ [Vercel Sync Warning] Failed to post to Vercel endpoint:', apiErr.message);
      
      // Local fallback auto-reply if Vercel server is temporarily unreachable
      if (incomingMessage.includes('ח. סבן') || incomingMessage.includes('הזמנה') || incomingMessage.includes('שלום')) {
        await chat.sendMessage(`שלום ${senderName}, הודעתך התקבלה בסידור הובלות ח. סבן (C:\\ap94 מקומי). 🚚\nנועה AI מעבדת את הפנייה.`);
      }
    }

  } catch (err) {
    console.error('❌ Error handling incoming WhatsApp message on C:\\ap94:', err);
  }
});

// Optional JONI Firebase RTDB Outbound Poller
setInterval(async () => {
  if (!isClientReady) return;

  try {
    const res = await axios.get(FIREBASE_JONI_URL, { timeout: 3000 });
    const data = res.data;
    if (!data) return;

    const entries = Object.entries(data);
    for (const [key, val] of entries) {
      if (val && val.direction === 'outbound_manual' && val.recipientPhone && !val.dispatchedLocal) {
        console.log(`\n🚀 [Outbound Queue] Dispatching manual admin message to ${val.recipientPhone}`);
        
        try {
          await client.sendMessage(val.recipientPhone, val.messageText);
          console.log('✅ Outbound message sent successfully!');

          // Mark as dispatched
          await axios.patch(FIREBASE_JONI_URL.replace('.json', `/${key}.json`), { dispatchedLocal: true });
        } catch (sendErr) {
          console.error('Failed to send outbound message via WhatsApp Client:', sendErr);
        }
      }
    }
  } catch {
    // Silent catch for background poller
  }
}, 4000);

// --- Local REST Express Endpoints for C:\ap94 ---

app.get('/', (req, res) => {
  res.json({
    service: 'Saban-94 WhatsApp Local Listener (C:\\ap94)',
    status: isClientReady ? 'ready' : (qrCodeData ? 'awaiting_qr_scan' : 'initializing'),
    pm2Process: 'noa-whatsapp-server',
    vercelSyncTarget: `${VERCEL_APP_URL}/api/chat/respond`,
    timestamp: new Date().toISOString(),
  });
});

app.get('/status', (req, res) => {
  res.json({
    isClientReady,
    hasQrCode: Boolean(qrCodeData),
    vercelAppUrl: VERCEL_APP_URL,
  });
});

// Outbound API endpoint for local testing
app.post('/send-message', async (req, res) => {
  const { phone, messageText } = req.body;
  if (!phone || !messageText) {
    return res.status(400).json({ success: false, error: 'phone and messageText are required' });
  }

  if (!isClientReady) {
    return res.status(503).json({ success: false, error: 'WhatsApp client is not connected' });
  }

  try {
    const targetJid = phone.includes('@') ? phone : `${phone.replace(/[^0-9]/g, '')}@c.us`;
    await client.sendMessage(targetJid, messageText);
    res.json({ success: true, targetJid, messageText });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`📡 [C:\\ap94] Express Server listening on port ${PORT}`);
  console.log('🔄 Initializing WhatsApp Client...');
  client.initialize();
});
