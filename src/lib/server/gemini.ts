import type { Framing, GeminiPhysiqueResponse } from '$lib/types/analysis';
import { PHYSIQUE_ANALYSIS_PROMPT } from '$lib/server/prompts';

const GEMINI_URL =
	'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export async function analyzePhysique(
	file: File,
	apiKey: string,
	mimeType: string
): Promise<GeminiPhysiqueResponse> {
	const base64 = arrayBufferToBase64(await file.arrayBuffer());

	const response = await fetch(GEMINI_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-goog-api-key': apiKey
		},
		body: JSON.stringify({
			contents: [
				{
					parts: [
						{
							inline_data: {
								mime_type: mimeType,
								data: base64
							}
						},
						{ text: PHYSIQUE_ANALYSIS_PROMPT }
					]
				}
			],
			generationConfig: {
				responseMimeType: 'application/json',
				temperature: 0.2
			}
		})
	});

	if (!response.ok) {
		throw new Error(`Gemini HTTP ${response.status}`);
	}

	const json = (await response.json()) as {
		candidates?: Array<{
			content?: { parts?: Array<{ text?: string }> };
		}>;
	};

	const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
	if (!text) {
		throw new Error('Gemini empty response');
	}

	return parsePhysiqueJson(text);
}

function parseFraming(value: unknown): Framing {
	if (value === 'bust' || value === 'waist' || value === 'full' || value === 'invalid') {
		return value;
	}
	return 'bust';
}

function parsePhysiqueJson(text: string): GeminiPhysiqueResponse {
	const parsed = JSON.parse(text) as Partial<GeminiPhysiqueResponse>;

	if (typeof parsed.person_count !== 'number') {
		throw new Error('Invalid person_count');
	}

	return {
		person_count: parsed.person_count,
		too_dark: Boolean(parsed.too_dark),
		person_too_small: Boolean(parsed.person_too_small),
		framing: parseFraming(parsed.framing),
		height_cm: Number(parsed.height_cm ?? 0),
		body_type: Number(parsed.body_type ?? 0),
		muscle_index: Number(parsed.muscle_index ?? 0),
		physique_index: Number(parsed.physique_index ?? 0),
		height_confidence: parsed.height_confidence,
		muscle_confidence: parsed.muscle_confidence,
		body_type_confidence: parsed.body_type_confidence,
		physique_confidence: parsed.physique_confidence
	};
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	const chunk = 0x8000;
	for (let i = 0; i < bytes.length; i += chunk) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
	}
	return btoa(binary);
}
