const MAX_BYTES = 15 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	heic: 'image/heic',
	heif: 'image/heif'
};

/** JPEG は .jpg / .jpeg / image/jpg をすべて image/jpeg に正規化する */
export function resolveImageMime(file: File): string | null {
	if (file.size <= 0 || file.size > MAX_BYTES) {
		return null;
	}

	const type = file.type.toLowerCase();
	if (type === 'image/jpeg' || type === 'image/jpg') {
		return 'image/jpeg';
	}
	if (type === 'image/png' || type === 'image/webp') {
		return type;
	}
	if (type === 'image/heic' || type === 'image/heif') {
		return type;
	}

	const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
	if (ext in MIME_BY_EXT) {
		return MIME_BY_EXT[ext];
	}

	// curl / ESP32 は MIME も拡張子も付けないことがある
	if (!type || type === 'application/octet-stream') {
		return 'image/jpeg';
	}

	return null;
}
