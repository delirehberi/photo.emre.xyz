/**
 * Nostr Unified Signer Interface & Types
 * photo.emre.xyz
 */

import type { EventTemplate, NostrEvent } from '../types';

export type NostrSignerType = 'nip07' | 'nip46' | 'privateKey' | 'readOnly';

export interface NostrSigner {
  /** Identifier for the signer mechanism */
  readonly type: NostrSignerType;

  /**
   * Retrieves the 64-character lowercase hex public key associated with the signer.
   */
  getPublicKey(): Promise<string>;

  /**
   * Cryptographically signs an event template and returns the finalized NostrEvent.
   * Throws an error if the signer is read-only or if signing is denied.
   */
  signEvent(template: EventTemplate): Promise<NostrEvent>;

  /**
   * Optional NIP-04 encryption (hex pubkey recipient).
   */
  nip04Encrypt?(pubkey: string, plaintext: string): Promise<string>;

  /**
   * Optional NIP-04 decryption (hex pubkey sender).
   */
  nip04Decrypt?(pubkey: string, ciphertext: string): Promise<string>;

  /**
   * Optional NIP-44 encryption.
   */
  nip44Encrypt?(pubkey: string, plaintext: string): Promise<string>;

  /**
   * Optional NIP-44 decryption.
   */
  nip44Decrypt?(pubkey: string, ciphertext: string): Promise<string>;
}
