/**
 * Client Auth Types & Session Models
 * photo.emre.xyz
 */

import type { NostrSigner, NostrSignerType } from '../signer/types';

export type AuthStatus = 'idle' | 'connecting' | 'authenticated' | 'error';

export interface AuthUser {
  /** 64-character lowercase hex public key */
  pubkey: string;
  /** Bech32 npub representation */
  npub: string;
  /** Method of authentication */
  type: NostrSignerType;
  /** Whether the authenticated pubkey matches ADMIN_PUBKEY */
  isAdmin: boolean;
  /** Profile display name (Kind 0) */
  displayName?: string;
  /** Profile username/handle (Kind 0) */
  name?: string;
  /** NIP-05 verified address identifier (e.g. user@domain.com) */
  nip05?: string;
  /** Profile picture URL */
  picture?: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  signer: NostrSigner | null;
  status: AuthStatus;
  error: string | null;
  loginWithNip07: () => Promise<void>;
  loginWithBunker: (bunkerUri: string) => Promise<void>;
  loginWithPrivateKey: (nsecOrHex: string) => Promise<void>;
  loginReadOnly: (npubOrHex: string) => Promise<void>;
  logout: () => void;
}
