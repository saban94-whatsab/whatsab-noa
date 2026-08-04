export const SYSTEM_CONFIG = {
  BOT_NAME: "נועה AI",
  COMPANY_NAME: "ח. סבן חומרי בניין בע\"מ",
  PHONE_ORDERS: "09-7602010",
  HUMAN_OVERRIDE_FLAG: "[HUMAN_TAKE OVER]"
};

export interface IncomingNoaPayload {
  sender?: string;
  text?: string;
  mediaType?: 'image' | 'document' | 'vcf' | 'location' | 'sticker' | null;
  location?: any;
}

export interface NoaResponseAction {
  replyText: string;
  assignToHuman: boolean;
  orderParsed: string[] | null;
  metadata: Record<string, any>;
}

/**
 * Noa AI Engine - Realtime Dictionary & Deposit Rules Integration
 */

// מילון לוגיסטי שנשלף מהגליון / Google Sheets / DB
export interface LogisticDictionary {
  palletsDepositRule: string;
  bigBagDepositRule: string;
  cancellationPolicy: string;
  craneUnloadRules: string;
}

// דוגמה לשליפת המילון בזמן אמת (ניתן להחליף בקריאת API לגליון Google Sheets)
export async function fetchLogisticDictionary(): Promise<LogisticDictionary> {
  return {
    palletsDepositRule: "משטח עץ טעון פיקדון של 45 ₪. זיכוי מלא יינתן בעת החזרת משטח תקין לסניף.",
    bigBagDepositRule: "בלה (שק ענק) מוחזרת ללא פיקדון כספי, אך מחייבת פינוי מהאתר.",
    cancellationPolicy: "ביטול הובלה אפשרי עד 3 שעות לפני יציאת המשאית.",
    craneUnloadRules: "פריקת מנוף מבוצעת עד קו בניין / מדרכה סמוכה, בכפוף לתנאי בטיחות."
  };
}

/**
 * פונקציה לבניית הפרומפט הדינמי מוזרק העובדות
 */
export async function generateNoaPromptWithContext(userMessage: string = ""): Promise<string> {
  const dictionary = await fetchLogisticDictionary();

  const injectedSystemPrompt = `
אתה "נועה AI" - קולגה חדה, מקצועית ונעימה בצוות השירות ותיאום ההובלות של "ח. סבן חומרי בניין בע"מ".
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
- בהזמנות: אמת בטבעיות רשימת חומרים, כתובת, ואיש קשר בשטח.

המילון הלוגיסטי המעודכן בזמן אמת:
- חוק פיקדון משטחים: ${dictionary.palletsDepositRule}
- חוק פיקדון בלות: ${dictionary.bigBagDepositRule}
- נוהל ביטולים: ${dictionary.cancellationPolicy}
- תנאי פריקת מנוף: ${dictionary.craneUnloadRules}
  `.trim();

  return injectedSystemPrompt;
}

/**
 * Main Entry Point for incoming WhatsApp Message
 */
export function processIncomingNoaMessage(incomingPayload: IncomingNoaPayload): NoaResponseAction {
  const rawText = incomingPayload.text ? incomingPayload.text.trim() : "";
  const mediaType = incomingPayload.mediaType;

  const responseAction: NoaResponseAction = {
    replyText: "",
    assignToHuman: false,
    orderParsed: null,
    metadata: {}
  };

  // 1. Mutation: Location Payload
  if (mediaType === 'location' || incomingPayload.location) {
    responseAction.replyText = `קיבלתי את המיקום מדויק, תודה! 📍\nהאם מדובר במיקום האספקה להזמנה החדשה?`;
    responseAction.metadata.location = incomingPayload.location;
    return responseAction;
  }

  // 2. Mutation: VCF / Contact Cards
  if (mediaType === 'vcf' || rawText.includes('.vcf')) {
    responseAction.replyText = `קיבלתי את איש הקשר. 👤\nאנא ציין אם לרשום אותו כאיש קשר לקבלה בשטח ומה תכולת ההזמנה.`;
    responseAction.metadata.hasContactCard = true;
    return responseAction;
  }

  // 3. Mutation: Documents / Images
  if (mediaType === 'document' || mediaType === 'image') {
    responseAction.replyText = `הקובץ/התמונה התקבלו בהצלחה. 📄\nצוות ההזמנות בודק את הקובץ וניצור איתך קשר במידת הצורך לבדיקת המלאי והתיאום.`;
    responseAction.assignToHuman = true;
    return responseAction;
  }

  // 4. Greetings & Simple Contact (Proportionality Rule: short, warm response)
  const cleanLower = rawText.trim().toLowerCase();
  const simpleGreetings = ["היי", "שלום", "אהלן", "בוקר טוב", "ערב טוב", "צהריים טובים", "מה קורה", "מה נשמע", "היי נועה", "שלום נועה", "אח יקר", "הי"];
  if (simpleGreetings.includes(cleanLower) || (cleanLower.length <= 10 && simpleGreetings.some(g => cleanLower.startsWith(g)))) {
    responseAction.replyText = `היי! בוקר טוב, במה אפשר לעזור היום בח. סבן? 👋`;
    return responseAction;
  }

  // 5. Mutation: Non-Order Inquiries & Price Queries -> Phone Referral (Rule 3)
  if (isStoreInquiryOnly(rawText)) {
    responseAction.replyText = `שלום! קו זה מיועד למחלקת הזמנות וסידור הובלות. 🚚 לבירור מחירים ומלאי בחנות, נשמח לעזור בטלפון: ${SYSTEM_CONFIG.PHONE_ORDERS}.`;
    return responseAction;
  }

  // 6. Deposit & Logistics Rules Check
  const depositCheck = checkDepositAndLogisticsRules(rawText);
  if (depositCheck.handled) {
    responseAction.replyText = depositCheck.replyText;
    if (depositCheck.assignToHuman) {
      responseAction.assignToHuman = true;
    }
    return responseAction;
  }

  // 7. Mutation: Specific missing parameters check (e.g. Panel without thickness)
  const missingDetailCheck = detectMissingOrderDetails(rawText);
  if (missingDetailCheck.isMissing) {
    responseAction.replyText = missingDetailCheck.promptQuestion;
    return responseAction;
  }

  // 8. Standard Order Logic Detection
  if (isOrderIntent(rawText)) {
    responseAction.replyText = `קיבלתי את ההזמנה! 👍 מעבירה לסידור ההובלות ונעדכן אותך בהקדם לגבי צפי אספקה.`;
    responseAction.orderParsed = extractOrderItems(rawText);
    return responseAction;
  }

  // Default Fallback Response (Short, warm & human)
  responseAction.replyText = `היי, במה אוכל לסייע לך היום בח. סבן? 👍`;
  return responseAction;
}

