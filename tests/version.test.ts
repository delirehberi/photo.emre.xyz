import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  APP_VERSION,
  APP_NAME,
  APP_BUILD_INFO,
  APP_LICENSE,
  APP_REPOSITORY,
} from '../src/lib/version';

describe('Version Management System', () => {
  it('APP_VERSION matches package.json version', () => {
    const pkgPath = resolve(__dirname, '../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    expect(APP_VERSION).toBe(pkg.version);
  });

  it('APP_VERSION complies with semantic versioning format', () => {
    const semverRegex = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;
    expect(APP_VERSION).toMatch(semverRegex);
  });

  it('APP_BUILD_INFO exports required metadata properties', () => {
    expect(APP_BUILD_INFO.name).toBe(APP_NAME);
    expect(APP_BUILD_INFO.version).toBe(APP_VERSION);
    expect(APP_BUILD_INFO.license).toBe(APP_LICENSE);
    expect(APP_BUILD_INFO.repository).toBe(APP_REPOSITORY);
    expect(APP_BUILD_INFO.releaseDate).toBeDefined();
  });
});
