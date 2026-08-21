const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;

/** iPhone の HEIC / 巨大写真を、API 向け JPEG に変換する */
export async function prepareJpeg(source: Blob): Promise<Blob> {
	const bitmap = await loadBitmap(source);
	const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
	const width = Math.max(1, Math.round(bitmap.width * scale));
	const height = Math.max(1, Math.round(bitmap.height * scale));

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		bitmap.close();
		throw new Error('canvas');
	}
	ctx.drawImage(bitmap, 0, 0, width, height);
	bitmap.close();

	const blob = await new Promise<Blob | null>((resolve) =>
		canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
	);
	if (!blob) throw new Error('jpeg');
	return blob;
}

async function loadBitmap(source: Blob): Promise<ImageBitmap> {
	try {
		return await createImageBitmap(source);
	} catch {
		return await loadBitmapFromImage(source);
	}
}

function loadBitmapFromImage(source: Blob): Promise<ImageBitmap> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(source);
		const image = new Image();
		image.onload = async () => {
			try {
				const bitmap = await createImageBitmap(image);
				resolve(bitmap);
			} catch (error) {
				reject(error);
			} finally {
				URL.revokeObjectURL(url);
			}
		};
		image.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('decode'));
		};
		image.src = url;
	});
}
