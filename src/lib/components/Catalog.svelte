<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { ChevronDown, LoaderCircle, Search } from '@lucide/svelte';
	import GameCard from '$lib/components/GameCard.svelte';
	import type { CatalogPage } from '$lib/schemas';

	interface Props {
		paginaInicial: CatalogPage;
		errorInicial: string | null;
	}

	interface FiltrosCatalogo {
		nombre: string;
		jugadores: number | null;
	}

	let { paginaInicial, errorInicial }: Props = $props();

	let pagina = $state(untrack(() => paginaInicial));
	let error = $state(untrack(() => errorInicial));
	let nombre = $state('');
	let jugadores = $state<number | null>(null);
	let cargando = $state(false);
	let menuJugadoresAbierto = $state(false);

	let primeraEjecucion = true;
	let solicitudActual: AbortController | null = null;

	const jugadoresValidos = $derived(
		jugadores === null || (Number.isInteger(jugadores) && jugadores > 0)
	);

	const hayFiltrosActivos = $derived(nombre.trim() !== '' || jugadores !== null);

	const chipBase =
		'cursor-pointer rounded-full border px-3 py-1 font-mono text-sm tracking-wide transition';

	function limpiarFiltros(): void {
		nombre = '';
		jugadores = null;
		menuJugadoresAbierto = false;
	}

	async function consultarCatalogo(filtros: FiltrosCatalogo): Promise<void> {
		solicitudActual?.abort();

		const controlador = new AbortController();
		solicitudActual = controlador;
		cargando = true;
		error = null;

		const parametros = new URLSearchParams();

		if (filtros.nombre !== '') {
			parametros.set('nombre', filtros.nombre);
		}

		if (filtros.jugadores !== null) {
			parametros.set('jugadores', String(filtros.jugadores));
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

			console.error('No se pudo consultar el catálogo:', causa);

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
		const jugadoresActuales = jugadores;

		if (primeraEjecucion) {
			primeraEjecucion = false;
			return;
		}

		solicitudActual?.abort();

		if (
			jugadoresActuales !== null &&
			(!Number.isInteger(jugadoresActuales) || jugadoresActuales <= 0)
		) {
			cargando = false;
			return;
		}

		const temporizador = window.setTimeout(() => {
			void consultarCatalogo({
				nombre: nombreActual,
				jugadores: jugadoresActuales
			});
		}, 300);

		return () => {
			window.clearTimeout(temporizador);
		};
	});

	onDestroy(() => {
		solicitudActual?.abort();
	});
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape') {
			menuJugadoresAbierto = false;
		}
	}}
/>

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

	<div class="flex w-full max-w-6xl flex-col gap-3">
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
				<span class="sr-only" role="status">Actualizando catálogo</span>
			{/if}
		</div>

		<div class="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
			<div class="relative">
				<button
					type="button"
					aria-haspopup="dialog"
					aria-expanded={menuJugadoresAbierto}
					onclick={() => (menuJugadoresAbierto = !menuJugadoresAbierto)}
					class={chipBase +
						' inline-flex w-full items-center justify-between gap-2 px-4 py-2 sm:w-auto sm:justify-start ' +
						(jugadores !== null
							? ' border-primary/50 bg-primary/15 text-primary'
							: ' border-glass-border bg-white/5 text-on-surface-variant hover:border-primary/30 hover:text-on-surface')}
				>
					<span class="sm:hidden">
						{jugadores === null ? 'Jugadores' : `${jugadores} jug.`}
					</span>

					<span class="hidden sm:inline">Jugadores</span>

					{#if jugadores !== null}
						<span class="hidden sm:inline">· {jugadores}</span>
					{/if}

					<ChevronDown class="h-4 w-4" strokeWidth={2} aria-hidden="true" />
				</button>

				{#if menuJugadoresAbierto}
					<div
						class="absolute top-full left-0 z-20 mt-2 w-64 rounded-base surface-level-3 border border-glass-border p-3"
						role="dialog"
						aria-label="Filtrar por cantidad de jugadores"
					>
						<label
							for="filtro-jugadores"
							class="font-mono text-xs tracking-wider text-on-surface-variant uppercase"
						>
							Cantidad de jugadores
						</label>

						<input
							id="filtro-jugadores"
							type="number"
							bind:value={jugadores}
							min="1"
							step="1"
							placeholder="Ej: 4"
							aria-invalid={!jugadoresValidos}
							class="mt-2 w-full rounded-base border border-glass-border bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/70 focus:border-primary/50"
						/>

						{#if !jugadoresValidos}
							<p class="mt-2 text-sm text-error">Ingresa un número entero mayor que cero.</p>
						{/if}

					</div>
				{/if}
			</div>

			{#if hayFiltrosActivos}
				<button
					type="button"
					onclick={limpiarFiltros}
					class="cursor-pointer px-2 text-center font-mono text-sm tracking-wide text-on-surface-variant underline decoration-primary/50 underline-offset-4 transition hover:text-on-surface sm:text-left"
				>
					Limpiar
				</button>
			{/if}
		</div>

		{#if menuJugadoresAbierto}
			<button
				type="button"
				class="fixed inset-0 z-10 cursor-default"
				aria-label="Cerrar filtro de jugadores"
				onclick={() => (menuJugadoresAbierto = false)}
			></button>
		{/if}
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