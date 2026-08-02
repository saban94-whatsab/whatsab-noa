import { 
  Contact, 
  Message, 
  ProductItem, 
  SystemConfig, 
  CustomerRecord, 
  LogisticsDictionaryItem, 
  OrderRecord, 
  LogisticsDiscrepancy, 
  GROUP_JIDS 
} from '../types';

// ==========================================
// 1. שליפת מוצרים בזמן אמת מטאב 'מילון_לוגסטי'
// ==========================================

const GAS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyQUaDDWSiG6osVHQ8ZQEdXqVNBFFoaFcLxr6iJvJYZpsc8TSfQ_wjvc5HMtKyLsyG80A/exec';

/**
 * פונקציה אסינכרונית לשליפת מילון לוגיסטי/מוצרים בזמן אמת מ-Google Sheets
 */
export async function fetchLiveLogisticsDictionary(): Promise<LogisticsDictionaryItem[]> {
  try {
    let rows: any[] = [];

    // ניסיון ראשון: שליפה דרך API proxy בשרת למניעת בעיות CORS והפניות בבדפדפן
    try {
      const proxyRes = await fetch(`/api/sheets-fetch?tab=${encodeURIComponent('מילון_לוגסטי')}`);
      if (proxyRes.ok) {
        const proxyJson = await proxyRes.json();
        if (proxyJson.data && Array.isArray(proxyJson.data)) {
          rows = proxyJson.data;
        } else if (Array.isArray(proxyJson)) {
          rows = proxyJson;
        }
      }
    } catch {
      // Proxy failed or not running in dev server, fallback to direct fetch
    }

    // ניסיון שני: שליפה ישירה מ-GAS (ללא כותרת Content-Type שמפעילה preflight CORS)
    if (rows.length === 0) {
      const directRes = await fetch(`${GAS_WEBHOOK_URL}?tab=${encodeURIComponent('מילון_לוגסטי')}`, { method: 'GET' });
      if (directRes.ok) {
        const rawData = await directRes.json();
        rows = Array.isArray(rawData) ? rawData : (rawData?.data || []);
      }
    }

    // המרת הנתונים מהגליון למבנה מילון לוגיסטי עבור נועה
    return rows.map((row: any) => ({
      sku: String(row['מק"ט'] || row['sku'] || '').trim(),
      productName: String(row['שם מוצר'] || row['productName'] || '').trim(),
      category: String(row['קטגוריה'] || row['category'] || 'כללי').trim(),
      aliases: row['כינויים'] ? String(row['כינויים']).split(',').map((a: string) => a.trim()) : [],
      unit: String(row['יחידה'] || row['unit'] || 'יח\'').trim(),
      unitPrice: Number(row['מחיר'] || row['unitPrice'] || 0),
    })).filter((item: LogisticsDictionaryItem) => item.sku !== '' && item.productName !== '');
  } catch (error) {
    console.warn('⚠️ שילוב נתוני מילון מ-Sheets אינו זמין כעת (משתמש בנתונים שמורים):', error);
    return []; // במקרה של תקלה ברשת מוחזר מערך ריק מבוטח
  }
}

/**
 * פונקציה אסינכרונית לשליפת 'לוג_הזמנות_מערכת' בזמן אמת מ-Google Sheets,
 * בניית תיקיות לקוחות לכל לקוח עם שם לקוח ומספר לקוח (Comax ID),
 * ושיוך רטרואקטיבי של כל ההזמנות תחת תיקיית הלקוח.
 */
