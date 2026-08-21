import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { analyzePhysique } from '$lib/server/gemini';
import { calculateBattlePower } from '$lib/server/battle-power';
import { resolveImageMime } from '$lib/server/image-validation';
import {
	ERROR_MESSAGES,
	type AnalyzeResponse,
	type ErrorCode
} from '$lib/types/analysis';

const BODY_CONFIDENCE_THRESHOLD = 0.35;
const DEFAULT_HEIGHT_CM = 170;

export const POST: RequestHandler = async ({ request, platform }) => {
	const apiKey = platform?.env?.GEMINI_API_KEY;

	if (!apiKey) {
		return fail('API_ERROR');
	}

	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return fail('INVALID_IMAGE');
	}

	const image = form.get('image');
	if (!(image instanceof File)) {
		return fail('INVALID_IMAGE');
	}

	const mime = resolveImageMime(image);
	if (!mime) {
		return fail('INVALID_IMAGE');
	}

	const heightOverride = parseHeight(form.get('height_cm'));

	const deviceId = form.get('device_id');
	const requestId = form.get('request_id');
	void deviceId;
	void requestId;

	try {
		const physique = await analyzePhysique(image, apiKey, mime);

		if (physique.person_count <= 0 || physique.framing === 'invalid') {
			return fail('NO_PERSON');
		}
		if (physique.person_count > 1) return fail('MULTIPLE_PERSONS');
		if (physique.too_dark) return fail('TOO_DARK');
		if (physique.person_too_small) return fail('PERSON_TOO_SMALL');

		const bodyConfidences = [
			physique.muscle_confidence,
			physique.body_type_confidence,
			physique.physique_confidence
		].filter((v): v is number => typeof v === 'number');

		if (
			bodyConfidences.length > 0 &&
			bodyConfidences.every((v) => v < BODY_CONFIDENCE_THRESHOLD)
		) {
			return fail('LOW_CONFIDENCE');
		}

		const height_cm = heightOverride ?? (
			physique.height_cm > 0 ? Math.round(physique.height_cm) : DEFAULT_HEIGHT_CM
		);

		const estimate = {
			height_cm,
			body_type: clampIndex(physique.body_type),
			muscle_index: clampIndex(physique.muscle_index),
			physique_index: clampIndex(physique.physique_index),
			framing: physique.framing
		};

		const battle_power = calculateBattlePower(estimate);

		const body: AnalyzeResponse = {
			success: true,
			result: {
				battle_power,
				...estimate
			}
		};

		return json(body);
	} catch (error) {
		console.error(error);
		return fail('API_ERROR');
	}
};

function parseHeight(value: FormDataEntryValue | null): number | null {
	if (typeof value !== 'string' || value.trim() === '') return null;
	const n = Number(value);
	if (!Number.isFinite(n)) return null;
	const rounded = Math.round(n);
	if (rounded < 100 || rounded > 230) return null;
	return rounded;
}

function clampIndex(value: number): number {
	return Math.min(100, Math.max(0, Math.round(value)));
}

function fail(code: ErrorCode, status = 200) {
	const body: AnalyzeResponse = {
		success: false,
		error: {
			code,
			message: ERROR_MESSAGES[code]
		}
	};
	return json(body, { status });
}
