import { supabase } from './supabaseClient';

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateImages(files) {
  const invalidFile = files.find(
    (file) => !IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_SIZE
  );

  if (invalidFile) {
    throw new Error('Usa imágenes JPG, PNG o WebP de hasta 8 MB cada una.');
  }
}

export async function uploadImages(bucket, folder, files) {
  const uploadedPaths = [];

  for (const file of files) {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${folder}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

    if (error) throw error;
    uploadedPaths.push(path);
  }

  return uploadedPaths;
}

export function getPropertyImageUrl(path) {
  return supabase.storage.from('property-images').getPublicUrl(path).data.publicUrl;
}

export async function getPrivateImageUrl(path) {
  const { data, error } = await supabase.storage
    .from('tenant-documents')
    .createSignedUrl(path, 60 * 10);

  if (error) throw error;
  return data.signedUrl;
}