/**
 * Checks logistics procedures & deposit rules strictly
 */
export function checkDepositAndLogisticsRules(text: string): { handled: boolean; replyText: string; assignToHuman?: boolean } {
  const lower = text.toLowerCase();
  const isRuleQuestion = lower.includes("פיקדון") || lower.includes("פקדון") || lower.includes("נוהל") || lower.includes("מדיניות") || lower.includes("חוק");
  
  if (lower.includes("משטח") && (isRuleQuestion || lower.includes("החזרה") || lower.includes("כמה"))) {
    return {
      handled: true,
      replyText: "משטח עץ טעון פיקדון של 45 ₪. זיכוי מלא יינתן בעת החזרת משטח תקין לסניף. 📦"
    };
  }

  if ((lower.includes("בלה") || lower.includes("בלות")) && (isRuleQuestion || lower.includes("החזרה"))) {
    return {
      handled: true,
      replyText: "בלה (שק ענק) מוחזרת ללא פיקדון כספי, אך מחייבת פינוי מהאתר. 🚛"
    };
  }

  if (lower.includes("ביטול") || lower.includes("בטוח")) {
    return {
      handled: true,
      replyText: "ביטול הובלה אפשרי עד 3 שעות לפני יציאת המשאית. ⏱️"
    };
  }

  if (lower.includes("תנאי מנוף") || lower.includes("איפה פורקים") || lower.includes("פריקת מנוף")) {
    return {
      handled: true,
      replyText: "פריקת מנוף מבוצעת עד קו בניין / מדרכה סמוכה, בכפוף לתנאי בטיחות. 🏗️"
    };
  }

  if (isRuleQuestion) {
    return {
      handled: true,
      replyText: "שאלה זו מועברת לצוות הסידור האנושי לבדיקה.",
      assignToHuman: true
    };
  }

  return { handled: false, replyText: "" };
}

/**
 * Helper to identify general store inquiries vs actual delivery orders
 */
export function isStoreInquiryOnly(text: string): boolean {
  const storeKeywords = [
    "כמה עולה", "מה המחיר", "יש לכם בחנות", "מה הגודל ומה המחיר",
    "שעות פתיחה", "איפה אתם יושבים", "האם פתוח", "מחיר", "עלות", "הצעת מחיר"
  ];
  return storeKeywords.some(keyword => text.includes(keyword));
}

/**
 * Helper to identify order intent
 */
export function isOrderIntent(text: string): boolean {
  const orderKeywords = [
    "הזמנה", "להזמין", "להביא", "לספק", "אספקה", "מכולה", "מנוף",
    "משטח", "בלות", "שקים", "בלה", "גבס", "מלט", "טיט", "חול", "סומסום"
  ];
  return orderKeywords.some(keyword => text.toLowerCase().includes(keyword));
}

/**
 * Validates edge-cases like missing structural details in building materials
 */
export function detectMissingOrderDetails(text: string): { isMissing: boolean; promptQuestion: string } {
  // Edge Case: Panel insulation missing thickness
  if ((text.includes("פנל מבודד") || text.includes("פאנל מבודד")) && !text.match(/\d+\s*(ס"מ|סמ|מ"מ|ממ)/)) {
    return {
      isMissing: true,
      promptQuestion: `רשמתי פנל מבודד. 📐 באיזה עובי מדובר? (למשל: 3 ס"מ, 5 ס"מ)`
    };
  }

  // Edge Case: Drywall Profile missing thickness
  if ((text.includes("מסלול") || text.includes("ניצב")) && !text.includes("0.") && !text.includes("עובי")) {
    return {
      isMissing: true,
      promptQuestion: `רשמתי פרופילים לגבס. באיזה עובי נדרש? (למשל עובי סטנדרטי 0.6)?`
    };
  }

  return { isMissing: false, promptQuestion: "" };
}

/**
 * Basic Item Extraction Mock logic for CRM integration
 */
export function extractOrderItems(text: string): string[] {
  const lines = text.split("\n");
  const items: string[] = [];
  lines.forEach(line => {
    if (line.trim().length > 0) {
      items.push(line.trim());
    }
  });
  return items;
}
