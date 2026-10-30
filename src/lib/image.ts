const MAX_SIDE_PX = 1280;
const JPEG_QUALITY = 0.8;

/**
 * Shrinks a photo in the browser and returns it as a JPEG data URL.
 * Phone photos are often several megabytes; resizing keeps uploads fast and
 * within the server's size limit.
 */
export async function prepareImageForUpload(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_SIDE_PX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Image processing is not supported in this browser.");
    }

    // JPEG has no transparency. Paint a white background so transparent PNGs do not turn black.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    bitmap.close();
  }
}
