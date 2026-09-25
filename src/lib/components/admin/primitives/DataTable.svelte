<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { DataColumn } from './types';

	interface Props {
		columns: DataColumn[];
		rows: T[];
		keyRow: (row: T) => string;
		cell: Snippet<[T, DataColumn]>;
		mobileCard?: Snippet<[T]>;
		loading?: boolean;
		error?: string | null;
		emptyMessage?: string;
		emptyDescription?: string;
		toolbar?: Snippet;
	}

	let {
		columns,
		rows,
		keyRow,
		cell,
		mobileCard,
		loading = false,
		error = null,
		emptyMessage = 'Sin resultados',
		emptyDescription = 'No hay registros que coincidan con el filtro actual.',
		toolbar
	}: Props = $props();

	const alignClasses: Record<NonNullable<DataColumn['align']>, string> = {
		left: 'text-left',
		right: 'text-right',
		center: 'text-center'
	};
	const filasEsqueleto = [0, 1, 2, 3];

	function thClasses(column: DataColumn): string {
		const base = `px-4 py-3 font-mono text-label-md tracking-wider text-on-surface-variant uppercase ${
			alignClasses[column.align ?? 'left']
		}`;
		return column.mobileHidden ? `${base} hidden md:table-cell` : base;
	}

	function tdClasses(column: DataColumn): string {
		const base = `px-4 py-3 text-body-md text-on-surface ${alignClasses[column.align ?? 'left']}`;
		return column.mobileHidden ? `${base} hidden md:table-cell` : base;
	}

	function barraAncho(column: DataColumn): string {
		if (column.mobileHidden) return 'hidden md:block';
		return 'block';
	}
</script>

<div class="overflow-hidden rounded-base border border-glass-border surface-level-1">
	{#if toolbar}
		<div
			class="flex flex-wrap items-center justify-between gap-3 border-b border-glass-border px-4 py-3"
		>
			{@render toolbar()}
		</div>
	{/if}

	{#if error && !loading}
		<div class="flex flex-col items-center gap-3 px-6 py-12 text-center">
			<span
				class="flex h-12 w-12 items-center justify-center rounded-full border border-error/50 bg-error/15"
			>
				<Icon name="circle-alert" class="h-6 w-6 text-error" />
			</span>
			<p class="font-display text-headline-md font-semibold text-on-surface">
				No pudimos cargar los datos
			</p>
			<p class="max-w-md text-body-md text-on-surface-variant">{error}</p>
		</div>
	{:else if rows.length === 0 && !loading}
		<div class="flex flex-col items-center gap-3 px-6 py-12 text-center">
			<span
				class="flex h-12 w-12 items-center justify-center rounded-full border border-glass-border bg-on-surface/10"
			>
				<Icon name="search" class="h-6 w-6 text-on-surface-variant" />
			</span>
			<p class="font-display text-headline-md font-semibold text-on-surface">{emptyMessage}</p>
			{#if emptyDescription}
				<p class="max-w-md text-body-md text-on-surface-variant">{emptyDescription}</p>
			{/if}
		</div>
	{:else}
		{#if mobileCard}
			<div class="grid gap-3 p-3 md:hidden" aria-busy={loading || undefined}>
				{#if loading}
					{#each filasEsqueleto as indice (indice)}
						<div class="rounded-base border border-glass-border surface-level-1 p-3.5">
							<div
								class="h-4 w-2/5 animate-pulse rounded-full bg-on-surface/15"
								aria-hidden="true"
							></div>
							<div
								class="mt-2 h-3 w-4/5 animate-pulse rounded-full bg-on-surface/15"
								aria-hidden="true"
							></div>
							<div
								class="mt-2 h-3 w-1/3 animate-pulse rounded-full bg-on-surface/15"
								aria-hidden="true"
							></div>
						</div>
					{/each}
				{:else}
					{#each rows as row (keyRow(row))}
						<div class="rounded-base border border-glass-border surface-level-1 p-3.5">
							{@render mobileCard(row)}
						</div>
					{/each}
				{/if}
			</div>
		{/if}

		<div class="overflow-x-auto {mobileCard ? 'hidden md:block' : ''}">
			{#if loading}
				<table
					class="w-full min-w-[560px] border-collapse text-left"
					aria-busy="true"
					aria-label="Cargando datos"
				>
					<thead>
						<tr class="border-b border-glass-border bg-white/[0.03]">
							{#each columns as column (column.id)}
								<th scope="col" class={thClasses(column)}>{column.label}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each filasEsqueleto as indice (indice)}
							<tr class="border-b border-glass-border last:border-b-0" aria-rowindex={indice + 1}>
								{#each columns as column (column.id)}
									<td class={`px-4 py-3.5 ${alignClasses[column.align ?? 'left']}`}>
										<div
											class={`h-3.5 w-3/5 animate-pulse rounded-full bg-on-surface/15 ${barraAncho(column)}`}
										></div>
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<table class="w-full min-w-[560px] border-collapse text-left">
					<thead>
						<tr class="border-b border-glass-border bg-white/[0.03]">
							{#each columns as column (column.id)}
								<th scope="col" class={thClasses(column)}>{column.label}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each rows as row (keyRow(row))}
							<tr class="border-b border-glass-border transition last:border-b-0 hover:bg-white/5">
								{#each columns as column (column.id)}
									<td class={tdClasses(column)}>{@render cell(row, column)}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	{/if}
</div>
