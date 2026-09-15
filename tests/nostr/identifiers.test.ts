import { describe, it, expect } from 'vitest';
import * as nip19 from 'nostr-tools/nip19';
import {
  encodeAlbumNaddr,
  resolveAlbumTarget,
} from '../../src/lib/nostr/identifiers';
import { NOSTR_KINDS } from '../../src/lib/nostr/config';

describe('Nostr Album Identifiers (identifiers.ts)', () => {
  const samplePubkey =
    '21a565505809a8b15af94b2c23cdbcf25e01d7f571bd5bc51a651869ef8b0adc';
  const sampleDTag = 'together-in-izmir-party-05-09-2026';

  it('correctly encodes a Kind 31922 event into an naddr string', () => {
    const naddr = encodeAlbumNaddr({
      pubkey: samplePubkey,
      dTag: sampleDTag,
      relays: ['wss://relay.damus.io'],
    });

    expect(naddr).toMatch(/^naddr1[a-z0-9]+$/);

    const decoded = nip19.decode(naddr);
    expect(decoded.type).toBe('naddr');
    const data = decoded.data as {
      kind: number;
      pubkey: string;
      identifier: string;
      relays?: string[];
    };
    expect(data.kind).toBe(NOSTR_KINDS.EVENT_ALBUM);
    expect(data.pubkey).toBe(samplePubkey);
    expect(data.identifier).toBe(sampleDTag);
    expect(data.relays).toContain('wss://relay.damus.io');
  });

  it('resolves naddr1 string into target query filter and relay hints', () => {
    const naddr = encodeAlbumNaddr({
      pubkey: samplePubkey,
      dTag: sampleDTag,
      relays: ['wss://relay.primal.net', 'wss://nos.lol'],
    });

    const resolved = resolveAlbumTarget(naddr);
    expect(resolved.type).toBe('naddr');
    expect(resolved.filter.kinds).toEqual([31922]);
    expect(resolved.filter.authors).toEqual([samplePubkey]);
    expect(resolved.filter['#d']).toEqual([sampleDTag]);
    expect(resolved.pubkey).toBe(samplePubkey);
    expect(resolved.dTag).toBe(sampleDTag);
    expect(resolved.coordinate).toBe(`31922:${samplePubkey}:${sampleDTag}`);
    expect(resolved.relays).toContain('wss://relay.primal.net');
    expect(resolved.relays).toContain('wss://nos.lol');
  });

  it('resolves nevent1 string into event id and relay hints', () => {
    const eventId =
      '158a18f32bd266922bc0f12abf8b911fe4977c393d69c2cbb02c905ba765f57c';
    const nevent = nip19.neventEncode({
      id: eventId,
      relays: ['wss://relay.damus.io'],
      author: samplePubkey,
      kind: 31922,
    });

    const resolved = resolveAlbumTarget(nevent);
    expect(resolved.type).toBe('nevent');
    expect(resolved.filter.ids).toEqual([eventId]);
    expect(resolved.filter.authors).toEqual([samplePubkey]);
    expect(resolved.filter.kinds).toEqual([31922]);
    expect(resolved.relays).toContain('wss://relay.damus.io');
  });

  it('resolves note1 string into event id', () => {
    const eventId =
      '158a18f32bd266922bc0f12abf8b911fe4977c393d69c2cbb02c905ba765f57c';
    const note = nip19.noteEncode(eventId);

    const resolved = resolveAlbumTarget(note);
    expect(resolved.type).toBe('note');
    expect(resolved.filter.ids).toEqual([eventId]);
  });

  it('resolves 64-character hex event id', () => {
    const eventId =
      '158a18f32bd266922bc0f12abf8b911fe4977c393d69c2cbb02c905ba765f57c';
    const resolved = resolveAlbumTarget(eventId);

    expect(resolved.type).toBe('hex');
    expect(resolved.filter.ids).toEqual([eventId]);
  });

  it('resolves canonical coordinate format (31922:<pubkey>:<dTag>)', () => {
    const coord = `31922:${samplePubkey}:${sampleDTag}`;
    const resolved = resolveAlbumTarget(coord);

    expect(resolved.type).toBe('coordinate');
    expect(resolved.filter.kinds).toEqual([31922]);
    expect(resolved.filter.authors).toEqual([samplePubkey]);
    expect(resolved.filter['#d']).toEqual([sampleDTag]);
    expect(resolved.coordinate).toBe(coord);
  });

  it('resolves legacy plain slug as backward-compatible d-tag filter', () => {
    const resolved = resolveAlbumTarget(sampleDTag);

    expect(resolved.type).toBe('slug');
    expect(resolved.filter.kinds).toEqual([31922]);
    expect(resolved.filter['#d']).toEqual([sampleDTag]);
    expect(resolved.dTag).toBe(sampleDTag);
  });

  it('resolves full Ditto URL containing Kind 31923 naddr', () => {
    const dittoUrl =
      'https://ditto.pub/naddr1qvzqqqrukvpzq3hnc7an8npsryzfkaku38dmjm35cfrmmkngk6kcvvngy7fllzs6qqwkymm0dd5kueedxymnswfn8ymnydesxvcnytt6ddenqwt80qf0uuze';

    const resolved = resolveAlbumTarget(dittoUrl);
    expect(resolved.type).toBe('naddr');
    expect(resolved.filter.kinds).toEqual([31923]);
    expect(resolved.filter.authors).toEqual([
      '46f3c7bb33cc3019049b76dc89dbb96e34c247bdda68b6ad8632682793ff8a1a',
    ]);
    expect(resolved.filter['#d']).toEqual(['booking-1789397270312-zks09gx']);
    expect(resolved.pubkey).toBe(
      '46f3c7bb33cc3019049b76dc89dbb96e34c247bdda68b6ad8632682793ff8a1a',
    );
    expect(resolved.dTag).toBe('booking-1789397270312-zks09gx');
    expect(resolved.coordinate).toBe(
      '31923:46f3c7bb33cc3019049b76dc89dbb96e34c247bdda68b6ad8632682793ff8a1a:booking-1789397270312-zks09gx',
    );
  });

  it('correctly encodes a Kind 31923 event into an naddr string', () => {
    const naddr = encodeAlbumNaddr({
      kind: 31923,
      pubkey: samplePubkey,
      dTag: sampleDTag,
      relays: ['wss://relay.damus.io'],
    });

    expect(naddr).toMatch(/^naddr1[a-z0-9]+$/);
    const decoded = nip19.decode(naddr);
    expect(decoded.type).toBe('naddr');
    const data = decoded.data as {
      kind: number;
      pubkey: string;
      identifier: string;
    };
    expect(data.kind).toBe(31923);
    expect(data.pubkey).toBe(samplePubkey);
    expect(data.identifier).toBe(sampleDTag);
  });

  it('throws for invalid or empty inputs', () => {
    expect(() => resolveAlbumTarget('')).toThrow();
    // @ts-expect-error testing invalid argument
    expect(() => resolveAlbumTarget(null)).toThrow();
  });
});
