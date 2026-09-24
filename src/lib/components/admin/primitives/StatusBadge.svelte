<script lang="ts">
	type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

	interface Props {
		tone?: BadgeTone;
		class?: string;
		children?: import('svelte').Snippet;
	}

	let { tone = 'neutral', class: className = '', children }: Props = $props();

	const toneClasses: Record<BadgeTone, string> = {
		neutral: 'border-glass-border bg-on-surface/10 text-on-surface-variant',
		info: 'border-secondary/40 bg-secondary/10 text-secondary',
		success: 'border-primary/40 bg-primary/10 text-primary',
		warning: 'border-tertiary/40 bg-tertiary/10 text-tertiary',
		error: 'border-error/50 bg-error/15 text-error'
	};
</script>

<span
	class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-xs tracking-wider uppercase select-none {toneClasses[
		tone
	]} {className}"
	role="status"
>
	{@render children?.()}
</span>
