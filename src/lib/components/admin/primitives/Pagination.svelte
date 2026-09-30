<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';

	interface Props {
		page: number;
		pageSize: number;
		total: number;
		onchange: (page: number) => void;
	}

	let { page, pageSize, total, onchange }: Props = $props();

	const totalPages = $derived(Math.max(Math.ceil(total / pageSize), 1));
	const inicio = $derived(total === 0 ? 0 : (page - 1) * pageSize + 1);
	const fin = $derived(Math.min(page * pageSize, total));

	function irA(pagina: number) {
		if (pagina < 1 || pagina > totalPages) return;
		onchange(pagina);
	}
</script>

{#if total > 0}
	<div class="flex flex-wrap items-center justify-between gap-3">
		<p class="font-mono text-xs tracking-wider text-on-surface-variant uppercase">
			Mostrando {inicio}–{fin} de {total}
		</p>

		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={() => irA(page - 1)}
				disabled={page <= 1}
				aria-label="Página anterior"
				class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-base border border-glass-border bg-surface-container-lowest text-on-surface-variant transition hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
			>
				<Icon name="chevron-left" class="h-4 w-4" />
			</button>

			<span
				class="min-w-28 text-center font-mono text-xs tracking-wider text-on-surface-variant uppercase"
			>
				Página {page} de {totalPages}
			</span>

			<button
				type="button"
				onclick={() => irA(page + 1)}
				disabled={page >= totalPages}
				aria-label="Página siguiente"
				class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-base border border-glass-border bg-surface-container-lowest text-on-surface-variant transition hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
			>
				<Icon name="chevron-right" class="h-4 w-4" />
			</button>
		</div>
	</div>
{/if}
