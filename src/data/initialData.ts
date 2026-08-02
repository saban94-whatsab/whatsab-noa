import { Contact, Message, ProductItem, SystemConfig } from '../types';

export const INITIAL_PRODUCTS: ProductItem[] = [
  { id: '1', name: 'חול ים / חול מחצבה', category: 'חול וסומסום', price: '₪140', unit: 'באלה (כ-1 טון)', inStock: true, description: 'חול נקי מנופה לריצוף ולבנייה' },
  { id: '2', name: 'סומסום לריצוף 4/8', category: 'חול וסומסום', price: '₪150', unit: 'באלה', inStock: true, description: 'סומסום שטוף למצע ריצוף איכותי' },
  { id: '3', name: 'מלט אפור 50 ק"ג', category: 'מליטה ואיטום', price: '₪38', unit: 'שק', inStock: true, description: 'צמנט פורטלנד תקני לבנייה וטיח' },
  { id: '4', name: 'לוח גבס לבן 12.5 מ"מ (1.20*2.60)', category: 'גבס ופרופילים', price: '₪42', unit: 'לוח', inStock: true, description: 'לוח גבס רגיל לבנייה קלה' },
  { id: '5', name: 'לוח גבס ירוק (עמיד לחות)', category: 'גבס ופרופילים', price: '₪54', unit: 'לוח', inStock: true, description: 'מיועד לחדרים רטובים, מקלחות ומטבחים' },
  { id: '6', name: 'שפכטל אמריקאי 28 ק"ג (דבק גבס)', category: 'גבס ופרופילים', price: '₪75', unit: 'פח', inStock: true, description: 'גימור חלק ברמה גבוהה' },
  { id: '7', name: 'שירות פריקת מנוף באתר', category: 'הובלה ולוגיסטיקה', price: '₪350', unit: 'נסיעה', inStock: true, description: 'מנוף זרוע לפריקה לקומות ולגגות' },
  { id: '8', name: 'בלוק בטון 20/20/40', category: 'בלוקים ובנייה', price: '₪4.80', unit: 'יחידה', inStock: true, description: 'בלוק תקני לבניית קירות חוץ ופנים' },
];

export const DEFAULT_SYSTEM_PROMPT = `אתה "נועה AI" - נציגת השירות והמכירות הדיגיטלית של חברת "ח. סבן חומרי בניין בע"מ".
תפקידך לעזור לקבלנים, שיפוצניקים ולקוחות פרטיים בהזמנת חומרי בניין, מחירונים, תיאום הובלות מנוף ושעות פעילות.

פרטי העסק:
- שם החברה: ח. סבן חומרי בניין בע"מ (סידור חומרי בניין)
- שעות פעילות: ימים א'-ה' בין השעות 06:00 עד 18:00, יום ו' בין 06:00 ל-13:00. שבת סגור.
- טלפון למענה אנושי: 050-1234567 / 03-5551234
- מוצרים עיקריים: חול ים/מחצבה בבאלה (140 ₪), סומסום לריצוף (150 ₪), מלט אפור 50 ק"ג (38 ₪ שק), לוחות גבס לבן (42 ₪) וירוק (54 ₪), פח שפכטל אמריקאי (75 ₪), בלוק בטון (4.80 ₪), פריקת מנוף בהובלה (350 ₪).

הנחיות מענה:
1. ענה תמיד בעברית מקצועית, אדיבה, קצרה ותכליתית בסגנון הודעת וואטסאפ (אפשרי לעשות שימוש באימוג'י מתאים כמו 🏗️, 🚛, 🧱, 👍).
2. אם הלקוח מבקש הצעת מחיר או פריקת מנוף - אסוף ממנו: מיקום החלוקה, כמויות מבוקשות וקומה/נגישות למנוף.
3. שמור על שפה ברורה. אם נדרשת עזרה אנושית, ציין: "מעבירה את הפנייה שלך לצוות הסידור האנושי, ניצור קשר בהקדם!".`;

