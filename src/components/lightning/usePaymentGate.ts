/**
 * Action Monetization Payment Gate Hook
 * photo.emre.xyz
 *
 * Intercepts monetized platform actions, checks admin exemption,
 * prompts payment modal if fees are required, and resolves payment proof.
 */

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/nostr/auth/context';
import { calculateActionFee } from '@/lib/lightning/rates';
import type {
  MonetizedAction,
  PaymentProof,
  FeeQuote,
} from '@/lib/lightning/types';

export interface UsePaymentGateReturn {
  /** Intercepts an action and ensures payment or admin bypass before proceeding */
  gateAction: (
    action: MonetizedAction,
    count?: number,
  ) => Promise<PaymentProof>;
  /** Props to bind directly to <LightningPaymentModal /> */
  modalProps: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    action: MonetizedAction;
    count: number;
    onSettled: (proof: PaymentProof) => void;
  };
  /** Whether the payment modal is currently visible */
  isModalOpen: boolean;
  /** Active fee quote for the pending action */
  currentQuote: FeeQuote | null;
}

export function usePaymentGate(): UsePaymentGateReturn {
  const { user } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<MonetizedAction>(
    'create_organization',
  );
  const [currentCount, setCurrentCount] = useState(1);
  const [currentQuote, setCurrentQuote] = useState<FeeQuote | null>(null);

  // Promise resolvers for asynchronous gating
  const resolveRef = useRef<((proof: PaymentProof) => void) | null>(null);
  const rejectRef = useRef<((err: Error) => void) | null>(null);

  const gateAction = useCallback(
    async (action: MonetizedAction, count = 1): Promise<PaymentProof> => {
      if (!user) {
        throw new Error(
          'Authentication required. Please connect your Nostr identity first.',
        );
      }

      const quote = calculateActionFee(action, {
        count,
        userPubkey: user.pubkey,
      });
      setCurrentAction(action);
      setCurrentCount(count);
      setCurrentQuote(quote);

      // 1. Exemption Rule (Admin or Test Mode -> 0 sats -> Immediate Resolution)
      if (quote.isExempt) {
        return {
          method: user.isAdmin ? 'admin_bypass' : 'test_mode',
          amountSats: 0,
          settledAt: Math.floor(Date.now() / 1000),
          payerPubkey: user.pubkey,
        };
      }

      // 2. Non-Admin -> Open Payment Modal and await verified settlement
      return new Promise<PaymentProof>((resolve, reject) => {
        resolveRef.current = resolve;
        rejectRef.current = reject;
        setIsModalOpen(true);
      });
    },
    [user],
  );

  const handleSettled = useCallback((proof: PaymentProof) => {
    if (resolveRef.current) {
      resolveRef.current(proof);
      resolveRef.current = null;
      rejectRef.current = null;
    }
    setIsModalOpen(false);
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsModalOpen(open);
    if (!open && rejectRef.current) {
      rejectRef.current(new Error('Payment was cancelled by user.'));
      resolveRef.current = null;
      rejectRef.current = null;
    }
  }, []);

  return {
    gateAction,
    modalProps: {
      open: isModalOpen,
      onOpenChange: handleOpenChange,
      action: currentAction,
      count: currentCount,
      onSettled: handleSettled,
    },
    isModalOpen,
    currentQuote,
  };
}
