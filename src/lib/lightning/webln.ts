/**
 * WebLN Browser Extension Payment Provider
 * photo.emre.xyz
 *
 * Implements one-click WebLN settlement (Alby, Mutiny, etc.)
 */

import type { WebLNProvider, WebLNSendPaymentResponse } from './types';

/**
 * Checks whether a standard WebLN provider is injected in the client window.
 */
export function isWebLNAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean(window.webln);
}

/**
 * Retrieves the injected WebLN provider or throws a descriptive error.
 */
export function getWebLNProvider(): WebLNProvider {
  if (!isWebLNAvailable() || !window.webln) {
    throw new Error(
      'WebLN provider not detected. Please install a WebLN extension (e.g. Alby) or choose another payment method.',
    );
  }
  return window.webln;
}

/**
 * Triggers a WebLN payment for a BOLT-11 invoice.
 * Prompts user wallet authorization and returns verified preimage.
 */
export async function payWithWebLN(
  invoice: string,
): Promise<WebLNSendPaymentResponse> {
  const cleanInvoice = invoice.trim();
  if (!cleanInvoice) {
    throw new Error('BOLT-11 invoice string is empty');
  }

  const provider = getWebLNProvider();

  try {
    // 1. Request wallet permission / connection
    await provider.enable();

    // 2. Request payment execution
    const response = await provider.sendPayment(cleanInvoice);

    if (!response || typeof response !== 'object') {
      throw new Error('Malformed WebLN payment response');
    }

    if (!response.preimage || typeof response.preimage !== 'string') {
      throw new Error('WebLN payment did not return a valid preimage');
    }

    return response;
  } catch (err: unknown) {
    if (err instanceof Error) {
      // Common WebLN user rejection message normalization
      if (
        err.message.toLowerCase().includes('user rejected') ||
        err.message.toLowerCase().includes('cancelled') ||
        err.message.toLowerCase().includes('canceled')
      ) {
        throw new Error('Payment cancelled by user in WebLN extension.');
      }
      throw err;
    }
    throw new Error(String(err));
  }
}
