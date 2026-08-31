<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		description = '',
		children,
		actions
	}: {
		title: string;
		description?: string;
		children: Snippet;
		actions?: Snippet;
	} = $props();
</script>

<div class="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div class="flex min-w-0 flex-col gap-1">
			<h1 class="font-display text-headline-lg font-semibold tracking-tight text-on-surface">
				{title}
			</h1>
			{#if description}
				<p class="text-body-md text-on-surface-variant">{description}</p>
			{/if}
		</div>
		{@render actions?.()}
	</div>
	<div class="mt-8">
		{@render children()}
	</div>
</div>
