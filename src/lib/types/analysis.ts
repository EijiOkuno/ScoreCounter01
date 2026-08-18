export type ErrorCode =
    | 'NO_PERSON'
    | 'MULTIPLE_PERSONS'
    | 'TOO_DARK'
    | 'PERSON_TOO_SMALL'
    | 'LOW_CONFIDENCE'
    | 'INVALID_IMAGE'
    | 'API_ERROR';

export type PhysiqueEstimate = {
	height_cm: number;
	body_type: number;
	muscle_index: number;
	physique_index: number;
	height_confidence?: number;
	muscle_confidence?: number;
	body_type_confidence?: number;
	physique_confidence?: number;
};

/** Gemini が返す想定（戦闘力は含めない） */
export type GeminiPhysiqueResponse = PhysiqueEstimate & {
    person_count: number;
	too_dark: boolean;
	person_too_small: boolean;
};

export type AnalyzeSuccess = {
    success: true;
	result: PhysiqueEstimate & {
		battle_power: number;
	};
};

export type AnalyzeFailure = {
    success: false;
	error: {
		code: ErrorCode;
		message: string;
	};
};

export type AnalyzeResponse = AnalyzeSuccess | AnalyzeFailure;

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
	NO_PERSON: '人物を認識できませんでした。全身が写るように撮影してください。',
	MULTIPLE_PERSONS: '複数の人物が検出されました。1人だけ撮影してください。',
	TOO_DARK: '画像が暗すぎます。明るい場所で撮影してください。',
	PERSON_TOO_SMALL: '人物が小さすぎます。もう少し近づいて撮影してください。',
	LOW_CONFIDENCE: '解析の確度が低いです。明るい場所で全身を正面から撮り直してください。',
	INVALID_IMAGE: '画像の形式またはサイズが不正です。JPEG / PNG / WebP、5MB以下で送信してください。',
	API_ERROR: '解析に失敗しました。しばらくしてからもう一度お試しください。'
};