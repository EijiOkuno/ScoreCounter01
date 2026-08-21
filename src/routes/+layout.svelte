<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';

	let { children } = $props();

	const fullbleed = $derived(page.url.pathname === '/camera');
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>SCOUTER</title>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap"
	/>
</svelte:head>

<div class="app">
	<div class="grid-bg"></div>
	<div class="scanlines"></div>
	<div class="screen-slot" class:fullbleed>
		{@render children()}
	</div>
</div>