export async function fetchLiveOrderLogAndCustomers(): Promise<{ orders: OrderRecord[]; customers: CustomerRecord[] }> {
  try {
    let rows: any[] = [];

    // ניסיון ראשון: שליפה דרך API proxy בשרת למניעת בעיות CORS והפניות בדפדפן
    try {
      const proxyRes = await fetch(`/api/sheets-fetch?tab=${encodeURIComponent('לוג_הזמנות_מערכת')}`);
      if (proxyRes.ok) {
        const proxyJson = await proxyRes.json();
        if (proxyJson.data && Array.isArray(proxyJson.data)) {
          rows = proxyJson.data;
        } else if (Array.isArray(proxyJson)) {
          rows = proxyJson;
        }
      }
    } catch {
      // Proxy failed or not running in dev server, fallback to direct fetch
    }

    // ניסיון שני: שליפה ישירה מ-GAS (ללא כותרת Content-Type שמפעילה preflight CORS)
    if (rows.length === 0) {
      const directRes = await fetch(`${GAS_WEBHOOK_URL}?tab=${encodeURIComponent('לוג_הזמנות_מערכת')}`, { method: 'GET' });
      if (directRes.ok) {
        const json = await directRes.json();
        rows = Array.isArray(json) ? json : (json?.data || []);
      }
    }

    const allOrders: OrderRecord[] = [];
    const customerMap = new Map<string, CustomerRecord>();

    rows.forEach((row: any, idx: number) => {
      const rawCustomerName = String(row['שם לקוח'] || '').trim();
      if (!rawCustomerName) return;

      // חילוץ שם לקוח ומספר לקוח בסוגריים (לדוגמה: "וגשל דאו(519205)")
      const match = rawCustomerName.match(/^(.*?)(?:\((\d+)\))?$/);
      let cleanName = rawCustomerName;
      let customerNumber = '';

      if (match) {
        cleanName = match[1].trim();
        customerNumber = match[2] ? match[2].trim() : '';
      }

      if (!customerNumber) {
        const altMatch = rawCustomerName.match(/\((\d+)\)/);
        if (altMatch) {
          customerNumber = altMatch[1];
          cleanName = rawCustomerName.replace(/\(\d+\)/, '').trim();
        }
      }

      // פירוש פריטים מהטקסט המרובה שורות
      const itemsText = String(row['פריטים'] || '');
      const itemLines = itemsText.split('\n').filter((l) => l.trim().length > 0);
      const parsedItems = itemLines.map((line) => {
        const skuMatch = line.match(/מק"特:\s*([\w\d]+)/) || line.match(/מק"ט:\s*([\w\d]+)/);
        const qtyMatch = line.match(/כמות:\s*(\d+)/);
        const sku = skuMatch ? skuMatch[1] : '';
        const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

        const parts = line.split('|');
        let pName = line;
        if (parts.length >= 2) {
          pName = parts[1].replace(/📦/, '').trim();
        } else {
          pName = line.replace(/^\d+\.\s*/, '').trim();
        }
        return {
          sku: sku || 'ללא מק"ט',
          name: pName,
          quantity: qty,
          unit: 'יח\'',
          price: 0,
        };
      });

      const orderNumberStr = String(row['מספר הזמנה'] || `ORD-${1000 + idx}`);
      const orderAmount = Number(row['סכום'] || 0);

      const orderRecord: OrderRecord = {
        orderNumber: orderNumberStr,
        customerName: cleanName || rawCustomerName,
        customerPhone: '054-0000000',
        origin: 'comax',
        warehouse: String(row['מחסן'] || 'מחסן ראשי (החרש)'),
        address: String(row['כתובת אספקה'] || 'אתר פריקה'),
        driverName: 'סידור מנופים ח. סבן',
        distance: String(row['אימות מסלול הובלה'] || 'נבדק בתקן (24.1 ק"מ)'),
        duration: '30 דק\'',
        wazeUrl: `https://waze.com/ul?q=${encodeURIComponent(String(row['כתובת אספקה'] || 'תל אביב'))}`,
        items: parsedItems,
        blowStatus: String(row['פקדון בלות'] || 'תקין'),
        palletStatus: String(row['פקדון משטחים'] || 'תקין'),
        status: String(row['סטטוס'] || 'מאושר'),
        timestamp: String(row['תאריך קליטה'] || new Date().toISOString()),
        formattedTemplate: String(row['מסקנות נועה AI'] || ''),
        discrepancyFlag: false,
      };

      allOrders.push(orderRecord);

      // מפתח זיהוי ייחודי לתיקיית לקוח
      const customerKey = customerNumber ? `${cleanName}_${customerNumber}` : cleanName;

      if (!customerMap.has(customerKey)) {
        const custId = customerNumber ? `CUST-${customerNumber}` : `CUST-${1000 + customerMap.size}`;
        const createdDateStr = row['תאריך קליטה']
          ? new Date(row['תאריך קליטה']).toLocaleDateString('he-IL')
          : new Date().toLocaleDateString('he-IL');

        customerMap.set(customerKey, {
          id: custId,
          name: cleanName || rawCustomerName,
          comaxId: customerNumber ? customerNumber : 'ללא מספר קומקס',
          phone: '054-0000000',
          address: String(row['כתובת אספקה'] || 'אתר פריקה ראשי'),
          creditLimit: '₪150,000',
          currentBalance: '₪0',
          driveFolderUrl: `https://drive.google.com/drive/search?q=${encodeURIComponent(cleanName)}`,
          createdAt: createdDateStr,
          notes: `תיק לקוח מסונכרן אוטומטית מתוך לוג הזמנות מערכת (קומקס)`,
          activeOrdersCount: 0,
          totalSpent: 0,
          orders: [],
        });
      }

      const cust = customerMap.get(customerKey)!;
      cust.orders!.push(orderRecord);
      cust.activeOrdersCount = (cust.activeOrdersCount || 0) + 1;
      cust.totalSpent = (cust.totalSpent || 0) + orderAmount;
      cust.currentBalance = `₪${cust.totalSpent.toLocaleString()}`;
    });

    const customersArray = Array.from(customerMap.values());
    console.log(`✅ סונכרנו בהצלחה ${allOrders.length} הזמנות ו-${customersArray.length} תיקי לקוחות מתוך לוג הזמנות מערכת!`);

    return { orders: allOrders, customers: customersArray };
  } catch (error) {
    console.warn('⚠️ שילוב לוג הזמנות מ-Sheets אינו זמין כעת (משתמש בנתונים שמורים):', error);
    return { orders: [], customers: [] };
  }
}

