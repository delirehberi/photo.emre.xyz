/**
 * NIP-07 Browser Extension Signer (window.nostr)
 * photo.emre.xyz
 */

import { isHex32 } from 'nostr-tools/utils';
import type { EventTemplate, NostrEvent } from '../types';
import type { NostrSigner, NostrSignerType } from './types';

export interface Nip07WindowNostr {
  getPublicKey(): Promise<string>;
  signEvent(event: EventTemplate): Promise<NostrEvent>;
  nip04?: {
    encrypt(pubkey: string, plaintext: string): Promise<string>;
    decrypt(pubkey: string, ciphertext: string): Promise<string>;
  };
  nip44?: {
    encrypt(pubkey: string, plaintext: string): Promise<string>;
    decrypt(pubkey: string, ciphertext: string): Promise<string>;
  };
}

declare global {
  interface Window {
    nostr?: Nip07WindowNostr;
  }
}

export class Nip07Signer implements NostrSigner {
  public readonly type: NostrSignerType = 'nip07';
  private cachedPubkey: string | null = null;

  /**
   * Helper to determine whether a NIP-07 extension is detected in the current window.
   */
  public static isAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.nostr !== 'undefined';
  }

  /**
   * Gets the window.nostr provider or throws a helpful error.
   */
  private getProvider(): Nip07WindowNostr {
    if (!Nip07Signer.isAvailable() || !window.nostr) {
      throw new Error(
        'Nostr extension (NIP-07) not found. Please install an extension such as Alby or nos2x to log in.',
      );
    }
    return window.nostr;
  }

  public async getPublicKey(): Promise<string> {
    if (this.cachedPubkey) {
      return this.cachedPubkey;
    }

    const provider = this.getProvider();
    try {
      const pubkey = await provider.getPublicKey();
      const clean = pubkey.trim().toLowerCase();
      if (!isHex32(clean)) {
        throw new Error(
          'NIP-07 extension returned an invalid public key format',
        );
      }
      this.cachedPubkey = clean;
      return this.cachedPubkey;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to retrieve public key from extension: ${msg}`);
    }
  }

  public async signEvent(template: EventTemplate): Promise<NostrEvent> {
    const provider = this.getProvider();
    try {
      const signedEvent = await provider.signEvent(template);
      return signedEvent;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to sign event via extension: ${msg}`);
    }
  }

  public async nip04Encrypt(
    pubkey: string,
    plaintext: string,
  ): Promise<string> {
    const provider = this.getProvider();
    if (!provider.nip04?.encrypt) {
      throw new Error(
        'NIP-04 encryption not supported by the connected extension',
      );
    }
    return provider.nip04.encrypt(pubkey, plaintext);
  }

  public async nip04Decrypt(
    pubkey: string,
    ciphertext: string,
  ): Promise<string> {
    const provider = this.getProvider();
    if (!provider.nip04?.decrypt) {
      throw new Error(
        'NIP-04 decryption not supported by the connected extension',
      );
    }
    return provider.nip04.decrypt(pubkey, ciphertext);
  }

  public async nip44Encrypt(
    pubkey: string,
    plaintext: string,
  ): Promise<string> {
    const provider = this.getProvider();
    if (!provider.nip44?.encrypt) {
      throw new Error(
        'NIP-44 encryption not supported by the connected extension',
      );
    }
    return provider.nip44.encrypt(pubkey, plaintext);
  }

  public async nip44Decrypt(
    pubkey: string,
    ciphertext: string,
  ): Promise<string> {
    const provider = this.getProvider();
    if (!provider.nip44?.decrypt) {
      throw new Error(
        'NIP-44 decryption not supported by the connected extension',
      );
    }
    return provider.nip44.decrypt(pubkey, ciphertext);
  }
}
