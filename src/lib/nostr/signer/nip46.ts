/**
 * NIP-46 Nostr Connect / Bunker Signer
 * photo.emre.xyz
 */

import { SimplePool } from 'nostr-tools/pool';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import {
  BunkerSigner,
  parseBunkerInput,
  createNostrConnectURI,
} from 'nostr-tools/nip46';
import { bytesToHex } from 'nostr-tools/utils';
import { DEFAULT_RELAYS } from '../config';
import type { EventTemplate, NostrEvent } from '../types';
import type { NostrSigner, NostrSignerType } from './types';

export interface BunkerConnectionInfo {
  bunkerPubkey: string;
  relays: string[];
  secret: string | null;
  clientSecretKey: Uint8Array;
  clientPubkey: string;
}

export class Nip46Signer implements NostrSigner {
  public readonly type: NostrSignerType = 'nip46';
  private bunkerSigner: BunkerSigner;
  private connectionInfo: BunkerConnectionInfo;
  private cachedPubkey: string | null = null;

  constructor(
    bunkerSigner: BunkerSigner,
    connectionInfo: BunkerConnectionInfo,
  ) {
    this.bunkerSigner = bunkerSigner;
    this.connectionInfo = connectionInfo;
  }

  /**
   * Initializes a Nip46Signer from a bunker:// connection string or NIP-05 bunker identifier.
   */
  public static async createFromBunkerInput(
    input: string,
    existingClientSecretKey?: Uint8Array,
    customPool?: SimplePool,
  ): Promise<Nip46Signer> {
    const bunkerPointer = await parseBunkerInput(input.trim());
    if (!bunkerPointer || !bunkerPointer.pubkey) {
      throw new Error(
        'Invalid Bunker connection string or unresolvable Bunker profile.',
      );
    }

    const clientSecretKey = existingClientSecretKey || generateSecretKey();
    const clientPubkey = getPublicKey(clientSecretKey);
    const relays =
      bunkerPointer.relays && bunkerPointer.relays.length > 0
        ? bunkerPointer.relays
        : Array.from(DEFAULT_RELAYS);

    const bunkerSigner = BunkerSigner.fromBunker(
      clientSecretKey,
      {
        pubkey: bunkerPointer.pubkey,
        relays,
        secret: bunkerPointer.secret ?? null,
      },
      {
        pool: customPool || new SimplePool(),
      },
    );

    await bunkerSigner.connect();

    return new Nip46Signer(bunkerSigner, {
      bunkerPubkey: bunkerPointer.pubkey,
      relays,
      secret: bunkerPointer.secret || null,
      clientSecretKey,
      clientPubkey,
    });
  }

  /**
   * Generates a nostrconnect:// pairing URI for mobile bunker apps (e.g. Amber) to scan.
   */
  public static createPairingSession(
    relays: string[] = Array.from(DEFAULT_RELAYS),
    existingClientSecretKey?: Uint8Array,
  ): {
    uri: string;
    clientSecretKey: Uint8Array;
    clientPubkey: string;
    secret: string;
  } {
    const clientSecretKey = existingClientSecretKey || generateSecretKey();
    const clientPubkey = getPublicKey(clientSecretKey);
    const secret = bytesToHex(generateSecretKey()).slice(0, 16);

    const uri = createNostrConnectURI({
      clientPubkey,
      relays,
      secret,
      perms: [
        'sign_event',
        'nip04_encrypt',
        'nip04_decrypt',
        'nip44_encrypt',
        'nip44_decrypt',
      ],
      name: 'photo.emre.xyz',
      url: 'https://photo.emre.xyz',
    });

    return {
      uri,
      clientSecretKey,
      clientPubkey,
      secret,
    };
  }

  public async getPublicKey(): Promise<string> {
    if (this.cachedPubkey) {
      return this.cachedPubkey;
    }

    try {
      const pubkey = await this.bunkerSigner.getPublicKey();
      this.cachedPubkey = pubkey.toLowerCase();
      return this.cachedPubkey;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to retrieve public key from Bunker: ${msg}`);
    }
  }

  public async signEvent(template: EventTemplate): Promise<NostrEvent> {
    try {
      const signedEvent = await this.bunkerSigner.signEvent(template);
      return signedEvent;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to sign event via Bunker: ${msg}`);
    }
  }

  public async nip04Encrypt(
    pubkey: string,
    plaintext: string,
  ): Promise<string> {
    return this.bunkerSigner.nip04Encrypt(pubkey, plaintext);
  }

  public async nip04Decrypt(
    pubkey: string,
    ciphertext: string,
  ): Promise<string> {
    return this.bunkerSigner.nip04Decrypt(pubkey, ciphertext);
  }

  public async nip44Encrypt(
    pubkey: string,
    plaintext: string,
  ): Promise<string> {
    return this.bunkerSigner.nip44Encrypt(pubkey, plaintext);
  }

  public async nip44Decrypt(
    pubkey: string,
    ciphertext: string,
  ): Promise<string> {
    return this.bunkerSigner.nip44Decrypt(pubkey, ciphertext);
  }

  public getConnectionInfo(): BunkerConnectionInfo {
    return this.connectionInfo;
  }

  public close(): void {
    try {
      this.bunkerSigner.close();
    } catch {
      // Ignore close errors
    }
  }
}
