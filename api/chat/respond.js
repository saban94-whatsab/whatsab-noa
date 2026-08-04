// Vercel Serverless Function: /api/chat/respond
// Endpoint receiving POST updates from C:\ap94 local WhatsApp Web listener (PM2 noa-whatsapp-server)

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET Health check
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'online',
      endpoint: '/api/chat/respond',
      description: 'Vercel Sync Endpoint for Saban-94 WhatsApp Listener (C:\\ap94)',
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
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
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: phone and incomingMessage',
      });
    }

    // Default response generation for Saban חומרי בניין
    let replyText = `שלום ${senderName}, הודעתך התקבלה בסידור הובלות ח. סבן. 🚚\nקיבלנו: "${actualMessage}".\nנועה AI מעבדת את הבקשה. לבירור דחוף: 050-8861080.`;

    if (actualMessage.includes('מחיר') || actualMessage.includes('מלט') || actualMessage.includes('גבס')) {
      replyText = `שלום ${senderName}, תודה שפנית לח. סבן חומרי בניין! 🧱\nהבקשה למוצרים ("${actualMessage}") הועברה לסידור העבודה. איש קשר מטעמנו יחזור אליך בהקדם.`;
    }

    const JONI_FIREBASE_URL = process.env.FIREBASE_JONI_URL || 'https://saban-ai-drive-default-rtdb.europe-west1.firebasedatabase.app/joni/send.json';
    const GAS_WEBHOOK_URL = process.env.GAS_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbyQUaDDWSiG6osVHQ8ZQEdXqVNBFFoaFcLxr6iJvJYZpsc8TSfQ_wjvc5HMtKyLsyG80A/exec';

    // Dispatch to JONI Realtime DB asynchronously
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
        source: `${source}_vercel_sync`,
      }),
    }).catch((err) => console.warn('[Vercel respond] JONI warning:', err));

    // Dispatch to Google Sheets Log
    fetch(GAS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'appendRow',
        sheetName: 'הזמנות_סידור',
        timestamp: new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' }),
        orderNumber: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        customerName: senderName,
        customerPhone: cleanPhone,
        messageText: actualMessage,
        autoReply: replyText,
        status: 'התקבל ב-C:\\ap94',
      }),
    }).catch((err) => console.warn('[Vercel respond] GAS warning:', err));

    return res.status(200).json({
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
        customerName: `${senderName} (ח.סבן לקוחות)`,
        addresses: ['הרצל 45, ראשון לציון', 'אזה"ת חולון - החרש 12'],
        verifiedOrdersCount: 2,
      },
    });
  } catch (error) {
    console.error('Error in /api/chat/respond:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: error.message,
    });
  }
}
