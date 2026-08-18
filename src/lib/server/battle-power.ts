import type { PhysiqueEstimate } from '$lib/types/analysis';

export function calculateBattlePower(input: PhysiqueEstimate): number {
	return Math.round(
		input.height_cm * 10 +
			input.body_type * 50 +
			input.muscle_index * 60 +
			input.physique_index * 40
	);
}