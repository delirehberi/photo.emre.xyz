import { describe, it, expect, vi } from 'vitest';
import {
  applyWatermarkTransformation,
  getThumbnailUrl,
  isTransformableMediaUrl,
  SUPPORTED_THUMBNAIL_EXTENSIONS,
} from '../../src/lib/media/transformer';

describe('applyWatermarkTransformation', () => {
  const dummyBuffer = new Uint8Array([1, 2, 3, 4]).buffer;

  it('uses Cloudflare env.IMAGES binding when available', async () => {
    const mockResponse = new Response('fake-jpeg-bytes', {
      headers: { 'Content-Type': 'image/jpeg' },
    });

    const mockOutput = {
      response: vi.fn().mockResolvedValue(mockResponse),
    };

    const mockDraw = {
      output: vi.fn().mockReturnValue(mockOutput),
    };

    const mockInput = {
      draw: vi.fn().mockReturnValue(mockDraw),
    };

    const mockImagesBinding = {
      input: vi.fn().mockReturnValue(mockInput),
    };

    const response = await applyWatermarkTransformation(
      dummyBuffer,
      'emre@emre.xyz',
      {
        imagesBinding: mockImagesBinding,
        width: 1920,
        height: 1080,
      },
    );

    expect(mockImagesBinding.input).toHaveBeenCalled();
    expect(mockInput.draw).toHaveBeenCalled();
    expect(mockDraw.output).toHaveBeenCalledWith({
      format: 'image/jpeg',
      quality: 92,
    });
    expect(response).toBe(mockResponse);
  });

  it('gracefully falls back to SVG compositing when imagesBinding is absent', async () => {
    const response = await applyWatermarkTransformation(
      dummyBuffer,
      'emre@emre.xyz',
      {
        width: 800,
        height: 600,
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('image/svg+xml');
    const text = await response.text();
    expect(text).toContain('emre@emre.xyz');
    expect(text).toContain('viewBox="0 0 800 600"');
  });
});

describe('media.emre.xyz Thumbnail Transformations', () => {
  describe('isTransformableMediaUrl', () => {
    it('returns true for supported extensions on media.emre.xyz', () => {
      for (const ext of SUPPORTED_THUMBNAIL_EXTENSIONS) {
        expect(
          isTransformableMediaUrl(`https://media.emre.xyz/photos/event.${ext}`),
        ).toBe(true);
        expect(
          isTransformableMediaUrl(
            `https://media.emre.xyz/photos/event.${ext.toUpperCase()}`,
          ),
        ).toBe(true);
      }
    });

    it('returns false for other domains', () => {
      expect(
        isTransformableMediaUrl('https://media.nostr.org.tr/photo.jpg'),
      ).toBe(false);
      expect(
        isTransformableMediaUrl('https://images.unsplash.com/photo.jpg'),
      ).toBe(false);
    });

    it('returns false for unsupported file extensions on media.emre.xyz', () => {
      expect(isTransformableMediaUrl('https://media.emre.xyz/video.mp4')).toBe(
        false,
      );
      expect(
        isTransformableMediaUrl('https://media.emre.xyz/document.pdf'),
      ).toBe(false);
    });

    it('gracefully handles empty, null, undefined, or invalid URLs', () => {
      expect(isTransformableMediaUrl('')).toBe(false);
      expect(isTransformableMediaUrl(null)).toBe(false);
      expect(isTransformableMediaUrl(undefined)).toBe(false);
      expect(isTransformableMediaUrl('not-a-valid-url')).toBe(false);
    });
  });

  describe('getThumbnailUrl', () => {
    it('appends thumbnail=true query parameter to eligible media.emre.xyz URLs', () => {
      const original =
        'https://media.emre.xyz/2026/09/87ef19d0c10070c012a4a11383753741d6c90c448ae2cdcdf78c18e3df12fe33.jpg';
      const transformed = getThumbnailUrl(original);

      expect(transformed).toBe(
        'https://media.emre.xyz/2026/09/87ef19d0c10070c012a4a11383753741d6c90c448ae2cdcdf78c18e3df12fe33.jpg?thumbnail=true',
      );
    });

    it('preserves existing query parameters and appends thumbnail=true', () => {
      const original = 'https://media.emre.xyz/photo.png?cache=123';
      const transformed = getThumbnailUrl(original);

      expect(transformed).toBe(
        'https://media.emre.xyz/photo.png?cache=123&thumbnail=true',
      );
    });

    it('leaves non-matching hostnames completely untouched', () => {
      const external = 'https://media.nostr.org.tr/img.jpg';
      expect(getThumbnailUrl(external)).toBe(external);
    });

    it('leaves non-matching extensions completely untouched', () => {
      const mp4 = 'https://media.emre.xyz/clip.mp4';
      expect(getThumbnailUrl(mp4)).toBe(mp4);
    });

    it('handles falsy or invalid URLs safely without throwing', () => {
      expect(getThumbnailUrl('')).toBe('');
      expect(getThumbnailUrl(null)).toBe('');
      expect(getThumbnailUrl(undefined)).toBe('');
      expect(getThumbnailUrl('relative/path.jpg')).toBe('relative/path.jpg');
    });
  });
});
