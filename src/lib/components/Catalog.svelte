<script lang="ts">
	import GameCard from '$lib/components/GameCard.svelte';
	import type { CatalogPage } from '$lib/schemas';

	interface Props {
		paginaInicial: CatalogPage;
		errorInicial: string | null;
	}

	let { paginaInicial, errorInicial }: Props = $props();
</script>

<section
	id="catalogo"
	class="flex scroll-mt-16 flex-col items-center gap-8 glass-border px-6 py-24"
>
	<div class="flex w-full max-w-6xl flex-col gap-8">
		<div class="flex gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div class="flex flex-col gap-2">
				<h2 class="font-display text-headline-lg font-semibold text-on-surface">Catálogo</h2>

				<p class="max-w-xl text-body-md text-on-surface-variant">
					Préstamo gratuito entre estudiantes. Cada caja viene completa, con sus instrucciones y
					piezas.
				</p>
			</div>

			<img
				src="/rolo/rolo_cargando_cajas_fix.png"
				alt="Rolo cargando cajas de juegos del catálogo"
				class="w-28 shrink-0 self-start drop-shadow-lg sm:w-32 lg:w-36"
				loading="lazy"
				width="200"
				height="200"
			/>
		</div>
	</div>

	{#if errorInicial}
		<div
			class="w-full max-w-6xl rounded-base border border-error/40 bg-error-container/20 p-4"
			role="alert"
		>
			<h3 class="font-semibold text-error">No fue posible cargar el catálogo</h3>
			<p class="mt-1 text-body-md text-on-surface-variant">
				{errorInicial} Intenta recargar la página dentro de unos momentos.
			</p>
		</div>
	{:else if paginaInicial.juegos.length === 0}
		<p class="w-full max-w-6xl text-body-md text-on-surface-variant">
			Actualmente no hay juegos registrados en el catálogo.
		</p>
	{:else}
		<p
			class="w-full max-w-6xl font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
		>
			Mostrando {paginaInicial.juegos.length} de {paginaInicial.total} juegos
		</p>

		<div
			class="grid w-full max-w-6xl grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
		>
			{#each paginaInicial.juegos as juego (juego.idJuego)}
				<GameCard {juego} />
			{/each}
		</div>
	{/if}
</section>
