/**
 * React Auth Context & Hook for Nostr Authentication
 * photo.emre.xyz
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { isAdmin } from '../admin';
import {
  parseKeyInput,
  pubkeyToNpub,
  nsecToSecretKey,
  hexToSecretKey,
} from '../keys';
import {
  Nip07Signer,
  Nip46Signer,
  PrivateKeySigner,
  ReadOnlySigner,
  type NostrSigner,
  type NostrSignerType,
} from '../signer';
import { getSharedRelayPool } from '../pool';
import { DEFAULT_RELAYS, NOSTR_KINDS } from '../config';
import { parseProfileEvent } from '../schemas/profile';
import type { AuthContextValue, AuthStatus, AuthUser } from './types';

const STORAGE_KEYS = {
  TYPE: 'photo_auth_type',
  PUBKEY: 'photo_auth_pubkey',
  BUNKER_URI: 'photo_auth_bunker_uri',
  SESSION_SEC: 'photo_auth_session_sec',
} as const;

export const AUTH_CHANGE_EVENT = 'photo:auth:change';

// Module-level shared active state across Astro islands in the same window
interface SharedAuthState {
  user: AuthUser | null;
  signer: NostrSigner | null;
  status: AuthStatus;
  error: string | null;
}

let globalAuthState: SharedAuthState = {
  user: null,
  signer: null,
  status:
    typeof window !== 'undefined' &&
    window.localStorage?.getItem(STORAGE_KEYS.TYPE)
      ? 'connecting'
      : 'idle',
  error: null,
};

const authListeners = new Set<(state: SharedAuthState) => void>();

function broadcastAuthState(state: SharedAuthState) {
  globalAuthState = state;
  for (const listener of authListeners) {
    try {
      listener(state);
    } catch {
      // Ignore listener error
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(AUTH_CHANGE_EVENT, {
        detail: {
          user: state.user,
          status: state.status,
          error: state.error,
        },
      }),
    );
  }
}

interface CachedProfile {
  displayName?: string;
  name?: string;
  nip05?: string;
  picture?: string;
}

function getCachedProfile(pubkey: string): CachedProfile | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(`photo_profile_${pubkey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data || null;
  } catch {
    return null;
  }
}

function setCachedProfile(pubkey: string, data: CachedProfile): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      `photo_profile_${pubkey}`,
      JSON.stringify({ data, cachedAt: Date.now() }),
    );
  } catch {
    // Ignore storage quota errors
  }
}

function buildAuthUser(
  pubkey: string,
  type: NostrSignerType,
  isAdminUser: boolean,
): AuthUser {
  const cached = getCachedProfile(pubkey);
  return {
    pubkey,
    npub: pubkeyToNpub(pubkey),
    type,
    isAdmin: isAdminUser,
    displayName: cached?.displayName,
    name: cached?.name,
    nip05: cached?.nip05,
    picture: cached?.picture,
  };
}

async function resolveAndApplyProfile(
  pubkey: string,
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>,
) {
  if (typeof window === 'undefined') return;
  try {
    const pool = getSharedRelayPool();
    const event = await pool.queryOne(
      DEFAULT_RELAYS,
      { kinds: [NOSTR_KINDS.METADATA], authors: [pubkey] },
      { timeoutMs: 3000 },
    );
    if (!event) return;

    const profile = parseProfileEvent(event);
    const profileData: CachedProfile = {
      displayName: profile.displayName || profile.name,
      name: profile.name,
      nip05: profile.nip05,
      picture: profile.picture,
    };

    setCachedProfile(pubkey, profileData);

    if (globalAuthState.user && globalAuthState.user.pubkey === pubkey) {
      const updatedUser: AuthUser = {
        ...globalAuthState.user,
        displayName: profileData.displayName,
        name: profileData.name,
        nip05: profileData.nip05,
        picture: profileData.picture,
      };
      setUser(updatedUser);
      broadcastAuthState({
        ...globalAuthState,
        user: updatedUser,
      });
    }
  } catch {
    // Fail silently on profile resolution error
  }
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const DEFAULT_AUTH_CONTEXT: AuthContextValue = {
  user: null,
  signer: null,
  status: 'idle',
  error: null,
  loginWithNip07: async () => {},
  loginWithBunker: async () => {},
  loginWithPrivateKey: async () => {},
  loginReadOnly: async () => {},
  logout: () => {},
};

export interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(() => globalAuthState.user);
  const [signer, setSigner] = useState<NostrSigner | null>(
    () => globalAuthState.signer,
  );
  const [status, setStatus] = useState<AuthStatus>(
    () => globalAuthState.status,
  );
  const [error, setError] = useState<string | null>(
    () => globalAuthState.error,
  );

  const clearStorage = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEYS.TYPE);
        window.localStorage.removeItem(STORAGE_KEYS.PUBKEY);
        window.localStorage.removeItem(STORAGE_KEYS.BUNKER_URI);
      }
      if (window.sessionStorage) {
        window.sessionStorage.removeItem(STORAGE_KEYS.SESSION_SEC);
      }
    }
  }, []);

  const logout = useCallback(() => {
    if (signer && signer.type === 'nip46' && 'close' in signer) {
      try {
        (signer as Nip46Signer).close();
      } catch {
        // Ignore close error
      }
    }
    clearStorage();
    const newState: SharedAuthState = {
      user: null,
      signer: null,
      status: 'idle',
      error: null,
    };
    setUser(null);
    setSigner(null);
    setStatus('idle');
    setError(null);
    broadcastAuthState(newState);

    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }, [signer, clearStorage]);

  const loginWithNip07 = useCallback(async () => {
    setStatus('connecting');
    setError(null);
    broadcastAuthState({
      ...globalAuthState,
      status: 'connecting',
      error: null,
    });

    try {
      const nip07Signer = new Nip07Signer();
      const pubkey = await nip07Signer.getPublicKey();
      const isUserAdmin = isAdmin(pubkey);

      const authUser = buildAuthUser(pubkey, 'nip07', isUserAdmin);

      const newState: SharedAuthState = {
        user: authUser,
        signer: nip07Signer,
        status: 'authenticated',
        error: null,
      };

      setUser(authUser);
      setSigner(nip07Signer);
      setStatus('authenticated');
      broadcastAuthState(newState);
      resolveAndApplyProfile(pubkey, setUser);

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEYS.TYPE, 'nip07');
        window.localStorage.setItem(STORAGE_KEYS.PUBKEY, pubkey);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus('error');
      broadcastAuthState({
        ...globalAuthState,
        status: 'error',
        error: msg,
      });
      throw err;
    }
  }, []);

  const loginWithBunker = useCallback(async (bunkerUri: string) => {
    setStatus('connecting');
    setError(null);
    broadcastAuthState({
      ...globalAuthState,
      status: 'connecting',
      error: null,
    });

    try {
      const nip46Signer = await Nip46Signer.createFromBunkerInput(bunkerUri);
      const pubkey = await nip46Signer.getPublicKey();
      const isUserAdmin = isAdmin(pubkey);

      const authUser = buildAuthUser(pubkey, 'nip46', isUserAdmin);

      const newState: SharedAuthState = {
        user: authUser,
        signer: nip46Signer,
        status: 'authenticated',
        error: null,
      };

      setUser(authUser);
      setSigner(nip46Signer);
      setStatus('authenticated');
      broadcastAuthState(newState);
      resolveAndApplyProfile(pubkey, setUser);

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEYS.TYPE, 'nip46');
        window.localStorage.setItem(STORAGE_KEYS.PUBKEY, pubkey);
        window.localStorage.setItem(STORAGE_KEYS.BUNKER_URI, bunkerUri);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus('error');
      broadcastAuthState({
        ...globalAuthState,
        status: 'error',
        error: msg,
      });
      throw err;
    }
  }, []);

  const loginWithPrivateKey = useCallback(async (nsecOrHex: string) => {
    setStatus('connecting');
    setError(null);
    broadcastAuthState({
      ...globalAuthState,
      status: 'connecting',
      error: null,
    });

    try {
      const parsed = parseKeyInput(nsecOrHex);
      let secretKey: Uint8Array;
      let rawHex: string;

      if (parsed.type === 'nsec') {
        secretKey = nsecToSecretKey(parsed.bech32!);
        rawHex = Array.from(secretKey)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      } else if (parsed.type === 'hex-pub' || parsed.type === 'hex-sec') {
        secretKey = hexToSecretKey(parsed.hex!);
        rawHex = parsed.hex!;
      } else {
        throw new Error(
          'Invalid private key: must be a valid nsec or 64-character hex secret key',
        );
      }

      const privKeySigner = new PrivateKeySigner(secretKey);
      const pubkey = await privKeySigner.getPublicKey();
      const isUserAdmin = isAdmin(pubkey);

      const authUser = buildAuthUser(pubkey, 'privateKey', isUserAdmin);

      const newState: SharedAuthState = {
        user: authUser,
        signer: privKeySigner,
        status: 'authenticated',
        error: null,
      };

      setUser(authUser);
      setSigner(privKeySigner);
      setStatus('authenticated');
      broadcastAuthState(newState);
      resolveAndApplyProfile(pubkey, setUser);

      if (typeof window !== 'undefined') {
        if (window.sessionStorage) {
          window.sessionStorage.setItem(STORAGE_KEYS.SESSION_SEC, rawHex);
        }
        if (window.localStorage) {
          window.localStorage.setItem(STORAGE_KEYS.TYPE, 'privateKey');
          window.localStorage.setItem(STORAGE_KEYS.PUBKEY, pubkey);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus('error');
      broadcastAuthState({
        ...globalAuthState,
        status: 'error',
        error: msg,
      });
      throw err;
    }
  }, []);

  const loginReadOnly = useCallback(async (npubOrHex: string) => {
    setStatus('connecting');
    setError(null);
    broadcastAuthState({
      ...globalAuthState,
      status: 'connecting',
      error: null,
    });

    try {
      const parsed = parseKeyInput(npubOrHex);
      if (!parsed.isValid || !parsed.hex) {
        throw new Error(
          'Invalid public key: must be a valid npub or 64-character hex public key',
        );
      }

      const pubkey = parsed.hex;
      const readOnlySigner = new ReadOnlySigner(pubkey);
      const isUserAdmin = isAdmin(pubkey);

      const authUser = buildAuthUser(pubkey, 'readOnly', isUserAdmin);

      const newState: SharedAuthState = {
        user: authUser,
        signer: readOnlySigner,
        status: 'authenticated',
        error: null,
      };

      setUser(authUser);
      setSigner(readOnlySigner);
      setStatus('authenticated');
      broadcastAuthState(newState);
      resolveAndApplyProfile(pubkey, setUser);

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEYS.TYPE, 'readOnly');
        window.localStorage.setItem(STORAGE_KEYS.PUBKEY, pubkey);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus('error');
      broadcastAuthState({
        ...globalAuthState,
        status: 'error',
        error: msg,
      });
      throw err;
    }
  }, []);

  // Listen for shared state changes across other Astro islands
  useEffect(() => {
    const handleStateUpdate = (state: SharedAuthState) => {
      setUser(state.user);
      setSigner(state.signer);
      setStatus(state.status);
      setError(state.error);
    };

    authListeners.add(handleStateUpdate);

    // If global state was updated before this island mounted, sync now
    if (globalAuthState.user && !user) {
      handleStateUpdate(globalAuthState);
    }

    return () => {
      authListeners.delete(handleStateUpdate);
    };
  }, [user]);

  // Auto-reconnect session on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // If already authenticated by another island, do not re-run
    if (globalAuthState.user) {
      setUser(globalAuthState.user);
      setSigner(globalAuthState.signer);
      setStatus(globalAuthState.status);
      return;
    }

    const savedType = window.localStorage?.getItem(STORAGE_KEYS.TYPE);
    const savedPubkey = window.localStorage?.getItem(STORAGE_KEYS.PUBKEY);
    const savedBunkerUri = window.localStorage?.getItem(
      STORAGE_KEYS.BUNKER_URI,
    );
    const savedSessionSec = window.sessionStorage?.getItem(
      STORAGE_KEYS.SESSION_SEC,
    );

    if (savedType === 'privateKey' && savedSessionSec) {
      loginWithPrivateKey(savedSessionSec).catch(() => clearStorage());
    } else if (savedType === 'nip07') {
      if (Nip07Signer.isAvailable()) {
        loginWithNip07().catch(() => clearStorage());
      } else {
        // Retry for up to 1 second in case browser extension injects window.nostr asynchronously
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (Nip07Signer.isAvailable()) {
            clearInterval(interval);
            loginWithNip07().catch(() => clearStorage());
          } else if (attempts >= 10) {
            clearInterval(interval);
            setStatus('idle');
            broadcastAuthState({ ...globalAuthState, status: 'idle' });
          }
        }, 100);
        return () => clearInterval(interval);
      }
    } else if (savedType === 'nip46' && savedBunkerUri) {
      loginWithBunker(savedBunkerUri).catch(() => clearStorage());
    } else if (savedType === 'readOnly' && savedPubkey) {
      loginReadOnly(savedPubkey).catch(() => clearStorage());
    } else {
      setStatus('idle');
      broadcastAuthState({ ...globalAuthState, status: 'idle' });
    }
  }, [
    loginWithNip07,
    loginWithBunker,
    loginWithPrivateKey,
    loginReadOnly,
    clearStorage,
  ]);

  const value: AuthContextValue = {
    user,
    signer,
    status,
    error,
    loginWithNip07,
    loginWithBunker,
    loginWithPrivateKey,
    loginReadOnly,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    return DEFAULT_AUTH_CONTEXT;
  }
  return context;
}
