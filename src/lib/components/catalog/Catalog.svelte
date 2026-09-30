<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import CatalogFilters from './CatalogFilters.svelte';
	import GameCard from './GameCard.svelte';
	import SolicitudModal from './SolicitudModal.svelte';
	import type { CatalogFilterValues, CatalogGame, CatalogPage } from '$lib/schemas';

	interface Props {
		paginaInicial: CatalogPage;
		errorInicial: string | null;
	}

	const FILTROS_INICIALES: CatalogFilterValues = {
		nombre: '',
		jugadores: null,
		duracionMin: null,
		duracionMax: null,
		disponible: null,
		calificacionMin: null
	};

	let { paginaInicial, errorInicial }: Props = $props();

	let pagina = $state(untrack(() => paginaInicial));
	let error = $state(untrack(() => errorInicial));
	let cargando = $state(false);
	let filtrosActuales = $state<CatalogFilterValues | null>({ ...FILTROS_INICIALES });

	let solicitudActual: AbortController | null = null;
	let temporizadorActual: number | null = null;

	let juegoSeleccionado = $state<CatalogGame | null>(null);

	const juegosRestantes = $derived(Math.max(pagina.total - pagina.juegos.length, 0));

	function crearParametros(filtros: CatalogFilterValues, offset: number): URLSearchParams {
		const parametros = new SvelteURLSearchParams();

		if (filtros.nombre !== '') {
			parametros.set('nombre', filtros.nombre);
		}

		if (filtros.jugadores !== null) {
			parametros.set('jugadores', String(filtros.jugadores));
		}

		if (filtros.duracionMin !== null) {
			parametros.set('duracionMin', String(filtros.duracionMin));
		}

		if (filtros.duracionMax !== null) {
			parametros.set('duracionMax', String(filtros.duracionMax));
		}

		if (filtros.disponible !== null) {
			parametros.set('disponible', String(filtros.disponible));
		}

		if (filtros.calificacionMin !== null) {
			parametros.set('calificacionMin', String(filtros.calificacionMin));
		}

		if (offset > 0) {
			parametros.set('offset', String(offset));
		}

		return parametros;
	}

	async function consultarCatalogo(
		filtros: CatalogFilterValues,
		offset = 0,
		acumular = false
	): Promise<void> {
		const controlador = new AbortController();
		solicitudActual = controlador;
		cargando = true;
		error = null;

		const parametros = crearParametros(filtros, offset);
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

			if (solicitudActual !== controlador) {
				return;
			}

			if (acumular) {
				pagina = {
					juegos: [...pagina.juegos, ...nuevaPagina.juegos],
					total: nuevaPagina.total,
					hayMas: nuevaPagina.hayMas
				};
			} else {
				pagina = nuevaPagina;
			}
		} catch (causa: unknown) {
			if (controlador.signal.aborted) {
				return;
			}

			console.error('No se pudo consultar el catálogo:', causa);

			if (solicitudActual === controlador) {
				error = 'No pudimos actualizar el catálogo en este momento.';
			}
		} finally {
			if (solicitudActual === controlador) {
				solicitudActual = null;
				cargando = false;
			}
		}
	}

	function programarConsulta(filtros: CatalogFilterValues | null): void {
		if (temporizadorActual !== null) {
			window.clearTimeout(temporizadorActual);
			temporizadorActual = null;
		}

		if (solicitudActual !== null) {
			solicitudActual.abort();
			solicitudActual = null;
		}

		filtrosActuales = filtros;
		cargando = filtros !== null;

		if (filtros === null) {
			return;
		}

		temporizadorActual = window.setTimeout(() => {
			temporizadorActual = null;
			void consultarCatalogo(filtros);
		}, 300);
	}

	async function cargarMas(): Promise<void> {
		if (filtrosActuales === null || cargando || error !== null || !pagina.hayMas) {
			return;
		}

		await consultarCatalogo(filtrosActuales, pagina.juegos.length, true);
	}

	function abrirSolicitud(juego: CatalogGame): void {
		juegoSeleccionado = juego;
	}

	onDestroy(() => {
		if (temporizadorActual !== null) {
			window.clearTimeout(temporizadorActual);
		}

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

	<CatalogFilters {cargando} onCambiar={programarConsulta} />

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
				<GameCard {juego} onPedir={abrirSolicitud} />
			{/each}
		</div>
	{/if}

	{#if pagina.hayMas && !error}
		<button
			type="button"
			onclick={cargarMas}
			disabled={cargando || filtrosActuales === null}
			class="cursor-pointer rounded-base border border-primary/50 bg-primary/10 px-6 py-2 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow disabled:cursor-not-allowed disabled:opacity-60"
		>
			{cargando ? 'Cargando…' : `Cargar más (${juegosRestantes} restantes)`}
		</button>
	{/if}
</section>

{#if juegoSeleccionado}
	<SolicitudModal juego={juegoSeleccionado} onclose={() => (juegoSeleccionado = null)} />
{/if}
