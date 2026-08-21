<script lang="ts">
	import { onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { setPendingImage } from '$lib/analysis-session';
	import { prepareJpeg } from '$lib/prepare-image';

	let videoEl = $state<HTMLVideoElement | undefined>();
	let stream = $state<MediaStream | null>(null);
	let started = $state(false);
	let busy = $state(false);
	let error = $state('');

	onDestroy(() => {
		stream?.getTracks().forEach((track) => track.stop());
	});

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
				return;
			} catch {
				stream = null;
			}
		}

		error = 'カメラを許可してください';
	}

	async function submitImage(source: Blob) {
		busy = true;
		error = '';
		try {
			const jpeg = await prepareJpeg(source);
			setPendingImage(jpeg);
			stream?.getTracks().forEach((track) => track.stop());
			await goto('/analyzing');
		} catch {
			error = 'この画像は読み込めませんでした。別の写真を試してください。';
		} finally {
			busy = false;
		}
	}

	async function onFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		await submitImage(file);
	}

	async function onShutter() {
		if (!started) {
			await startCamera();
			return;
		}
		await capture();
	}

	async function capture() {
		if (!videoEl || !started || busy) return;
		const canvas = document.createElement('canvas');
		canvas.width = videoEl.videoWidth;
		canvas.height = videoEl.videoHeight;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.drawImage(videoEl, 0, 0);
		const blob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, 'image/jpeg', 0.9)
		);
		if (!blob) return;
		await submitImage(blob);
	}
</script>

<div class="cam-page">
	<video class="cam-video" bind:this={videoEl} autoplay playsinline muted></video>

	{#if !started || error}
		<div class="cam-placeholder">
			{error || (busy ? '画像を準備しています...' : 'カメラを起動するか、写真を選んでください')}
		</div>
	{/if}

	<div class="vignette"></div>
	<div class="cam-top">
		<p>全身を入れてください</p>
		<p>1人だけ撮影してください</p>
		<p>できるだけ正面を向いてください</p>
	</div>
	<div class="frame">
		<div class="bracket tl"></div>
		<div class="bracket tr"></div>
		<div class="bracket bl"></div>
		<div class="bracket br"></div>
		<div class="sweep"></div>
	</div>
	<div class="cam-bottom">
		<a class="link cam-side" href="/">キャンセル</a>
		<button
			class="shutter"
			type="button"
			aria-label={started ? '撮影' : 'カメラを起動'}
			disabled={busy}
			onclick={onShutter}
		>
			<span></span>
		</button>
		<div class="cam-side right">
			<button class="link" type="button" onclick={startCamera}>起動</button>
			<label class="link">
				写真
				<input type="file" accept="image/*" hidden onchange={onFile} />
			</label>
		</div>
	</div>
</div>
