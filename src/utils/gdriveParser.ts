/**
 * Utility for parsing Google Drive links (Folders and Files)
 * and extracting submissions for AI Analysis & Scoring
 */

export interface GDriveParsedLink {
  isValid: boolean;
  type: 'folder' | 'file' | 'unknown';
  id: string | null;
  rawUrl: string;
  normalizedUrl: string;
  errorMessage?: string;
}

/**
 * Parses and validates Google Drive URLs
 * Handles /drive/folders/, /file/d/, id=, open?id=, and raw IDs
 */
export function parseGoogleDriveLink(inputUrl: string): GDriveParsedLink {
  const trimmed = (inputUrl || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      type: 'unknown',
      id: null,
      rawUrl: trimmed,
      normalizedUrl: '',
      errorMessage: 'URL Google Drive tidak boleh kosong.',
    };
  }

  // 1. Match Folder pattern: /folders/([a-zA-Z0-9_-]+)
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]{15,})/i);
  if (folderMatch && folderMatch[1]) {
    const id = folderMatch[1];
    return {
      isValid: true,
      type: 'folder',
      id,
      rawUrl: trimmed,
      normalizedUrl: `https://drive.google.com/drive/folders/${id}`,
    };
  }

  // 2. Match File pattern: /file/d/([a-zA-Z0-9_-]+)
  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{15,})/i);
  if (fileMatch && fileMatch[1]) {
    const id = fileMatch[1];
    return {
      isValid: true,
      type: 'file',
      id,
      rawUrl: trimmed,
      normalizedUrl: `https://drive.google.com/file/d/${id}/view`,
    };
  }

  // 3. Match query param pattern: id=([a-zA-Z0-9_-]+)
  const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{15,})/i);
  if (queryMatch && queryMatch[1]) {
    const id = queryMatch[1];
    const isFolder = trimmed.includes('folders') || !trimmed.includes('file');
    return {
      isValid: true,
      type: isFolder ? 'folder' : 'file',
      id,
      rawUrl: trimmed,
      normalizedUrl: isFolder
        ? `https://drive.google.com/drive/folders/${id}`
        : `https://drive.google.com/file/d/${id}/view`,
    };
  }

  // 4. Raw alphanumeric ID with length typical of Google Drive resources (25-45 chars)
  if (/^[a-zA-Z0-9_-]{20,50}$/.test(trimmed)) {
    return {
      isValid: true,
      type: 'folder',
      id: trimmed,
      rawUrl: trimmed,
      normalizedUrl: `https://drive.google.com/drive/folders/${trimmed}`,
    };
  }

  return {
    isValid: false,
    type: 'unknown',
    id: null,
    rawUrl: trimmed,
    normalizedUrl: '',
    errorMessage: 'Format link Google Drive tidak dikenali. Gunakan tautan folder Google Drive yang valid.',
  };
}
