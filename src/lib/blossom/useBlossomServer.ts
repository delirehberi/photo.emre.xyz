/**
 * Blossom Server Management & Selection Hook
 * photo.emre.xyz
 *
 * Manages active Blossom server state across the app, persists preferences
 * to localStorage, queries the user's Kind 10063 (BUD-04) Blossom Server List,
 * and enables seamless switching between primal.net, media.nostr.org.tr,
 * media.emre.xyz, and custom servers.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/nostr/auth/context';
import { getSharedRelayPool } from '@/lib/nostr/pool';
import { DEFAULT_RELAYS, NOSTR_KINDS } from '@/lib/nostr/config';
import {
  CURATED_BLOSSOM_SERVERS,
  DEFAULT_BLOSSOM_SERVER_URL,
  normalizeBlossomUrl,
  isValidBlossomUrl,
  type BlossomServerOption,
} from './servers';

export const BLOSSOM_STORAGE_KEY = 'photo_emre_xyz_blossom_server';
export const CUSTOM_BLOSSOM_STORAGE_KEY =
  'photo_emre_xyz_custom_blossom_servers';

export interface UseBlossomServerReturn {
  selectedServerUrl: string;
  setSelectedServerUrl: (url: string) => void;
  selectedServerOption: BlossomServerOption;
  curatedServers: BlossomServerOption[];
  customServers: BlossomServerOption[];
  nostrServers: BlossomServerOption[];
  addCustomServer: (url: string) => boolean;
  removeCustomServer: (url: string) => void;
  loadingNostrServers: boolean;
}

export function useBlossomServer(): UseBlossomServerReturn {
  const { user } = useAuth();

  // 1. Initialize active server from localStorage or default
  const [selectedServerUrl, setSelectedServerState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(BLOSSOM_STORAGE_KEY);
      if (stored && isValidBlossomUrl(stored)) {
        return normalizeBlossomUrl(stored);
      }
    }
    return DEFAULT_BLOSSOM_SERVER_URL;
  });

  // 2. Custom servers stored locally
  const [customServers, setCustomServers] = useState<BlossomServerOption[]>(
    () => {
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem(CUSTOM_BLOSSOM_STORAGE_KEY);
          if (stored) {
            const urls: string[] = JSON.parse(stored);
            return urls.filter(isValidBlossomUrl).map((url) => ({
              id: `custom-${url}`,
              name: new URL(normalizeBlossomUrl(url)).hostname,
              url: normalizeBlossomUrl(url),
              tag: 'Özel',
              description: 'Kullanıcı tanımlı özel Blossom sunucusu.',
            }));
          }
        } catch {
          // Ignore JSON parse errors
        }
      }
      return [];
    },
  );

  // 3. Nostr Kind 10063 (BUD-04) user server list
  const [nostrServers, setNostrServers] = useState<BlossomServerOption[]>([]);
  const [loadingNostrServers, setLoadingNostrServers] = useState(false);

  // Synchronize active server changes to localStorage
  const setSelectedServerUrl = useCallback((url: string) => {
    const normalized = normalizeBlossomUrl(url);
    setSelectedServerState(normalized);
    if (typeof window !== 'undefined') {
      localStorage.setItem(BLOSSOM_STORAGE_KEY, normalized);
    }
  }, []);

  // Add custom server
  const addCustomServer = useCallback(
    (rawUrl: string): boolean => {
      if (!isValidBlossomUrl(rawUrl)) return false;
      const normalized = normalizeBlossomUrl(rawUrl);

      // Check if already in curated or custom
      const alreadyCurated = CURATED_BLOSSOM_SERVERS.some(
        (s) => s.url === normalized,
      );
      const alreadyCustom = customServers.some((s) => s.url === normalized);

      if (!alreadyCustom && !alreadyCurated) {
        let hostname: string;
        try {
          hostname = new URL(normalized).hostname;
        } catch {
          hostname = normalized;
        }

        const newOption: BlossomServerOption = {
          id: `custom-${normalized}`,
          name: hostname,
          url: normalized,
          tag: 'Özel',
          description: 'Kullanıcı tanımlı özel Blossom sunucusu.',
        };

        const updated = [...customServers, newOption];
        setCustomServers(updated);
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            CUSTOM_BLOSSOM_STORAGE_KEY,
            JSON.stringify(updated.map((s) => s.url)),
          );
        }
      }

      setSelectedServerUrl(normalized);
      return true;
    },
    [customServers, setSelectedServerUrl],
  );

  // Remove custom server
  const removeCustomServer = useCallback(
    (rawUrl: string) => {
      const normalized = normalizeBlossomUrl(rawUrl);
      const updated = customServers.filter((s) => s.url !== normalized);
      setCustomServers(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          CUSTOM_BLOSSOM_STORAGE_KEY,
          JSON.stringify(updated.map((s) => s.url)),
        );
      }
      if (selectedServerUrl === normalized) {
        setSelectedServerUrl(DEFAULT_BLOSSOM_SERVER_URL);
      }
    },
    [customServers, selectedServerUrl, setSelectedServerUrl],
  );

  // Query Nostr Kind 10063 (BUD-04) user server list
  useEffect(() => {
    if (!user?.pubkey) {
      setNostrServers([]);
      return;
    }

    let isMounted = true;
    setLoadingNostrServers(true);

    const fetchUserBlossomList = async () => {
      try {
        const pool = getSharedRelayPool();
        const event = await pool.queryOne(DEFAULT_RELAYS, {
          kinds: [NOSTR_KINDS.BLOSSOM_SERVER_LIST],
          authors: [user.pubkey],
        });

        if (!isMounted) return;

        if (event) {
          const serverTags = event.tags
            .filter((t) => t[0] === 'server' && t[1])
            .map((t) => normalizeBlossomUrl(t[1]))
            .filter(isValidBlossomUrl);

          const uniqueUrls = Array.from(new Set(serverTags));
          const options: BlossomServerOption[] = uniqueUrls.map((url) => {
            let host = url;
            try {
              host = new URL(url).hostname;
            } catch {
              // fallback
            }
            return {
              id: `nostr-${url}`,
              name: host,
              url,
              tag: 'Profil Sunucusu',
              description: 'Nostr profilinizden (Kind 10063) tespit edildi.',
              badge: 'Kind 10063',
            };
          });

          setNostrServers(options);
        } else {
          setNostrServers([]);
        }
      } catch {
        if (isMounted) setNostrServers([]);
      } finally {
        if (isMounted) setLoadingNostrServers(false);
      }
    };

    fetchUserBlossomList();

    return () => {
      isMounted = false;
    };
  }, [user?.pubkey]);

  // Determine current active server option
  const selectedServerOption = useMemo<BlossomServerOption>(() => {
    const foundCurated = CURATED_BLOSSOM_SERVERS.find(
      (s) => s.url === selectedServerUrl,
    );
    if (foundCurated) return foundCurated;

    const foundCustom = customServers.find((s) => s.url === selectedServerUrl);
    if (foundCustom) return foundCustom;

    const foundNostr = nostrServers.find((s) => s.url === selectedServerUrl);
    if (foundNostr) return foundNostr;

    let host = selectedServerUrl;
    try {
      host = new URL(selectedServerUrl).hostname;
    } catch {
      // fallback
    }

    return {
      id: `custom-${selectedServerUrl}`,
      name: host,
      url: selectedServerUrl,
      tag: 'Özel',
      description: selectedServerUrl,
    };
  }, [selectedServerUrl, customServers, nostrServers]);

  return {
    selectedServerUrl,
    setSelectedServerUrl,
    selectedServerOption,
    curatedServers: CURATED_BLOSSOM_SERVERS,
    customServers,
    nostrServers,
    addCustomServer,
    removeCustomServer,
    loadingNostrServers,
  };
}
