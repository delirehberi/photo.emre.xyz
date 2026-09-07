/**
 * In-Memory Private Key Signer
 * photo.emre.xyz
 */

import { getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import * as nip44 from 'nostr-tools/nip44';
import type { EventTemplate, NostrEvent } from '../types';
import type { NostrSigner, NostrSignerType } from './types';

export class PrivateKeySigner implements NostrSigner {
  public readonly type: NostrSignerType = 'privateKey';
  private readonly secretKey: Uint8Array;
  private cachedPubkey: string | null = null;

  constructor(secretKey: Uint8Array) {
    if (!(secretKey instanceof Uint8Array) || secretKey.length !== 32) {
      throw new Error(
        'PrivateKeySigner requires a 32-byte Uint8Array secret key',
      );
    }
    this.secretKey = secretKey;
  }

  public async getPublicKey(): Promise<string> {
    if (!this.cachedPubkey) {
      this.cachedPubkey = getPublicKey(this.secretKey);
    }
    return this.cachedPubkey;
  }

  public async signEvent(template: EventTemplate): Promise<NostrEvent> {
    return finalizeEvent(template, this.secretKey);
  }

  public async nip44Encrypt(
    pubkey: string,
    plaintext: string,
  ): Promise<string> {
    const conversationKey = nip44.v2.utils.getConversationKey(
      this.secretKey,
      pubkey,
    );
    return nip44.v2.encrypt(plaintext, conversationKey);
  }

  public async nip44Decrypt(
    pubkey: string,
    ciphertext: string,
  ): Promise<string> {
    const conversationKey = nip44.v2.utils.getConversationKey(
      this.secretKey,
      pubkey,
    );
    return nip44.v2.decrypt(ciphertext, conversationKey);
  }

  /**
   * Helper to retrieve raw secret key for internal operations like backups
   */
  public getSecretKey(): Uint8Array {
    return this.secretKey;
  }
}
