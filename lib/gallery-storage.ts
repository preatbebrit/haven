import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

const KEY = '@haven/profile_gallery_v1';
const GALLERY_SUBDIR = 'gallery';

export const GALLERY_SIZE = 6;
export type GallerySlots = (string | null)[];

function emptySlots(): GallerySlots {
  return Array.from({ length: GALLERY_SIZE }, () => null);
}

export async function getGallery(): Promise<GallerySlots> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptySlots();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return emptySlots();
    const slots = emptySlots();
    for (let i = 0; i < GALLERY_SIZE; i += 1) {
      const v = parsed[i];
      slots[i] = typeof v === 'string' ? v : null;
    }
    return slots;
  } catch {
    return emptySlots();
  }
}

export async function setGallery(slots: GallerySlots): Promise<void> {
  try {
    const normalized = emptySlots().map((_, i) =>
      typeof slots[i] === 'string' ? slots[i] : null
    );
    await AsyncStorage.setItem(KEY, JSON.stringify(normalized));
  } catch {
    /* ignore */
  }
}

function extensionFromUri(uri: string): string {
  const path = uri.split('?')[0].split('#')[0];
  const lastDot = path.lastIndexOf('.');
  const lastSlash = path.lastIndexOf('/');
  if (lastDot > lastSlash && lastDot !== -1) {
    const ext = path.slice(lastDot + 1).toLowerCase();
    if (ext.length > 0 && ext.length <= 5) return ext;
  }
  return 'jpg';
}

function galleryDir(): Directory {
  return new Directory(Paths.document, GALLERY_SUBDIR);
}

export async function persistPickedImage(sourceUri: string): Promise<string> {
  const dir = galleryDir();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });

  const ext = extensionFromUri(sourceUri);
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const dest = new File(dir, filename);

  new File(sourceUri).copy(dest);
  return dest.uri;
}

export async function removePersistedImage(uri: string): Promise<void> {
  try {
    const dirUri = galleryDir().uri;
    if (!uri.startsWith(dirUri)) return;
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    /* ignore */
  }
}

export async function clearGallery(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  try {
    const dir = galleryDir();
    if (dir.exists) dir.delete();
  } catch {
    /* ignore */
  }
}
