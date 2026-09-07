/**
 * Read-Only Public Key Signer (Observer Mode)
 * photo.emre.xyz
 */

import { isHex32 } from 'nostr-tools/utils';
import type { EventTemplate, NostrEvent } from '../types';
import type { NostrSigner, NostrSignerType } from './types';

export class ReadOnlySigner implements NostrSigner {
  public readonly type: NostrSignerType = 'readOnly';
  private readonly pubkey: string;

  constructor(pubkey: string) {
    const clean = pubkey.trim().toLowerCase();
    if (!isHex32(clean)) {
      throw new Error(
        'ReadOnlySigner requires a valid 64-character hex public key',
      );
    }
    this.pubkey = clean;
  }

  public async getPublicKey(): Promise<string> {
    return this.pubkey;
  }

  public async signEvent(_template: EventTemplate): Promise<NostrEvent> {
    throw new Error(
      'Cannot sign events in Read-Only mode. Please authenticate with an extension, bunker, or keypair.',
    );
  }
}
