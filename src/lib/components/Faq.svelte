<script lang="ts">
	import { Plus } from '@lucide/svelte';
	import { landing } from '$lib/data/landing';

	const faqs = landing.faq;
</script>

<section
	id="faq"
	class="flex scroll-mt-16 flex-col items-center justify-center gap-6 glass-border p-12 px-6 py-24"
>
	<h2 class="font-display text-headline-lg font-semibold text-on-surface">Preguntas frecuentes</h2>

	<div class="mt-2 flex w-full max-w-2xl flex-col gap-3">
		{#each faqs as faq (faq.q)}
			<details
				class="group rounded-base border border-glass-border bg-surface-container-lowest transition hover:border-primary/40"
			>
				<summary
					class="flex cursor-pointer list-none items-center justify-between gap-4 rounded-base px-5 py-4 font-display text-body-lg font-semibold text-on-surface select-none [&::-webkit-details-marker]:hidden"
				>
					<span>{faq.q}</span>
					<Plus
						class="h-5 w-5 shrink-0 text-primary transition-transform group-open:rotate-45"
						strokeWidth={1.8}
						aria-hidden="true"
					/>
				</summary>
				<p class="px-5 pb-5 text-body-md text-on-surface-variant">{faq.a}</p>
			</details>
		{/each}
	</div>
</section>
