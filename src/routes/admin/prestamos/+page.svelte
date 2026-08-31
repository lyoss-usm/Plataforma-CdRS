<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import SectionPage from '$lib/components/admin/SectionPage.svelte';
	import SectionPlaceholder from '$lib/components/admin/SectionPlaceholder.svelte';
	import { loanRouteFor, loanTypeMeta, roleMeta, type LoanType } from '$lib/data/admin';
	import { adminSession } from '$lib/stores/adminSession.svelte';

	const role = $derived(adminSession.user.role);
	const tipo = $derived<LoanType>(
		(page.url.searchParams.get('tipo') as LoanType | null) ?? roleMeta[role].defaultTipo
	);

	const tipoClasses = (t: LoanType) =>
		t === tipo ? 'bg-primary/15 text-primary' : 'text-on-surface-variant hover:text-on-surface';
</script>

<SectionPage title="Préstamos" description={loanTypeMeta[tipo].label}>
	{#snippet actions()}
		{#if roleMeta[role].allowed.length > 1}
			<div
				class="flex items-center rounded-base border border-glass-border bg-white/5 p-0.5"
				role="group"
				aria-label="Tipo de préstamo"
			>
				{#each ['general', 'junta'] as const as t (t)}
					<a
						href={resolve(loanRouteFor[t])}
						aria-current={t === tipo ? 'page' : undefined}
						class="rounded-base px-3 py-1.5 font-mono text-label-md tracking-wider uppercase transition {tipoClasses(
							t
						)}"
					>
						{loanTypeMeta[t].label}
					</a>
				{/each}
			</div>
		{/if}
	{/snippet}

	<SectionPlaceholder
		description="Punto de venta: busca el juego, identifica al solicitante y crea o cierra el préstamo. Esta vista aún no tiene maqueta."
	/>
</SectionPage>
