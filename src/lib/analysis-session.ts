import type { AnalyzeFailure, AnalyzeSuccess } from '$lib/types/analysis';

let pendingImage: Blob | null = null;

export function setPendingImage(blob: Blob) {
	pendingImage = blob;
}

export function takePendingImage(): Blob | null {
	const blob = pendingImage;
	pendingImage = null;
	return blob;
}

const RESULT_KEY = 'scouter-result';
const ERROR_KEY = 'scouter-error';

export function saveResult(result: AnalyzeSuccess['result']) {
	sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
	sessionStorage.removeItem(ERROR_KEY);
}

export function saveError(error: AnalyzeFailure['error']) {
	sessionStorage.setItem(ERROR_KEY, JSON.stringify(error));
	sessionStorage.removeItem(RESULT_KEY);
}

export function loadResult(): AnalyzeSuccess['result'] | null {
	const raw = sessionStorage.getItem(RESULT_KEY);
	return raw ? (JSON.parse(raw) as AnalyzeSuccess['result']) : null;
}

export function loadError(): AnalyzeFailure['error'] | null {
	const raw = sessionStorage.getItem(ERROR_KEY);
	return raw ? (JSON.parse(raw) as AnalyzeFailure['error']) : null;
}

export function clearSession() {
	pendingImage = null;
	sessionStorage.removeItem(RESULT_KEY);
	sessionStorage.removeItem(ERROR_KEY);
}