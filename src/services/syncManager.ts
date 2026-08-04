/**
 * Enterprise Synchronization State Manager
 * Coordinates bidirectional state sync between local server listener (C:\ap94)
 * and Google Sheets via the Apps Script Router.
 */

import { fetchLiveLogisticsDictionary, fetchLiveOrderLogAndCustomers } from './sheetSync';
import { gasPostRequest } from './gasRouter';
import { OrderRecord, CustomerRecord, LogisticsDictionaryItem } from '../types';

export interface SyncStateResult {
  orders: OrderRecord[];
  customers: CustomerRecord[];
  dictionary: LogisticsDictionaryItem[];
  lastSyncedAt: string;
  success: boolean;
}

export class SyncManager {
  private isSyncing = false;
  private lastSyncedAt: string | null = null;

  /**
   * Performs full bidirectional sync between Google Sheets and local environment
   */
  public async syncAllData(): Promise<SyncStateResult> {
    if (this.isSyncing) {
      return {
        orders: [],
        customers: [],
        dictionary: [],
        lastSyncedAt: this.lastSyncedAt || new Date().toISOString(),
        success: false,
      };
    }

    this.isSyncing = true;
    try {
      // 1. Pull live order log & customers from Google Sheets
      const { orders, customers } = await fetchLiveOrderLogAndCustomers();

      // 2. Pull live logistics dictionary from Google Sheets
      const dictionary = await fetchLiveLogisticsDictionary();

      this.lastSyncedAt = new Date().toISOString();
      this.isSyncing = false;

      return {
        orders,
        customers,
        dictionary,
        lastSyncedAt: this.lastSyncedAt,
        success: true,
      };
    } catch (err) {
      console.warn('[SyncManager] Bidirectional sync warning:', err);
      this.isSyncing = false;
      return {
        orders: [],
        customers: [],
        dictionary: [],
        lastSyncedAt: this.lastSyncedAt || new Date().toISOString(),
        success: false,
      };
    }
  }

  /**
   * Pushes a newly created local order record to Google Sheets
   */
  public async pushOrderToSheets(order: OrderRecord): Promise<boolean> {
    try {
      const payload = {
        action: 'appendRow',
        sheetName: 'לוג_הזמנות_מערכת',
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        phone: order.customerPhone,
        groupJid: order.groupJid || '',
        warehouse: order.warehouse,
        address: order.address,
        driver: order.driverName,
        itemsText: order.items.map((i) => `${i.name} x${i.quantity}`).join(', '),
        status: order.status,
        timestamp: order.timestamp || new Date().toLocaleString('he-IL'),
      };

      const res = await gasPostRequest('appendRow', payload);
      return res.success;
    } catch (err) {
      console.warn('[SyncManager] Failed to push order to Sheets:', err);
      return false;
    }
  }

  /**
   * Pushes local server runtime status update to Google Sheets
   */
  public async pushLocalServerStatus(statusData: Record<string, any>): Promise<boolean> {
    try {
      const res = await gasPostRequest('syncLocalServer', statusData);
      return res.success;
    } catch (err) {
      console.warn('[SyncManager] Failed to push local server status:', err);
      return false;
    }
  }
}

export const syncManager = new SyncManager();
