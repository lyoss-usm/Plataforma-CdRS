<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		htmlFor: string;
		hint?: string;
		error?: string | null;
		disabled?: boolean;
		children: Snippet;
	}

	let { label, htmlFor, hint, error = null, disabled = false, children }: Props = $props();
</script>

<div class="flex flex-col gap-1.5">
	<label
		for={htmlFor}
		class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase select-none {disabled
			? 'opacity-50'
			: ''}"
	>
		{label}
	</label>

	{@render children()}

	{#if error}
		<p class="text-body-sm mt-0.5 font-medium text-error" id={`${htmlFor}-error`}>
			{error}
		</p>
	{:else if hint}
		<p class="text-body-sm mt-0.5 text-on-surface-variant/70">{hint}</p>
	{/if}
</div>
