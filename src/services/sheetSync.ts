import { LogisticsDictionaryItem, OrderRecord, CustomerRecord } from '../types';
import { gasGetRequest, PRIMARY_GAS_WEBHOOK_URL } from './gasRouter';

export function getGasWebhookUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GAS_WEBHOOK_URL) {
    return import.meta.env.VITE_GAS_WEBHOOK_URL;
  }
  return PRIMARY_GAS_WEBHOOK_URL;
}

/**
 * Safely decodes and encodes tab name for URL parameters
 */
export function normalizeTabName(tab: string): string {
  try {
    const decoded = decodeURIComponent(tab);
    return decoded;
  } catch {
    return tab;
  }
}

/**
 * Robust fetch helper using Apps Script Router with action=fetchSheets
 * and fallback to direct client fetch.
 */
export async function fetchSheetTab(rawTabName: string): Promise<any[]> {
  const tabName = normalizeTabName(rawTabName);

  // Attempt 1: Route through Enterprise GAS Router (action=fetchSheets)
  const routerRes = await gasGetRequest('fetchSheets', { tab: tabName });
  if (routerRes.success && routerRes.data.length > 0) {
    return routerRes.data;
  }

  // Attempt 2: Direct URL fetch using tab parameter directly
  try {
    const gasUrl = getGasWebhookUrl();
    if (gasUrl) {
      const directUrl = `${gasUrl}?tab=${encodeURIComponent(tabName)}`;
      const directRes = await fetch(directUrl, { method: 'GET' }).catch(() => null);
      if (directRes && directRes.ok) {
        const text = await directRes.text().catch(() => '');
        if (text) {
          try {
            const json = JSON.parse(text);
            return Array.isArray(json) ? json : (json?.data && Array.isArray(json.data) ? json.data : []);
          } catch {
            return [];
          }
        }
      }
    }
  } catch (gasErr) {
    console.warn(`[sheetSync] Direct fallback fetch for tab "${tabName}" note:`, gasErr);
  }

  return [];
}

/**
 * Fetches real-time logistics dictionary from Google Sheets
 */
export async function fetchLiveLogisticsDictionary(): Promise<LogisticsDictionaryItem[]> {
  try {
    // Try both tab name spelling variations safely
    let rows = await fetchSheetTab('מילון_לוגיסטי');
    if (rows.length === 0) {
      rows = await fetchSheetTab('מילון_לוגסטי');
    }

    return rows.map((row: any) => ({
      sku: String(row['מק"ט'] || row['sku'] || '').trim(),
      productName: String(row['שם מוצר'] || row['productName'] || '').trim(),
      category: String(row['קטגוריה'] || row['category'] || 'כללי').trim(),
      aliases: row['כינויים'] ? String(row['כינויים']).split(',').map((a: string) => a.trim()) : [],
      unit: String(row['יחידה'] || row['unit'] || 'יח\'').trim(),
      unitPrice: Number(row['מחיר'] || row['unitPrice'] || 0),
    })).filter((item: LogisticsDictionaryItem) => item.sku !== '' && item.productName !== '');
  } catch (error) {
    console.warn('[sheetSync] Exception in fetchLiveLogisticsDictionary:', error);
    return [];
  }
}

/**
 * Fetches order log and customer folders from Google Sheets
 */
export async function fetchLiveOrderLogAndCustomers(): Promise<{ orders: OrderRecord[]; customers: CustomerRecord[] }> {
  try {
    const rows = await fetchSheetTab('לוג_הזמנות_מערכת');
    const allOrders: OrderRecord[] = [];
    const customerMap = new Map<string, CustomerRecord>();

    rows.forEach((row: any, idx: number) => {
      const rawCustomerName = String(row['שם לקוח'] || '').trim();
      if (!rawCustomerName) return;

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
      const orderRecord: OrderRecord = {
        orderNumber: orderNumberStr,
        customerName: cleanName,
        customerPhone: String(row['טלפון'] || '050-8861080'),
        groupJid: String(row["ג'יד קבוצה"] || row['ג"יד קבוצה'] || '120363390702096083@g.us'),
        origin: 'whatsapp',
        warehouse: String(row['מחסן יוצא'] || 'מחסן החרש'),
        address: String(row['כתובת אספקה'] || 'אתר אספקה'),
        driverName: String(row['נהג'] || 'אלי שרעבי'),
        distance: String(row['מרחק'] || '10 ק"מ'),
        duration: String(row['זמן נסיעה'] || '15 דקות'),
        wazeUrl: String(row['Waze'] || 'https://waze.com'),
        items: parsedItems.length > 0 ? parsedItems : [{ sku: '10002', name: 'שק מלט אפור', quantity: 50, unit: 'שק', price: 38 }],
        blowStatus: String(row['בלות'] || 'מאושר'),
        palletStatus: String(row['משטחים'] || 'ללא משטחים'),
        status: (row['סטטוס'] as any) || 'בתהליך אספקה',
        timestamp: String(row['תאריך'] || new Date().toLocaleTimeString('he-IL')),
      };

      allOrders.push(orderRecord);

      const custKey = customerNumber || cleanName;
      if (!customerMap.has(custKey)) {
        customerMap.set(custKey, {
          id: customerNumber ? `CUST-${customerNumber}` : `CUST-${1000 + idx}`,
          name: cleanName,
          phone: orderRecord.customerPhone,
          address: orderRecord.address,
          creditLimit: '₪100,000',
          currentBalance: '₪0',
          driveFolderUrl: `https://drive.google.com/drive/folders/saban_${custKey.toLowerCase()}`,
          comaxId: customerNumber || '519205',
          createdAt: new Date().toISOString().split('T')[0],
          notes: 'נוצר אוטומטית מסנכרון גליון הזמנות',
          activeOrdersCount: 1,
        });
      }
    });

    return {
      orders: allOrders,
      customers: Array.from(customerMap.values()),
    };
  } catch (error) {
    console.warn('[sheetSync] Exception in fetchLiveOrderLogAndCustomers:', error);
    return { orders: [], customers: [] };
  }
}
