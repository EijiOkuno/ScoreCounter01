<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { clearSession, loadError, loadResult } from '$lib/analysis-session';
	import type { AnalyzeFailure, AnalyzeSuccess } from '$lib/types/analysis';

	let result = $state<AnalyzeSuccess['result'] | null>(null);
	let error = $state<AnalyzeFailure['error'] | null>(null);
	let displayPower = $state('0');

	onMount(() => {
		result = loadResult();
		error = loadError();
		if (!result && !error) {
			void goto('/');
			return;
		}
		if (result) countUp(result.battle_power);
	});

	function countUp(target: number) {
		const start = performance.now();
		const dur = 800;
		function tick(now: number) {
			const p = Math.min((now - start) / dur, 1);
			displayPower = Math.round(target * p).toLocaleString();
			if (p < 1) requestAnimationFrame(tick);
		}
		requestAnimationFrame(tick);
	}

	function retry() {
		clearSession();
		void goto('/camera');
	}
</script>

<p class="result-toplabel">POWER LEVEL</p>

{#if error}
	<div class="errbox">
		<div class="tag">{error.code}</div>
		<p class="msg">{error.message}</p>
	</div>
{:else if result}
	<div class="result-mid">
		<div class="power">{displayPower}</div>
		<div class="hr"></div>
		<div>
			<div class="stat-row">
				<span class="lbl">HEIGHT</span>
				<div class="valwrap"><span class="val">{result.height_cm}cm</span></div>
			</div>
			<div class="stat-row">
				<span class="lbl">BODY TYPE</span>
				<div class="valwrap">
					<div class="bar-track">
						<div class="bar-fill" style="width: {result.body_type}%"></div>
					</div>
					<span class="val">{result.body_type}</span>
				</div>
			</div>
			<div class="stat-row">
				<span class="lbl">MUSCLE</span>
				<div class="valwrap">
					<div class="bar-track">
						<div class="bar-fill" style="width: {result.muscle_index}%"></div>
					</div>
					<span class="val">{result.muscle_index}</span>
				</div>
			</div>
			<div class="stat-row">
				<span class="lbl">PHYSIQUE</span>
				<div class="valwrap">
					<div class="bar-track">
						<div class="bar-fill" style="width: {result.physique_index}%"></div>
					</div>
					<span class="val">{result.physique_index}</span>
				</div>
			</div>
		</div>
	</div>
{/if}

<div class="result-foot">
	<button class="btn" type="button" onclick={retry}>もう一度測定</button>
	<a class="link" href="/">トップへ</a>
</div>