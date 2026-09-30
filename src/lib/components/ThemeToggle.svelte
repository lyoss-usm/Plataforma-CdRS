<script lang="ts">
	import { Moon, Sun } from '@lucide/svelte';

	const DARK = 'frozen';
	const LIGHT = 'frozen-light';

	let isLight = $state(false);

	const apply = (light: boolean) => {
		isLight = light;
		document.documentElement.dataset.theme = light ? LIGHT : DARK;
		localStorage.setItem('theme', light ? LIGHT : DARK);
	};

	$effect(() => {
		const stored = localStorage.getItem('theme');
		if (stored === LIGHT || stored === DARK) apply(stored === LIGHT);
	});
</script>

<button
	type="button"
	class="fixed right-6 bottom-6 z-50 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-glass-border surface-level-2 text-on-surface-variant shadow-lg transition hover:text-on-surface hover:ice-glow"
	onclick={() => apply(!isLight)}
	aria-label={isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
	aria-pressed={isLight}
	title={isLight ? 'Modo claro' : 'Modo oscuro'}
>
	{#if isLight}
		<Moon class="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
	{:else}
		<Sun class="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
	{/if}
</button>