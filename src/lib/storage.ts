// src/lib/storage.ts
// ============================================================
// Upload de imagens para Firebase Storage (substituindo ImgBB).
//
// Firebase Storage vantagens vs ImgBB:
// - Totalmente GRATUITO no plano Spark (5GB de espaço livre)
// - Sem dependência de serviço externo
// - URLs permanentes (sem risco de expirar)
// - Controle total sobre os assets
// ============================================================

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from './firebase'; // Reutiliza o app já inicializado

const storage = getStorage(app);

/**
 * Tamanho máximo de imagem: 5MB
 * Tipos permitidos: JPEG, PNG, WebP, GIF
 */
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Faz upload de uma imagem para o Firebase Storage.
 * Retorna a URL pública de download.
 *
 * @param file - Arquivo de imagem selecionado pelo usuário
 * @param folder - Pasta no Storage (default: 'produtos')
 * @returns URL pública da imagem
 * @throws Error se o arquivo for inválido ou o upload falhar
 */
export async function uploadImage(file: File, folder: string = 'produtos'): Promise<string> {
  // Validações de segurança
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Tipo de arquivo não permitido: ${file.type}. Use JPEG, PNG, WebP ou GIF.`);
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 5MB.`);
  }

  // Gera um nome único para evitar colisão
  const timestamp = Date.now();
  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .toLowerCase();
  const storagePath = `${folder}/${timestamp}_${safeName}`;

  const storageRef = ref(storage, storagePath);

  // Upload
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      uploadedAt: new Date().toISOString(),
    },
  });

  // Retorna URL pública
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
}
