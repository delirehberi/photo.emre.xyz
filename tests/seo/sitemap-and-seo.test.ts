import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { GET as sitemapEndpoint } from '../../src/pages/sitemap.xml';

describe('SEO & Open Graph Assets', () => {
  const rootDir = path.resolve(__dirname, '../../');

  it('verifies public/robots.txt exists with sitemap and disallow rules', () => {
    const robotsPath = path.join(rootDir, 'public/robots.txt');
    expect(fs.existsSync(robotsPath)).toBe(true);

    const content = fs.readFileSync(robotsPath, 'utf-8');
    expect(content).toContain('User-agent: *');
    expect(content).toContain('Allow: /');
    expect(content).toContain('Disallow: /admin');
    expect(content).toContain('Disallow: /api/admin');
    expect(content).toContain('Disallow: /api/cache');
    expect(content).toContain('Sitemap: https://photo.emre.xyz/sitemap.xml');
  });

  it('verifies public/site.webmanifest exists and is valid JSON', () => {
    const manifestPath = path.join(rootDir, 'public/site.webmanifest');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const json = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(json.name).toContain('Phoem');
    expect(json.start_url).toBe('/');
    expect(json.theme_color).toBe('#f59e0b');
    expect(Array.isArray(json.icons)).toBe(true);
  });

  it('verifies public/og-image.jpg and og-image.svg exist and are populated', () => {
    const ogJpgPath = path.join(rootDir, 'public/og-image.jpg');
    const ogSvgPath = path.join(rootDir, 'public/og-image.svg');

    expect(fs.existsSync(ogJpgPath)).toBe(true);
    expect(fs.statSync(ogJpgPath).size).toBeGreaterThan(1000);

    expect(fs.existsSync(ogSvgPath)).toBe(true);
    expect(fs.statSync(ogSvgPath).size).toBeGreaterThan(100);
  });

  it('generates valid dynamic XML sitemap with multilingual alternates', async () => {
    const mockContext = {
      site: new URL('https://photo.emre.xyz'),
      url: new URL('https://photo.emre.xyz/sitemap.xml'),
      request: new Request('https://photo.emre.xyz/sitemap.xml'),
      params: {},
      props: {},
      locals: {},
    } as unknown as Parameters<typeof sitemapEndpoint>[0];

    const response = await sitemapEndpoint(mockContext);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/xml');

    const xml = await response.text();
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    );
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');

    // Verify core pages exist
    expect(xml).toContain('<loc>https://photo.emre.xyz/</loc>');
    expect(xml).toContain('<loc>https://photo.emre.xyz/en/</loc>');
    expect(xml).toContain('<loc>https://photo.emre.xyz/events</loc>');
    expect(xml).toContain('<loc>https://photo.emre.xyz/en/events</loc>');
    expect(xml).toContain('<loc>https://photo.emre.xyz/about</loc>');
    expect(xml).toContain('<loc>https://photo.emre.xyz/contact</loc>');

    // Verify hreflang alternates
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="tr" href="https://photo.emre.xyz/" />',
    );
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="en" href="https://photo.emre.xyz/en/" />',
    );
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="x-default" href="https://photo.emre.xyz/" />',
    );
  });
});
