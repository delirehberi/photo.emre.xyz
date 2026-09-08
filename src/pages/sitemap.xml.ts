/**
 * Dynamic XML Sitemap Endpoint: /sitemap.xml
 * photo.emre.xyz
 *
 * Generates an SEO-compliant XML sitemap indexing all public multilingual routes
 * and dynamic Nostr event albums with hreflang alternate link relations.
 */

import type { APIRoute } from 'astro';
import { fetchEventAlbums } from '@/lib/nostr/events-data';

export const prerender = false;

interface SitemapUrl {
  loc: string;
  alternates: { lang: string; href: string }[];
  lastmod?: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: string;
}

export const GET: APIRoute = async ({ site, url }) => {
  const origin = (
    site?.toString() ||
    url.origin ||
    'https://photo.emre.xyz'
  ).replace(/\/+$/, '');

  const urls: SitemapUrl[] = [
    // Homepage
    {
      loc: `${origin}/`,
      alternates: [
        { lang: 'tr', href: `${origin}/` },
        { lang: 'en', href: `${origin}/en/` },
        { lang: 'x-default', href: `${origin}/` },
      ],
      changefreq: 'daily',
      priority: '1.0',
    },
    {
      loc: `${origin}/en/`,
      alternates: [
        { lang: 'tr', href: `${origin}/` },
        { lang: 'en', href: `${origin}/en/` },
        { lang: 'x-default', href: `${origin}/` },
      ],
      changefreq: 'daily',
      priority: '1.0',
    },
    // Events Catalog
    {
      loc: `${origin}/events`,
      alternates: [
        { lang: 'tr', href: `${origin}/events` },
        { lang: 'en', href: `${origin}/en/events` },
        { lang: 'x-default', href: `${origin}/events` },
      ],
      changefreq: 'daily',
      priority: '0.9',
    },
    {
      loc: `${origin}/en/events`,
      alternates: [
        { lang: 'tr', href: `${origin}/events` },
        { lang: 'en', href: `${origin}/en/events` },
        { lang: 'x-default', href: `${origin}/events` },
      ],
      changefreq: 'daily',
      priority: '0.9',
    },
    // About
    {
      loc: `${origin}/about`,
      alternates: [
        { lang: 'tr', href: `${origin}/about` },
        { lang: 'en', href: `${origin}/en/about` },
        { lang: 'x-default', href: `${origin}/about` },
      ],
      changefreq: 'weekly',
      priority: '0.7',
    },
    {
      loc: `${origin}/en/about`,
      alternates: [
        { lang: 'tr', href: `${origin}/about` },
        { lang: 'en', href: `${origin}/en/about` },
        { lang: 'x-default', href: `${origin}/about` },
      ],
      changefreq: 'weekly',
      priority: '0.7',
    },
    // Contact
    {
      loc: `${origin}/contact`,
      alternates: [
        { lang: 'tr', href: `${origin}/contact` },
        { lang: 'en', href: `${origin}/en/contact` },
        { lang: 'x-default', href: `${origin}/contact` },
      ],
      changefreq: 'monthly',
      priority: '0.6',
    },
    {
      loc: `${origin}/en/contact`,
      alternates: [
        { lang: 'tr', href: `${origin}/contact` },
        { lang: 'en', href: `${origin}/en/contact` },
        { lang: 'x-default', href: `${origin}/contact` },
      ],
      changefreq: 'monthly',
      priority: '0.6',
    },
    // Policy
    {
      loc: `${origin}/policy`,
      alternates: [
        { lang: 'tr', href: `${origin}/policy` },
        { lang: 'en', href: `${origin}/en/policy` },
        { lang: 'x-default', href: `${origin}/policy` },
      ],
      changefreq: 'monthly',
      priority: '0.6',
    },
    {
      loc: `${origin}/en/policy`,
      alternates: [
        { lang: 'tr', href: `${origin}/policy` },
        { lang: 'en', href: `${origin}/en/policy` },
        { lang: 'x-default', href: `${origin}/policy` },
      ],
      changefreq: 'monthly',
      priority: '0.6',
    },
    // Delete Request
    {
      loc: `${origin}/delete-request`,
      alternates: [
        { lang: 'tr', href: `${origin}/delete-request` },
        { lang: 'en', href: `${origin}/en/delete-request` },
        { lang: 'x-default', href: `${origin}/delete-request` },
      ],
      changefreq: 'monthly',
      priority: '0.6',
    },
    {
      loc: `${origin}/en/delete-request`,
      alternates: [
        { lang: 'tr', href: `${origin}/delete-request` },
        { lang: 'en', href: `${origin}/en/delete-request` },
        { lang: 'x-default', href: `${origin}/delete-request` },
      ],
      changefreq: 'monthly',
      priority: '0.6',
    },
  ];

  // Dynamically index public Nostr event albums
  try {
    const eventsWithOrg = await fetchEventAlbums();
    for (const item of eventsWithOrg) {
      const album = item.album;
      const slug = album.dTag || album.id;
      const lastmod = album.createdAt
        ? new Date(album.createdAt * 1000).toISOString().split('T')[0]
        : undefined;

      urls.push(
        {
          loc: `${origin}/album/${slug}`,
          alternates: [
            { lang: 'tr', href: `${origin}/album/${slug}` },
            { lang: 'en', href: `${origin}/en/album/${slug}` },
            { lang: 'x-default', href: `${origin}/album/${slug}` },
          ],
          lastmod,
          changefreq: 'weekly',
          priority: '0.8',
        },
        {
          loc: `${origin}/en/album/${slug}`,
          alternates: [
            { lang: 'tr', href: `${origin}/album/${slug}` },
            { lang: 'en', href: `${origin}/en/album/${slug}` },
            { lang: 'x-default', href: `${origin}/album/${slug}` },
          ],
          lastmod,
          changefreq: 'weekly',
          priority: '0.8',
        },
      );
    }
  } catch (err) {
    console.warn('Failed to query albums for sitemap generation:', err);
  }

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls
  .map(
    (item) => `  <url>
    <loc>${escapeXml(item.loc)}</loc>
${item.alternates
  .map(
    (alt) =>
      `    <xhtml:link rel="alternate" hreflang="${escapeXml(alt.lang)}" href="${escapeXml(alt.href)}" />`,
  )
  .join('\n')}
${item.lastmod ? `    <lastmod>${item.lastmod}</lastmod>\n` : ''}    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(xmlContent, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control':
        'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return char;
    }
  });
}
