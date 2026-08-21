<script lang="ts">
	import { onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { clearSession, saveError, saveResult } from '$lib/analysis-session';
	import { prepareJpeg } from '$lib/prepare-image';
	import type { AnalyzeResponse, AnalyzeSuccess, Framing } from '$lib/types/analysis';

	const SCAN_GAP_MS = 3500;
	const MAX_SCANS = 8;

	let videoEl = $state<HTMLVideoElement | undefined>();
	let stream = $state<MediaStream | null>(null);
	let started = $state(false);
	let scanning = $state(false);
	let inFlight = $state(false);
	let error = $state('');
	let heightInput = $state('');
	let scanCount = $state(0);
	let displayPower = $state(0);
	let latest = $state<AnalyzeSuccess['result'] | null>(null);
	let framing = $state<Framing | null>(null);

	let loopTimer: ReturnType<typeof setTimeout> | null = null;
	let destroyed = false;

	const statusLocked = $derived(started);
	const statusAnalyzing = $derived(started && (inFlight || scanning));
	const statusScanning = $derived(started && (Boolean(latest) || inFlight));

	onDestroy(() => {
		destroyed = true;
		stopLoop();
		stream?.getTracks().forEach((track) => track.stop());
	});

	function stopLoop() {
		scanning = false;
		if (loopTimer) {
			clearTimeout(loopTimer);
			loopTimer = null;
		}
	}

	function parsedHeight(): number | null {
		const n = Number(heightInput);
		if (!Number.isFinite(n)) return null;
		const rounded = Math.round(n);
		if (rounded < 100 || rounded > 230) return null;
		return rounded;
	}

	async function startCamera() {
		error = '';
		const constraints: MediaStreamConstraints[] = [
			{ video: { facingMode: { exact: 'environment' } }, audio: false },
			{ video: { facingMode: 'environment' }, audio: false },
			{ video: true, audio: false }
		];

		for (const constraint of constraints) {
			try {
				stream = await navigator.mediaDevices.getUserMedia(constraint);
				if (videoEl) {
					videoEl.srcObject = stream;
					videoEl.setAttribute('playsinline', 'true');
					await videoEl.play();
				}
				started = true;
				startScanLoop();
				return;
			} catch {
				stream = null;
			}
		}

		error = 'カメラを許可してください';
	}

	function startScanLoop() {
		stopLoop();
		scanning = true;
		void runScanCycle();
	}

	async function runScanCycle() {
		if (destroyed || !scanning) return;

		if (scanCount >= MAX_SCANS) {
			scanning = false;
			return;
		}

		await scanOnce();

		if (destroyed || !scanning) return;
		if (scanCount >= MAX_SCANS) {
			scanning = false;
			return;
		}

		loopTimer = setTimeout(() => {
			void runScanCycle();
		}, SCAN_GAP_MS);
	}

	async function captureFrame(): Promise<Blob | null> {
		if (!videoEl || !started || videoEl.videoWidth <= 0) return null;
		const canvas = document.createElement('canvas');
		canvas.width = videoEl.videoWidth;
		canvas.height = videoEl.videoHeight;
		const ctx = canvas.getContext('2d');
		if (!ctx) return null;
		ctx.drawImage(videoEl, 0, 0);
		return await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, 'image/jpeg', 0.85)
		);
	}

	async function analyzeBlob(source: Blob): Promise<AnalyzeResponse> {
		const jpeg = await prepareJpeg(source);
		const form = new FormData();
		form.append('image', new File([jpeg], 'capture.jpg', { type: 'image/jpeg' }));
		const height = parsedHeight();
		if (height !== null) form.append('height_cm', String(height));

		const res = await fetch('/api/analyze', { method: 'POST', body: form });
		return (await res.json()) as AnalyzeResponse;
	}

	async function scanOnce() {
		if (inFlight || !started) return;
		inFlight = true;
		error = '';

		try {
			const frame = await captureFrame();
			if (!frame) return;

			const data = await analyzeBlob(frame);
			scanCount += 1;

			if (data.success) {
				latest = data.result;
				framing = data.result.framing ?? null;
				animatePower(data.result.battle_power);
			} else if (!latest) {
				error = data.error.message;
			}
		} catch {
			if (!latest) error = '解析に失敗しました。通信状況を確認してください。';
		} finally {
			inFlight = false;
		}
	}

	function animatePower(target: number) {
		const from = displayPower;
		const start = performance.now();
		const dur = 500;
		function tick(now: number) {
			const p = Math.min((now - start) / dur, 1);
			displayPower = Math.round(from + (target - from) * p);
			if (p < 1) requestAnimationFrame(tick);
		}
		requestAnimationFrame(tick);
	}

	async function onFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;

		stopLoop();
		inFlight = true;
		error = '';

		try {
			const data = await analyzeBlob(file);
			if (data.success) {
				saveResult(data.result);
				stream?.getTracks().forEach((track) => track.stop());
				await goto('/result');
			} else {
				saveError(data.error);
				await goto('/result');
			}
		} catch {
			error = 'この画像は読み込めませんでした。別の写真を試してください。';
			if (started) startScanLoop();
		} finally {
			inFlight = false;
		}
	}

	async function confirm() {
		if (!latest) return;
		stopLoop();
		saveResult(latest);
		stream?.getTracks().forEach((track) => track.stop());
		await goto('/result');
	}

	function cancel() {
		stopLoop();
		clearSession();
		stream?.getTracks().forEach((track) => track.stop());
		void goto('/');
	}

	async function onPrimary() {
		if (!started) {
			await startCamera();
			return;
		}
		if (latest) {
			await confirm();
			return;
		}
		if (!scanning && scanCount < MAX_SCANS) {
			startScanLoop();
		}
	}