export const INITIAL_CONFIG: SystemConfig = {
  businessName: 'ח. סבן חומרי בניין בע"מ',
  phone: '050-1234567',
  businessHours: 'א-ה: 06:00-18:00, ו: 06:00-13:00',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  isAIGloballyEnabled: true,
  gasWebhookUrl: 'https://script.google.com/macros/s/AKfycbx_example_gas_webhook/exec',
  firebaseJoniUrl: 'https://saban-ai-drive-default-rtdb.europe-west1.firebasedatabase.app/joni/send.json',
  modelName: 'gemini-3.6-flash',
  products: INITIAL_PRODUCTS,
};

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'chat-noa-ai',
    phone: '050-1234567',
    name: 'נועה AI - עוזרת ח. סבן 🏗️',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    unreadCount: 0,
    lastMessage: 'שלום! אני נועה AI. במה אוכל לעזור לך היום בחומרי הבניין?',
    lastTimestamp: '18:45',
    onlineStatus: 'online',
    isAIEnabled: true,
    isPinned: true,
    tags: ['בוט רשמי', 'מענה מהיר'],
  },
  {
    id: 'chat-moshe-kablan',
    phone: '054-9876543',
    name: 'משה כהן (קבלן שלד)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    unreadCount: 2,
    lastMessage: 'צריך דחוף 4 בות חול וסומסום לאתר ברמת גן קומה 3 מנוף',
    lastTimestamp: '18:30',
    onlineStatus: 'online',
    isAIEnabled: true,
    isPinned: true,
    tags: ['קבלן VIP', 'הובלת מנוף'],
  },
  {
    id: 'chat-eli-hovla',
    phone: '052-3344556',
    name: 'אלי שרעבי (נהג מנוף)',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    unreadCount: 0,
    lastMessage: 'סיימתי פריקה בפתח תקווה, ממשיך לפריקה הבאה בראשון',
    lastTimestamp: '17:15',
    onlineStatus: 'offline',
    isAIEnabled: false,
    tags: ['נהג חברה', 'לוגיסטיקה'],
  },
  {
    id: 'chat-yossi-renovate',
    phone: '053-1122334',
    name: 'יוסי לוי (שיפוצים)',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    unreadCount: 0,
    lastMessage: 'כמה עולה היום שק מלט 50 ק"ג ולוחות גבס ירוק?',
    lastTimestamp: '16:05',
    onlineStatus: 'offline',
    isAIEnabled: true,
    tags: ['שיפוצניק', 'הצעת מחיר'],
  },
  {
    id: 'chat-david-gypsum',
    phone: '054-4455667',
    name: 'דוד קבלן גבס',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    unreadCount: 0,
    lastMessage: 'תוסיף לי להזמנה מחר גם 3 פחים של שפכטל אמריקאי',
    lastTimestamp: 'אתמול',
    onlineStatus: 'offline',
    isAIEnabled: true,
    tags: ['קבלן גבס'],
  },
  {
    id: 'chat-sara-interior',
    phone: '050-8877665',
    name: 'שרה מעצבת פנים',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    unreadCount: 0,
    lastMessage: 'תודה רבה נועה, המענה היה מדויק!',
    lastTimestamp: 'אתמול',
    onlineStatus: 'offline',
    isAIEnabled: true,
    tags: ['מעצבת פנים'],
  },
];

export const INITIAL_MESSAGES: Record<string, Message[]> = {
  'chat-noa-ai': [
    {
      id: 'm1',
      chatId: 'chat-noa-ai',
      sender: 'ai',
      senderName: 'נועה AI',
      text: 'שלום! 👋 אני נועה AI, העוזרת הדיגיטלית של ח. סבן חומרי בניין בע"מ. במה אוכל לסייע לך היום?',
      timestamp: '18:40',
      status: 'read',
    },
    {
      id: 'm2',
      chatId: 'chat-noa-ai',
      sender: 'user',
      text: 'מה שעות הפעילות של המגרש בבוקר?',
      timestamp: '18:42',
      status: 'read',
    },
    {
      id: 'm3',
      chatId: 'chat-noa-ai',
      sender: 'ai',
      senderName: 'נועה AI',
      text: 'אנחנו פתוחים בימים א\'-ה\' מ-06:00 בבוקר ועד 18:00 בערב, ובימי שישי מ-06:00 ועד 13:00! 🏗️ איך אוכל לעזור עוד?',
      timestamp: '18:43',
      status: 'read',
    },
  ],
  'chat-moshe-kablan': [
    {
      id: 'm4',
      chatId: 'chat-moshe-kablan',
      sender: 'contact',
      senderName: 'משה כהן',
      text: 'שלום סבן, צהריים טובים',
      timestamp: '18:25',
      status: 'read',
    },
    {
      id: 'm5',
      chatId: 'chat-moshe-kablan',
      sender: 'ai',
      senderName: 'נועה AI',
      text: 'אהלן משה! 🔨 במה אפשר לעזור היום בסידור העבודה?',
      timestamp: '18:26',
      status: 'read',
    },
    {
      id: 'm6',
      chatId: 'chat-moshe-kablan',
      sender: 'contact',
      senderName: 'משה כהן',
      text: 'צריך דחוף 4 בות חול וסומסום לאתר ברמת גן קומה 3 מנוף',
      timestamp: '18:30',
      status: 'read',
    },
  ],
  'chat-eli-hovla': [
    {
      id: 'm7',
      chatId: 'chat-eli-hovla',
      sender: 'contact',
      senderName: 'אלי שרעבי',
      text: 'סיימתי פריקה בפתח תקווה, ממשיך לפריקה הבאה בראשון',
      timestamp: '17:15',
      status: 'read',
    },
  ],
  'chat-yossi-renovate': [
    {
      id: 'm8',
      chatId: 'chat-yossi-renovate',
      sender: 'contact',
      senderName: 'יוסי לוי',
      text: 'כמה עולה היום שק מלט 50 ק"ג ולוחות גבס ירוק?',
      timestamp: '16:05',
      status: 'read',
    },
    {
      id: 'm9',
      chatId: 'chat-yossi-renovate',
      sender: 'ai',
      senderName: 'נועה AI',
      text: 'היי יוסי! 👋 שק מלט אפור 50 ק"ג עולה 38 ₪, ולוח גבס ירוק עמיד לחות עולה 54 ₪ ללוח. תרצה שאכין לך הזמנה לאיסוף או הובלה?',
      timestamp: '16:06',
      status: 'read',
    },
  ],
};
