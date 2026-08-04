/**
 * Enterprise Google Apps Script (GAS) Communication Router
 * Centralizes all remote HTTP communication with Google Apps Script Webhooks.
 * Supports action routing: fetchSheets, syncLocalServer, getMessages, sendMessage, appendRow.
 * Features exponential backoff retries, failover handling, and silent error resilience.
 */

export const PRIMARY_GAS_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbyQUaDDWSiG6osVHQ8ZQEdXqVNBFFoaFcLxr6iJvJYZpsc8TSfQ_wjvc5HMtKyLsyG80A/exec';

export function getAppsScriptUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GAS_WEBHOOK_URL) {
    return import.meta.env.VITE_GAS_WEBHOOK_URL;
  }
  return PRIMARY_GAS_WEBHOOK_URL;
}

export interface GasRouterResponse<T = any> {
  success: boolean;
  data: T[];
  messages: any[];
  chats: any[];
  events: any[];
  message?: string;
  error?: string;
}

export type GasActionType = 'fetchSheets' | 'syncLocalServer' | 'getMessages' | 'sendMessage' | 'appendRow';

/**
 * Executes a GET request against the Google Apps Script Webhook with action routing and exponential backoff
 */
export async function gasGetRequest<T = any>(
  action: GasActionType,
  params: Record<string, string> = {},
  maxRetries = 2
): Promise<GasRouterResponse<T>> {
  const baseUrl = getAppsScriptUrl();
  const queryParams = new URLSearchParams({ action, ...params });
  const targetUrl = `${baseUrl}?${queryParams.toString()}`;

  let attempt = 0;
  let delay = 500;

  while (attempt <= maxRetries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(targetUrl, {
        method: 'GET',
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (response && response.ok) {
        const text = await response.text().catch(() => '');
        if (text) {
          try {
            const parsed = JSON.parse(text);
            const dataArray = Array.isArray(parsed)
              ? parsed
              : Array.isArray(parsed?.data)
              ? parsed.data
              : [];
            return {
              success: true,
              data: dataArray,
              messages: Array.isArray(parsed?.messages) ? parsed.messages : [],
              chats: Array.isArray(parsed?.chats) ? parsed.chats : [],
              events: Array.isArray(parsed?.events) ? parsed.events : [],
              message: parsed?.message || 'Success',
            };
          } catch {
            // Non-JSON response received cleanly
          }
        }
      }
    } catch (err) {
      console.warn(`[gasRouter] Attempt ${attempt + 1} failed for action "${action}":`, err);
    }

    attempt++;
    if (attempt <= maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  // Graceful fallback response - NEVER throw or break UI
  return {
    success: false,
    data: [],
    messages: [],
    chats: [],
    events: [],
    message: 'GAS request failed gracefully after retries',
  };
}

/**
 * Executes a POST request against the Google Apps Script Webhook with payload and fallback modes
 */
export async function gasPostRequest<T = any>(
  action: GasActionType,
  payload: Record<string, any>,
  maxRetries = 2
): Promise<GasRouterResponse<T>> {
  const baseUrl = getAppsScriptUrl();
  const fullPayload = JSON.stringify({ action, ...payload, timestamp: new Date().toISOString() });

  let attempt = 0;
  let delay = 500;

  while (attempt <= maxRetries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // text/plain prevents CORS preflight issues with GAS
        body: fullPayload,
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (response && response.ok) {
        const text = await response.text().catch(() => '');
        if (text) {
          try {
            const parsed = JSON.parse(text);
            return {
              success: true,
              data: Array.isArray(parsed?.data) ? parsed.data : [],
              messages: Array.isArray(parsed?.messages) ? parsed.messages : [],
              chats: Array.isArray(parsed?.chats) ? parsed.chats : [],
              events: Array.isArray(parsed?.events) ? parsed.events : [],
              message: parsed?.message || 'POST succeeded',
            };
          } catch {
            return {
              success: true,
              data: [],
              messages: [],
              chats: [],
              events: [],
              message: 'POST payload sent successfully',
            };
          }
        }
      }
    } catch (err) {
      console.warn(`[gasRouter] POST Attempt ${attempt + 1} failed for action "${action}":`, err);
    }

    attempt++;
    if (attempt <= maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  return {
    success: false,
    data: [],
    messages: [],
    chats: [],
    events: [],
    message: 'GAS POST request completed with graceful fallback',
  };
}
