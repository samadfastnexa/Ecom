// Image upload limits (must match the backend in core/image_limits.py).
export const MAX_IMAGES = 3;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_IMAGE_SIZE_LABEL = '5 MB';

/** A picked image ready to append to FormData (React Native shape). */
export interface PickedImage {
  uri: string;
  name: string;
  type: string;
}

/** Append picked images to a FormData under the `uploaded_images` key. */
export function appendImages(fd: FormData, images: PickedImage[]): void {
  for (const img of images) {
    // React Native's FormData accepts this {uri,name,type} object for files.
    fd.append('uploaded_images', {
      uri: img.uri,
      name: img.name,
      type: img.type,
    } as unknown as Blob);
  }
}
