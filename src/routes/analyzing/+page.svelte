<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { takePendingImage, saveResult, saveError } from '$lib/analysis-session';
	import type { AnalyzeResponse } from '$lib/types/analysis';

	const MIN_WAIT_MS = 1600;
	let line = $state(0);

	onMount(() => {
		const id = setInterval(() => {
			if (line < 2) line += 1;
		}, 500);
		void runAnalyze();
		return () => clearInterval(id);
	});

	async function runAnalyze() {
		const blob = takePendingImage();
		if (!blob) {
			await goto('/camera');
			return;
		}

		const started = Date.now();
		const form = new FormData();
		const file = new File([blob], 'capture.jpg', {
			type: blob.type || 'image/jpeg'
		});
		form.append('image', file);

		let data: AnalyzeResponse;
		try {
			const res = await fetch('/api/analyze', { method: 'POST', body: form });
			data = (await res.json()) as AnalyzeResponse;
		} catch {
			data = {
				success: false,
				error: {
					code: 'API_ERROR',
					message: '解析に失敗しました。しばらくしてからもう一度お試しください。'
				}
			};
		}

		const wait = Math.max(0, MIN_WAIT_MS - (Date.now() - started));
		if (wait > 0) await new Promise((r) => setTimeout(r, wait));

		if (data.success) {
			saveResult(data.result);
		} else {
			saveError(data.error);
		}
		await goto('/result');
	}
</script>

<div class="analyzing-mid">
	<div class="radar">
		<div class="ring r1"></div>
		<div class="ring r2"></div>
		<div class="ring r3"></div>
		<div class="radar-sweep"></div>
		<div class="dot"></div>
	</div>
	<div class="statuses">
		<p class:on={line >= 0}>TARGET LOCKED</p>
		<p class:on={line >= 1}>ANALYZING...</p>
		<p class:on={line >= 2}>POWER SCANNING...</p>
	</div>
	<div class="progress-track"><div class="progress-fill"></div></div>
</div>