</script>

<div class="cam-page">
	<video class="cam-video" bind:this={videoEl} autoplay playsinline muted></video>

	{#if !started}
		<div class="cam-placeholder">
			{error || 'カメラを起動するか、写真を選んでください'}
		</div>
	{/if}

	<div class="vignette"></div>

	<div class="cam-top">
		<div class="top-label cam-label">
			<span class="dot"></span>
			{#if !started}
				STANDBY
			{:else if inFlight}
				SCANNING {scanCount}/{MAX_SCANS}
			{:else if latest}
				TARGET LOCKED
			{:else}
				SEEKING...
			{/if}
		</div>
		<p>顔と両肩が入るようにしてください</p>
		<p>1人だけ撮影してください</p>
		<p>できるだけ正面を向いてください</p>
	</div>

	<div class="hud-panel" class:active={started}>
		<p class="result-toplabel">POWER LEVEL</p>
		<div class="power hud-power">{latest ? displayPower.toLocaleString() : '----'}</div>
		<div class="hr hud-hr"></div>
		<div class="statuses hud-statuses">
			<p class:on={statusLocked}>TARGET LOCKED</p>
			<p class:on={statusAnalyzing}>ANALYZING...</p>
			<p class:on={statusScanning}>POWER SCANNING...</p>
		</div>
		{#if framing}
			<p class="hud-meta">FRAMING {framing.toUpperCase()}</p>
		{/if}
		{#if inFlight}
			<div class="progress-track hud-progress"><div class="progress-fill"></div></div>
		{/if}
	</div>

	<div class="frame frame-bust">
		<div class="bracket tl"></div>
		<div class="bracket tr"></div>
		<div class="bracket bl"></div>
		<div class="bracket br"></div>
		<div class="sweep"></div>
	</div>

	{#if error && started}
		<p class="live-error">{error}</p>
	{/if}

	<div class="cam-bottom">
		<button class="link cam-side" type="button" onclick={cancel}>キャンセル</button>
		<button
			class="shutter"
			type="button"
			aria-label={started ? (latest ? '確定' : 'スキャン') : 'カメラを起動'}
			disabled={inFlight && !started}
			onclick={onPrimary}
		>
			<span></span>
		</button>
		<div class="cam-side right">
			{#if !started}
				<button class="link" type="button" onclick={startCamera}>起動</button>
			{:else if latest}
				<button class="link" type="button" onclick={confirm}>確定</button>
			{:else}
				<span class="cam-hint-text">{scanCount}/{MAX_SCANS}</span>
			{/if}
			<label class="link">
				写真
				<input type="file" accept="image/*" hidden onchange={onFile} />
			</label>
		</div>
	</div>

	<div class="cam-height-bar">
		<label class="height-field">
			<span>HEIGHT</span>
			<input
				type="number"
				inputmode="numeric"
				min="100"
				max="230"
				placeholder="任意"
				bind:value={heightInput}
			/>
			<span>cm</span>
		</label>
	</div>
</div>
