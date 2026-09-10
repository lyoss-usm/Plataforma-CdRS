<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { LoaderCircle, Search } from '@lucide/svelte';
	import GameCard from '$lib/components/GameCard.svelte';
	import type { CatalogPage } from '$lib/schemas';

	interface Props {
		paginaInicial: CatalogPage;
		errorInicial: string | null;
	}

	let { paginaInicial, errorInicial }: Props = $props();

	let pagina = $state(untrack(() => paginaInicial));
	let error = $state(untrack(() => errorInicial));
	let nombre = $state('');
	let cargando = $state(false);

	let primeraEjecucion = true;
	let solicitudActual: AbortController | null = null;

	async function buscarPorNombre(nombreActual: string): Promise<void> {
		solicitudActual?.abort();

		const controlador = new AbortController();
		solicitudActual = controlador;
		cargando = true;
		error = null;

		const parametros = new URLSearchParams();

		if (nombreActual !== '') {
			parametros.set('nombre', nombreActual);
		}

		const queryString = parametros.toString();
		const endpoint = queryString === '' ? '/api/catalogo' : `/api/catalogo?${queryString}`;

		try {
			const response = await fetch(endpoint, {
				signal: controlador.signal
			});

			if (!response.ok) {
				throw new Error(`La API respondió con HTTP ${response.status}.`);
			}

			const nuevaPagina = (await response.json()) as CatalogPage;

			if (solicitudActual === controlador) {
				pagina = nuevaPagina;
			}
		} catch (causa: unknown) {
			if (controlador.signal.aborted) {
				return;
			}

			console.error('No se pudo buscar en el catálogo:', causa);

			if (solicitudActual === controlador) {
				error = 'No pudimos actualizar el catálogo en este momento.';
			}
		} finally {
			if (solicitudActual === controlador) {
				cargando = false;
			}
		}
	}

	$effect(() => {
		const nombreActual = nombre.trim();

		if (primeraEjecucion) {
			primeraEjecucion = false;
			return;
		}

		solicitudActual?.abort();

		const temporizador = window.setTimeout(() => {
			void buscarPorNombre(nombreActual);
		}, 300);

		return () => {
			window.clearTimeout(temporizador);
		};
	});

	onDestroy(() => {
		solicitudActual?.abort();
	});
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

	<div class="w-full max-w-6xl">
		<div
			class="flex items-center gap-3 rounded-base border border-glass-border bg-surface-container-lowest px-4 py-2.5 text-on-surface-variant transition focus-within:border-primary/40"
		>
			<Search class="h-5 w-5 shrink-0" strokeWidth={1.8} aria-hidden="true" />

			<input
				type="search"
				bind:value={nombre}
				aria-label="Buscar juegos por nombre"
				placeholder="Buscar por nombre…"
				class="w-full bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/70"
			/>

			{#if cargando}
				<LoaderCircle class="h-5 w-5 shrink-0 animate-spin" strokeWidth={1.8} aria-hidden="true" />
				<span class="sr-only" role="status">Buscando juegos</span>
			{/if}
		</div>
	</div>

	{#if error}
		<div
			class="w-full max-w-6xl rounded-base border border-error/40 bg-error-container/20 p-4"
			role="alert"
		>
			<h3 class="font-semibold text-error">No fue posible cargar el catálogo</h3>
			<p class="mt-1 text-body-md text-on-surface-variant">
				{error} Intenta nuevamente dentro de unos momentos.
			</p>
		</div>
	{/if}

	{#if !error && pagina.juegos.length === 0}
		<p class="w-full max-w-6xl text-body-md text-on-surface-variant">
			No hay juegos que coincidan con tu búsqueda.
		</p>
	{:else if pagina.juegos.length > 0}
		<p
			class="w-full max-w-6xl font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
		>
			Mostrando {pagina.juegos.length} de {pagina.total} juegos
		</p>

		<div
			class="grid w-full max-w-6xl grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
		>
			{#each pagina.juegos as juego (juego.idJuego)}
				<GameCard {juego} />
			{/each}
		</div>
	{/if}
</section>
