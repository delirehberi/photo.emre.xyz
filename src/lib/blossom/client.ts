/**
 * Blossom HTTP Client (BUD-01 / BUD-02)
 * photo.emre.xyz
 */

import { generateBlossomAuthHeader } from './auth';
import { DEFAULT_BLOSSOM_SERVER, MAX_UPLOAD_SIZE_BYTES } from './config';
import { calculateBlobSha256 } from './hasher';
import type {
  BlobDescriptor,
  BlossomUploadOptions,
  SignerFunction,
} from './types';

export class BlossomClient {
  public readonly serverUrl: string;

  constructor(serverUrl: string = DEFAULT_BLOSSOM_SERVER) {
    this.serverUrl = serverUrl.replace(/\/+$/, '');
  }

  /**
   * Checks whether a blob with the given SHA-256 hash exists on the Blossom server.
   * Uses HTTP HEAD /<sha256>.
   */
  public async hasBlob(sha256: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/${sha256}`, {
        method: 'HEAD',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Retrieves metadata headers for an existing blob on the Blossom server.
   */
  public async getBlobMetadata(sha256: string): Promise<BlobDescriptor | null> {
    try {
      const response = await fetch(`${this.serverUrl}/${sha256}`, {
        method: 'HEAD',
      });

      if (!response.ok) {
        return null;
      }

      const contentLength = response.headers.get('Content-Length');
      const contentType =
        response.headers.get('Content-Type') || 'application/octet-stream';
      const size = contentLength ? Number.parseInt(contentLength, 10) : 0;

      return {
        url: `${this.serverUrl}/${sha256}`,
        sha256,
        size: Number.isNaN(size) ? 0 : size,
        type: contentType,
        uploaded: Math.floor(Date.now() / 1000),
      };
    } catch {
      return null;
    }
  }

  /**
   * Uploads a media blob directly to the Blossom server with NIP-98 / BUD-11 authorization.
   * Reports upload progress if a callback is provided.
   */
  public async uploadBlob(
    data: Blob | File | ArrayBuffer | Uint8Array,
    options: BlossomUploadOptions = {},
  ): Promise<BlobDescriptor> {
    if (!options.signer && !options.privateKey) {
      throw new Error(
        'Upload authorization requires a privateKey (Uint8Array) or signer function (SignerFunction)',
      );
    }

    const sha256 = await calculateBlobSha256(data);
    const size =
      typeof Blob !== 'undefined' && data instanceof Blob
        ? data.size
        : (data as ArrayBuffer | Uint8Array).byteLength;

    if (size > MAX_UPLOAD_SIZE_BYTES) {
      throw new Error(
        `Upload exceeds maximum allowable size of ${MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)}MB`,
      );
    }

    const inferredMime =
      typeof Blob !== 'undefined' && data instanceof Blob
        ? data.type
        : 'image/jpeg';
    const mimeType = options.mimeType || inferredMime || 'image/jpeg';

    const uploadTargetUrl = `${this.serverUrl}/upload`;

    // Generate Blossom BUD-11 Kind 24242 Authorization Header
    let serverDomain: string | undefined;
    try {
      serverDomain = new URL(this.serverUrl).hostname;
    } catch {
      // Ignore URL parse error
    }

    const authHeader = await generateBlossomAuthHeader(
      {
        type: 'upload',
        url: uploadTargetUrl,
        sha256,
        server: serverDomain,
      },
      options.signer || options.privateKey!,
    );

    // If running in browser environment with XMLHttpRequest, provide real-time upload progress
    if (
      typeof XMLHttpRequest !== 'undefined' &&
      typeof window !== 'undefined'
    ) {
      return this.uploadWithXhr(
        uploadTargetUrl,
        data,
        authHeader,
        mimeType,
        sha256,
        size,
        options.onProgress,
      );
    }

    // Server/Worker/Test fallback with fetch
    return this.uploadWithFetch(
      uploadTargetUrl,
      data,
      authHeader,
      mimeType,
      sha256,
      size,
      options.onProgress,
    );
  }

  /**
   * Retrieves a list of blobs belonging to a specific public key (BUD-02).
   */
  public async listBlobs(pubkey: string): Promise<BlobDescriptor[]> {
    const response = await fetch(`${this.serverUrl}/list/${pubkey}`);
    if (!response.ok) {
      throw new Error(
        `Failed to retrieve blob list for ${pubkey}: HTTP ${response.status}`,
      );
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item: Record<string, unknown>) => ({
      url: (item.url as string) || `${this.serverUrl}/${item.sha256 as string}`,
      sha256: item.sha256 as string,
      size: typeof item.size === 'number' ? item.size : 0,
      type: (item.type as string) || 'application/octet-stream',
      uploaded:
        typeof item.uploaded === 'number'
          ? item.uploaded
          : Math.floor(Date.now() / 1000),
    }));
  }

  /**
   * Deletes a blob from the Blossom server with signed NIP-98 authorization.
   */
  public async deleteBlob(
    sha256: string,
    options: { signer?: SignerFunction; privateKey?: Uint8Array },
  ): Promise<boolean> {
    if (!options.signer && !options.privateKey) {
      throw new Error(
        'Deletion requires a privateKey or signer function for NIP-98 authorization',
      );
    }

    const deleteTargetUrl = `${this.serverUrl}/${sha256}`;
    let serverDomain: string | undefined;
    try {
      serverDomain = new URL(this.serverUrl).hostname;
    } catch {
      // Ignore URL parse error
    }

    const authHeader = await generateBlossomAuthHeader(
      {
        type: 'delete',
        url: deleteTargetUrl,
        sha256,
        server: serverDomain,
      },
      options.signer || options.privateKey!,
    );

    const response = await fetch(deleteTargetUrl, {
      method: 'DELETE',
      headers: {
        Authorization: authHeader,
      },
    });

    return response.ok;
  }

  private uploadWithXhr(
    url: string,
    data: Blob | File | ArrayBuffer | Uint8Array,
    authHeader: string,
    mimeType: string,
    sha256: string,
    size: number,
    onProgress?: BlossomUploadOptions['onProgress'],
  ): Promise<BlobDescriptor> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url, true);
      xhr.setRequestHeader('Authorization', authHeader);
      xhr.setRequestHeader('Content-Type', mimeType);

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.min(
              100,
              Math.round((event.loaded / event.total) * 100),
            );
            onProgress({
              loaded: event.loaded,
              total: event.total,
              percent,
            });
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (onProgress) {
            onProgress({ loaded: size, total: size, percent: 100 });
          }

          try {
            const json = JSON.parse(xhr.responseText || '{}');
            resolve({
              url: json.url || `${this.serverUrl}/${sha256}`,
              sha256: json.sha256 || sha256,
              size: typeof json.size === 'number' ? json.size : size,
              type: json.type || mimeType,
              uploaded:
                typeof json.uploaded === 'number'
                  ? json.uploaded
                  : Math.floor(Date.now() / 1000),
            });
          } catch {
            resolve({
              url: `${this.serverUrl}/${sha256}`,
              sha256,
              size,
              type: mimeType,
              uploaded: Math.floor(Date.now() / 1000),
            });
          }
        } else {
          reject(
            new Error(
              `Blossom upload failed with HTTP ${xhr.status}: ${xhr.statusText}`,
            ),
          );
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error occurred during Blossom upload'));
      };

      if (data instanceof Blob) {
        xhr.send(data);
      } else if (data instanceof Uint8Array) {
        xhr.send(data.buffer as ArrayBuffer);
      } else {
        xhr.send(data);
      }
    });
  }

  private async uploadWithFetch(
    url: string,
    data: Blob | File | ArrayBuffer | Uint8Array,
    authHeader: string,
    mimeType: string,
    sha256: string,
    size: number,
    onProgress?: BlossomUploadOptions['onProgress'],
  ): Promise<BlobDescriptor> {
    if (onProgress) {
      onProgress({ loaded: 0, total: size, percent: 0 });
    }

    let bodyData: BodyInit;
    if (typeof Blob !== 'undefined' && data instanceof Blob) {
      bodyData = data;
    } else if (data instanceof Uint8Array) {
      bodyData = new Blob([data.buffer as ArrayBuffer], { type: mimeType });
    } else {
      bodyData = new Blob([data], { type: mimeType });
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: authHeader,
        'Content-Type': mimeType,
      },
      body: bodyData,
    });

    if (!response.ok) {
      throw new Error(
        `Blossom upload failed with HTTP ${response.status}: ${response.statusText}`,
      );
    }

    if (onProgress) {
      onProgress({ loaded: size, total: size, percent: 100 });
    }

    try {
      const json = await response.json();
      return {
        url: json.url || `${this.serverUrl}/${sha256}`,
        sha256: json.sha256 || sha256,
        size: typeof json.size === 'number' ? json.size : size,
        type: json.type || mimeType,
        uploaded:
          typeof json.uploaded === 'number'
            ? json.uploaded
            : Math.floor(Date.now() / 1000),
      };
    } catch {
      return {
        url: `${this.serverUrl}/${sha256}`,
        sha256,
        size,
        type: mimeType,
        uploaded: Math.floor(Date.now() / 1000),
      };
    }
  }
}
