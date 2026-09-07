/**
 * Rate Enforcement & Pricing Engine
 * photo.emre.xyz
 *
 * Enforces action rate fees (100 / 100 / 21 sats) with zero-sat admin bypass.
 */

import { isAdmin } from '../nostr/admin';
import { LIGHTNING_FEES, IS_TEST_MODE } from './config';
import type { MonetizedAction, FeeQuote } from './types';

export interface RateCalculationOptions {
  /** Quantity of items (defaults to 1, used primarily for upload_image) */
  count?: number;
  /** Public key of the authenticated user requesting the action */
  userPubkey?: string | null;
  /** Explicit override for test mode (defaults to IS_TEST_MODE config) */
  isTestMode?: boolean;
}

/**
 * Calculates the exact fee quote in satoshis for a requested platform action.
 * Enforces automatic zero-cost (0 sats) exemption for the platform administrator
 * and for all users when test mode is active.
 */
export function calculateActionFee(
  action: MonetizedAction,
  options: RateCalculationOptions = {},
): FeeQuote {
  const { count = 1, userPubkey, isTestMode } = options;
  const activeTestMode = isTestMode ?? IS_TEST_MODE;

  // Sanitize quantity to ensure it's a positive integer
  const safeQuantity = Math.max(1, Math.floor(count));

  // Determine base unit fee
  let unitFeeSats: number;
  let actionDescription: string;

  switch (action) {
    case 'create_organization':
      unitFeeSats = LIGHTNING_FEES.CREATE_ORGANIZATION;
      actionDescription = 'Create Organization Profile (Kind 0)';
      break;
    case 'create_album':
      unitFeeSats = LIGHTNING_FEES.CREATE_ALBUM;
      actionDescription = 'Create Event Album (Kind 31922)';
      break;
    case 'upload_image':
      unitFeeSats = LIGHTNING_FEES.UPLOAD_IMAGE_PER_ITEM;
      actionDescription = `Upload ${safeQuantity} Photo${safeQuantity > 1 ? 's' : ''} (Kind 1063)`;
      break;
    default: {
      const exhaustiveCheck: never = action;
      throw new Error(`Unknown monetized action: ${exhaustiveCheck}`);
    }
  }

  // Check administrator exemption rule and test mode
  const userIsAdmin = isAdmin(userPubkey);
  const isExempt = userIsAdmin || activeTestMode;

  const totalSats = isExempt
    ? 0
    : action === 'upload_image'
      ? unitFeeSats * safeQuantity
      : unitFeeSats;

  let description: string;
  if (userIsAdmin) {
    description = `${actionDescription} (Admin Exemption: 0 sats)`;
  } else if (activeTestMode) {
    description = `${actionDescription} (Test Mode: Free / 0 sats)`;
  } else {
    description = `${actionDescription} (${totalSats} sats)`;
  }

  return {
    action,
    quantity: safeQuantity,
    unitFeeSats,
    totalSats,
    isExempt,
    description,
  };
}