/**
 * פונקציה להמרת מילון לוגיסטי לרשימת ProductItem להרכבת הזמנה ומלאי
 */
export function mapDictionaryToProducts(dictionary: LogisticsDictionaryItem[]): ProductItem[] {
  return dictionary.map((item) => ({
    id: item.sku,
    name: item.productName,
    category: item.category,
    price: item.unitPrice ? `₪${item.unitPrice}` : 'ללא מחיר',
    unit: item.unit,
    inStock: true,
    description: `מק"ט: ${item.sku} | כינויים: ${item.aliases.join(', ') || 'אין'}`,
  }));
}

// ==========================================
// 2. רשימות ראשוניות (מנוקות מלקוחות דמה)
// ==========================================

// רשימת מילון לוגיסטי התחלתית (תתעדכן בזמן אמת)
export const INITIAL_LOGISTICS_DICTIONARY: LogisticsDictionaryItem[] = [];

// לקוחות: נקי מלקוחות דמה
export const INITIAL_CUSTOMERS: CustomerRecord[] = [];

// הזמנות: ריק מלקוחות דמה
export const INITIAL_ORDERS: OrderRecord[] = [];

// חריגות: ריק מלקוחות דמה
export const INITIAL_DISCREPANCIES: LogisticsDiscrepancy[] = [];

// מוצרים ראשוניים: נטענים דינמית מתוך הגליון
export const INITIAL_PRODUCTS: ProductItem[] = [];

// ==========================================
// 3. הגדרות מערכת ופרומפט ברירת מחדל
// ==========================================

export const DEFAULT_SYSTEM_PROMPT = `אתה "נועה AI" - נציגת השירות ותיאום ההובלות הדיגיטלית של חברת "ח. סבן חומרי בניין בע"מ".
תפקידך הבלעדי הוא לקלוט הזמנות, להשיב על חוקי פקדונות ונהלים לוגיסטיים, ולתאם הובלות.

⚠️ חוקי ברזל למניעת ההזיות (אפס ניחושים):
1. ענה אך ורק על סמך "המילון הלוגיסטי" ונתוני ה-Context המוזרקים לך בזמן אמת!
2. אם הלקוח שואל על נוהל, חוק פקדונות (כמו פקדון משטחים/בלות) או פרט שאינו מופיע במילון הלוגיסטי המוזרק - רשום בדיוק: "שאלה זו מועברת לצוות הסידור האנושי לבדיקה." אל תנחש ואל תמציא חוקים מדעתך!
3. התעלם לחלוטין ממחירים, עלויות והצעות מחיר בשלב זה! אם הלקוח שואל על מחיר או הצעת מחיר, הפנה אותו באדיבות למספר: 09-7602010.

חוקי סגנון:
- ענה בעברית פשוטה, מקצועית, אדיבה ותכליתית בסגנון WhatsApp.
- ללא חפירות, ללא חזרה על שאלת הלקוח.
- מותר להשתמש באימוג'ים מתאימים (🏗️, 🚛, 📍, 👍).
- בהזמנות: אמת תמיד רשימת חומרים, כתובת/מיקום, ואיש קשר בשטח. אם חסר עובי (כמו פנל מבודד) - שאל רק על העובי.`;

