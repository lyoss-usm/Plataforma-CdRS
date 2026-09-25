<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';

	interface Props {
		title: string;
		size?: 'sm' | 'md' | 'lg';
		onclose: () => void;
		header?: Snippet;
		footer?: Snippet;
		children: Snippet;
	}

	let { title, size = 'md', onclose, header, footer, children }: Props = $props();

	function enfocarModal(nodo: HTMLElement) {
		nodo.focus();
	}

	const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
		sm: 'max-w-sm',
		md: 'max-w-lg',
		lg: 'max-w-2xl'
	};
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') onclose();
	}}
/>

<div
	class="fixed inset-0 z-50 flex items-center justify-center p-4"
	role="dialog"
	aria-modal="true"
	aria-labelledby="modal-titulo"
>
	<button
		type="button"
		class="absolute inset-0 cursor-pointer bg-black/60 backdrop-blur-sm"
		aria-label="Cerrar"
		onclick={onclose}
	></button>

	<div
		class="relative max-h-[90vh] w-full overflow-y-auto rounded-base surface-level-3 p-6 {sizeClasses[
			size
		]}"
		tabindex="-1"
		use:enfocarModal
	>
		<div class="mb-5 flex items-start justify-between gap-4">
			<h2 id="modal-titulo" class="font-display text-headline-md font-semibold text-on-surface">
				{title}
			</h2>
			<button
				type="button"
				onclick={onclose}
				aria-label="Cerrar"
				class="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-base border border-glass-border bg-black/30 text-on-surface-variant transition hover:bg-black/50 hover:text-on-surface"
			>
				<Icon name="x" class="h-5 w-5" strokeWidth={1.8} />
			</button>
		</div>

		{@render header?.()}
		{@render children()}

		{#if footer}
			<div class="mt-6 flex flex-wrap items-center justify-end gap-3">{@render footer()}</div>
		{/if}
	</div>
</div>
