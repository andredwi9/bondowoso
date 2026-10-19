/**
 * Utility for parsing and extracting multiple video submissions from ZIP archives
 * Handles flexible structures (root flat files, subdirectories per participant,
 * wrapped archive folders, multi-level nested folders, and companion prompt/doc files).
 */

export interface ParsedZipVideoItem {
  videoEntry: any;
  promptEntry?: any;
  docEntry?: any;
  filename: string;
  relativePath: string;
  idPeserta: string;
  namaPeserta: string;
  judulKarya: string;
  kategori: string;
}

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.m4v', '.avi', '.mkv'];
const DOC_EXTENSIONS = ['.pdf', '.doc', '.docx'];
const PROMPT_EXTENSIONS = ['.txt'];

/**
 * Checks if a zip entry path should be ignored (e.g. macOS metadata, hidden files)
 */
export function isIgnoredZipPath(path: string): boolean {
  if (!path) return true;
  const normalized = path.replace(/\\/g, '/');
  const segments = normalized.split('/');

  // Ignore __MACOSX directory or entries starting with ._ or .
  for (const seg of segments) {
    if (seg === '__MACOSX' || seg === '.DS_Store' || seg === 'Thumbs.db') {
      return true;
    }
    if (seg.startsWith('._') || (seg.startsWith('.') && seg.length > 1 && !seg.endsWith('.mp4'))) {
      return true;
    }
  }

  // Check if filename itself starts with . or ._
  const filename = segments[segments.length - 1];
  if (filename.startsWith('.') || filename.startsWith('._')) {
    return true;
  }

  return false;
}

/**
 * Checks if filename has a video extension
 */
