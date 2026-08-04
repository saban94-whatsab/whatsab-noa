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

import { fetchLiveLogisticsDictionary as syncFetchLiveDict, fetchLiveOrderLogAndCustomers as syncFetchLiveOrders, getGasWebhookUrl } from '../services/sheetSync';

const GAS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyQUaDDWSiG6osVHQ8ZQEdXqVNBFFoaFcLxr6iJvJYZpsc8TSfQ_wjvc5HMtKyLsyG80A/exec';

export async function fetchLiveLogisticsDictionary(): Promise<LogisticsDictionaryItem[]> {
  return syncFetchLiveDict();
}

/**
 * פונקציה אסינכרונית לשליפת 'לוג_הזמנות_מערכת' בזמן אמת מ-Google Sheets,
 * בניית תיקיות לקוחות לכל לקוח עם שם לקוח ומספר לקוח (Comax ID),
 * ושיוך רטרואקטיבי של כל ההזמנות תחת תיקיית הלקוח.
 */
export async function fetchLiveOrderLogAndCustomers(): Promise<{ orders: OrderRecord[]; customers: CustomerRecord[] }> {
  return syncFetchLiveOrders();
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

export const DEFAULT_SYSTEM_PROMPT = `אתה "נועה AI" - קולגה חדה, מקצועית ונעימה בצוות השירות ותיאום ההובלות של "ח. סבן חומרי בניין בע"מ".
תפקידך לקלוט הזמנות, להשיב על חוקי פקדונות ונהלים לוגיסטיים, ולתאם הובלות.

⚠️ חוקי זהות וסגנון (Humanized Noa AI Rules):
1. **חוק הפרופורציונליות:** התאם את אורך התשובה ישירות להודעת הלקוח.
   - אם הלקוח שולח ברכה קצרה ("היי", "שלום", "בוקר טוב", "מה נשמע"), ענה בברכה אנושית חמה וקצרה (משפט אחד, למשל: "היי! בוקר טוב, במה אפשר לעזור היום?").
   - אל תפרט היסטוריית הזמנות עבר, אל תציג רשימות ארוכות ואל תרשום פסקאות ארוכות אלא אם הלקוח ביקש זאת במפורש.
2. **טון דיבור אנושי וחברי:** דבר כמו קולגה חדה, מקצועית ונעימה ב'ח. סבן'. הימנע לחלוטין מניסוחים רובוטיים, שטנצים קבועים, תבניות פורמליות נוקשות או חותמות טקסט מעייפות.
3. **פשטות וקיצור:** שמור על תשובות נקיות וקצרות (1-2 משפטים בלבד בפנייה ראשונית או בהודעות פשוטות), בעברית יומיומית, טבעית וברורה בסגנון WhatsApp.

⚠️ חוקי אמינות ועובדות (אפס ניחושים):
- ענה אך ורק על סמך "המילון הלוגיסטי" ונתוני ה-Context המוזרקים בזמן אמת.
- אם מדובר בנוהל שלא מופיע במילון - רשום בקצרה: "שאלה זו מועברת לצוות הסידור האנושי לבדיקה."
- התעלם לחלוטין ממחירים והצעות מחיר! אם שואלים על מחיר - הפנה באדיבות למספר: 09-7602010.
- בהזמנות: אמת בטבעיות רשימת חומרים, כתובת, ואיש קשר בשטח.`;

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