export const INITIAL_CONFIG: SystemConfig = {
  businessName: 'ח. סבן חומרי בניין בע"מ',
  phone: '09-7602010',
  businessHours: 'א-ה: 06:00-18:00, ו: 06:00-13:00',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  isAIGloballyEnabled: true,
  gasWebhookUrl: GAS_WEBHOOK_URL,
  firebaseJoniUrl: 'https://saban-ai-drive-default-rtdb.europe-west1.firebasedatabase.app/joni/send.json',
  modelName: 'gemini-3.6-flash',
  products: INITIAL_PRODUCTS,
};

// ==========================================
// 4. צ'אטים ואנשי קשר (נועה + קבוצות בלבד)
// ==========================================

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'chat-noa-ai',
    phone: '09-7602010',
    name: 'נועה AI - עוזרת ח. סבן 🏗️',
    avatar: 'https://i.ibb.co/Zz6H1zth/1785576538638.png',
    unreadCount: 0,
    lastMessage: 'שלום! אני נועה AI. במה אוכל לעזור לך היום בחומרי הבניין?',
    lastTimestamp: 'עכשיו',
    onlineStatus: 'online',
    isAIEnabled: true,
    isPinned: true,
    tags: ['בוט רשמי', 'מענה מהיר'],
  },
  {
    id: 'chat-group-customer-orders',
    phone: GROUP_JIDS.CUSTOMER_ORDERS,
    name: 'קבוצת הזמנות לקוחות (JONI)',
    avatar: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=150&auto=format&fit=crop&q=80',
    unreadCount: 0,
    lastMessage: 'מערכת קליטת הזמנות פעילה',
    lastTimestamp: '06:00',
    onlineStatus: 'online',
    isAIEnabled: true,
    isPinned: true,
    tags: ['קבוצת הזמנות', '120363390702096083@g.us', 'נועה AI'],
  },
  {
    id: 'chat-group-updates-alerts',
    phone: GROUP_JIDS.UPDATES_ALERTS,
    name: 'עדכונים סידור נועה (Alerts)',
    avatar: 'https://media-mrs2-2.cdn.whatsapp.net/v/t61.24694-24/732853328_987242870978131_1305663132593817245_n.jpg?ccb=11-4&oh=01_Q5Aa5AEp4msFkpHsGR94nnQIDWtqkFX25qbX5j_6g73an1KGzQ&oe=6A7BD26F&_nc_sid=5e03e0&_nc_cat=102',
    unreadCount: 0,
    lastMessage: 'מערכת התראות מנהל מוכנה',
    lastTimestamp: '06:00',
    onlineStatus: 'online',
    isAIEnabled: false,
    isPinned: true,
    tags: ['קבוצת עדכונים', '120363428842730390@g.us', 'התראות מנהל'],
  },
];

// היסטוריית הודעות נקיות עבור נועה והקבוצות בלבד
export const INITIAL_MESSAGES: Record<string, Message[]> = {
  'chat-noa-ai': [
    {
      id: 'm1',
      chatId: 'chat-noa-ai',
      sender: 'ai',
      senderName: 'נועה AI',
      text: 'שלום! 👋 אני נועה AI, העוזרת הדיגיטלית של ח. סבן חומרי בניין בע"מ. במה אוכל לסייע לך היום?',
      timestamp: '06:00',
      status: 'read',
    },
  ],
  'chat-group-customer-orders': [],
  'chat-group-updates-alerts': [],
};