export function isVideoFileName(filename: string): boolean {
  const lower = filename.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Checks if filename has a document extension
 */
export function isDocFileName(filename: string): boolean {
  const lower = filename.toLowerCase();
  return DOC_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Checks if filename has a prompt text extension
 */
export function isPromptFileName(filename: string): boolean {
  const lower = filename.toLowerCase();
  return PROMPT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Cleans string into Title Case
 */
export function toTitleCase(str: string): string {
  return str
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Infers category (Pariwisata, Budaya, Kuliner) based on keywords in title or text
 */
export function inferCategory(text: string, indexFallback = 0): string {
  const lower = text.toLowerCase();
  if (
    lower.includes('kopi') ||
    lower.includes('kuliner') ||
    lower.includes('tape') ||
    lower.includes('makanan') ||
    lower.includes('resep') ||
    lower.includes('masakan') ||
    lower.includes('sate') ||
    lower.includes('resto')
  ) {
    return 'Kuliner';
  }

  if (
    lower.includes('ijen') ||
    lower.includes('kawah') ||
    lower.includes('wisata') ||
    lower.includes('air terjun') ||
    lower.includes('pemandangan') ||
    lower.includes('taman') ||
    lower.includes('alam') ||
    lower.includes('pariwisata') ||
    lower.includes('danau') ||
    lower.includes('blawan') ||
    lower.includes('tancak') ||
    lower.includes('gunung')
  ) {
    return 'Pariwisata';
  }

  if (
    lower.includes('batik') ||
    lower.includes('singolodro') ||
    lower.includes('tari') ||
    lower.includes('budaya') ||
    lower.includes('tradisi') ||
    lower.includes('sejarah') ||
    lower.includes('megalitikum') ||
    lower.includes('seni') ||
    lower.includes('adat')
  ) {
    return 'Budaya';
  }

  const defaultCategories = ['Pariwisata', 'Budaya', 'Kuliner'];
  return defaultCategories[indexFallback % defaultCategories.length];
}

/**
 * Extracts participant ID, participant name, and video title from path segments
 * Supports patterns:
 * 1) [ID]_[Nama]_[Judul]/video.mp4
 * 2) [ID]_[Nama]_[Judul].mp4
 * 3) [ID]_[Nama]/video.mp4
 * 4) [ID]-[Nama]-[Judul].mp4
 * 5) Generic filename: video1.mp4, pesona_ijen.mp4, etc.
 */
export function parseSubmissionMetadata(
  relativePath: string,
  index: number
): {
  idPeserta: string;
  namaPeserta: string;
  judulKarya: string;
  kategori: string;
} {
  const normalized = relativePath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  const rawFileName = parts[parts.length - 1] || `video_${index + 1}.mp4`;
  const nameWithoutExt = rawFileName.replace(/\.[^/.]+$/, '');

  // Look for candidates that may have the pattern: innermost directory or the filename itself
  const candidateStrings: string[] = [];

  // Check parent directory immediately containing the file
  if (parts.length > 1) {
    candidateStrings.push(parts[parts.length - 2]);
  }
  // Check any higher ancestor directory that isn't generic
  for (let i = parts.length - 3; i >= 0; i--) {
    candidateStrings.push(parts[i]);
  }
  // Check filename without extension
  candidateStrings.push(nameWithoutExt);

  let idPeserta = '';
  let namaPeserta = '';
  let judulKarya = '';

  for (const candidate of candidateStrings) {
    if (!candidate || candidate.toLowerCase() === 'default') continue;

    // Check if candidate matches [ID]_[Nama]_[Judul...]
    const underscoreParts = candidate.split('_');
    if (underscoreParts.length >= 2) {
      const firstToken = underscoreParts[0].trim();
      // ID usually has letters/numbers or P- prefix
      idPeserta = firstToken;
      namaPeserta = underscoreParts[1].trim();

      if (underscoreParts.length >= 3) {
        judulKarya = underscoreParts.slice(2).join(' ').trim();
      }
      break;
    }

    // Check hyphen-delimited if it looks like P01-Nama-Judul
    const hyphenParts = candidate.split('-');
    if (hyphenParts.length >= 3 && /^[pP]\d+/.test(hyphenParts[0].trim())) {
      idPeserta = hyphenParts[0].trim();
      namaPeserta = hyphenParts[1].trim();
      judulKarya = hyphenParts.slice(2).join(' ').trim();
      break;
    }
  }

  // Fallbacks if not detected
  if (!idPeserta) {
    idPeserta = `P-ZIP-${String(index + 1).padStart(3, '0')}`;
  }
  if (!namaPeserta) {
    namaPeserta = `Peserta ${index + 1}`;
  }
  if (!judulKarya) {
    judulKarya = toTitleCase(nameWithoutExt);
    if (!judulKarya || judulKarya.toLowerCase().startsWith('video')) {
      judulKarya = `Karya Video AI Bondowoso #${index + 1}`;
    }
  }

  const kategori = inferCategory(`${judulKarya} ${relativePath}`, index);

  return {
    idPeserta,
    namaPeserta,
    judulKarya,
    kategori,
  };
}

/**
 * Inspects all zip entries and groups EVERY video into a submission,
 * associating companion prompt text and documents where available.
 */
export function extractSubmissionsFromZip(
  entries: Array<{ relativePath: string; zipEntry: any }>
): ParsedZipVideoItem[] {
  // 1. Separate valid entries
  const validVideoEntries: Array<{ relativePath: string; zipEntry: any; parentPath: string; filename: string }> = [];
  const textPromptEntries: Array<{ relativePath: string; zipEntry: any; parentPath: string; filename: string }> = [];
  const docEntries: Array<{ relativePath: string; zipEntry: any; parentPath: string; filename: string }> = [];

  for (const item of entries) {
    const rel = item.relativePath;
    if (item.zipEntry.dir) continue;
    if (isIgnoredZipPath(rel)) continue;

    const parts = rel.replace(/\\/g, '/').split('/').filter(Boolean);
    const filename = parts[parts.length - 1];
    const parentPath = parts.slice(0, parts.length - 1).join('/');

    if (isVideoFileName(filename)) {
      validVideoEntries.push({ relativePath: rel, zipEntry: item.zipEntry, parentPath, filename });
    } else if (isPromptFileName(filename)) {
      textPromptEntries.push({ relativePath: rel, zipEntry: item.zipEntry, parentPath, filename });
    } else if (isDocFileName(filename)) {
      docEntries.push({ relativePath: rel, zipEntry: item.zipEntry, parentPath, filename });
    }
  }

  // 2. Build one submission per video entry
  const submissions: ParsedZipVideoItem[] = validVideoEntries.map((video, idx) => {
    const meta = parseSubmissionMetadata(video.relativePath, idx);

    const videoBase = video.filename.replace(/\.[^/.]+$/, '').toLowerCase();

    // Find best companion prompt text (.txt)
    // Preference 1: same parent folder and matching base name
    // Preference 2: same parent folder (if only 1 prompt or closest)
    // Preference 3: matching base name anywhere
    let matchingPrompt: any = undefined;
    const sameFolderPrompts = textPromptEntries.filter((p) => p.parentPath === video.parentPath);
    if (sameFolderPrompts.length > 0) {
      const exactNamePrompt = sameFolderPrompts.find((p) =>
        p.filename.toLowerCase().includes(videoBase) || videoBase.includes(p.filename.replace(/\.[^/.]+$/, '').toLowerCase())
      );
      matchingPrompt = exactNamePrompt ? exactNamePrompt.zipEntry : sameFolderPrompts[0].zipEntry;
    } else {
      const nameMatch = textPromptEntries.find((p) =>
        p.filename.toLowerCase().includes(videoBase) || videoBase.includes(p.filename.replace(/\.[^/.]+$/, '').toLowerCase())
      );
      if (nameMatch) {
        matchingPrompt = nameMatch.zipEntry;
      }
    }

    // Find best companion document (.pdf/.doc)
    let matchingDoc: any = undefined;
    const sameFolderDocs = docEntries.filter((d) => d.parentPath === video.parentPath);
    if (sameFolderDocs.length > 0) {
      const exactNameDoc = sameFolderDocs.find((d) =>
        d.filename.toLowerCase().includes(videoBase) || videoBase.includes(d.filename.replace(/\.[^/.]+$/, '').toLowerCase())
      );
      matchingDoc = exactNameDoc ? exactNameDoc.zipEntry : sameFolderDocs[0].zipEntry;
    } else {
      const nameMatch = docEntries.find((d) =>
        d.filename.toLowerCase().includes(videoBase) || videoBase.includes(d.filename.replace(/\.[^/.]+$/, '').toLowerCase())
      );
      if (nameMatch) {
        matchingDoc = nameMatch.zipEntry;
      }
    }

    return {
      videoEntry: video.zipEntry,
      promptEntry: matchingPrompt,
      docEntry: matchingDoc,
      filename: video.filename,
      relativePath: video.relativePath,
      idPeserta: meta.idPeserta,
      namaPeserta: meta.namaPeserta,
      judulKarya: meta.judulKarya,
      kategori: meta.kategori,
    };
  });

  return submissions;
}
