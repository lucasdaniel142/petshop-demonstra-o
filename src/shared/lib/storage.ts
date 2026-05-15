import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from './firebase';

const storage = getStorage(app);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function uploadImage(file: File, folder: string = 'produtos'): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Tipo de arquivo não permitido.`);
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(`Arquivo muito grande.`);
  }

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
  const storagePath = `${folder}/${timestamp}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: { uploadedAt: new Date().toISOString() },
  });

  return await getDownloadURL(snapshot.ref);
}
