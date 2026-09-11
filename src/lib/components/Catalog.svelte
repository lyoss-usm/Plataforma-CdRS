<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { Check, ChevronDown, LoaderCircle, Search } from '@lucide/svelte';
	import GameCard from '$lib/components/GameCard.svelte';
	import type { CatalogPage } from '$lib/schemas';

	type FiltroDuracion = 'cualquiera' | 'corta' | 'media' | 'larga' | 'epica';
	type FiltroDisponibilidad = 'cualquiera' | 'disponible' | 'no-disponible';
	type MenuFiltro = 'ninguno' | 'jugadores' | 'duracion' | 'estado';

	interface Props {
		paginaInicial: CatalogPage;
		errorInicial: string | null;
	}

	interface FiltrosCatalogo {
		nombre: string;
		jugadores: number | null;
		duracionMin: number | null;
		duracionMax: number | null;
		disponible: boolean | null;
	}

	const opcionesDuracion: Array<{
		value: FiltroDuracion;
		label: string;
	}> = [
		{ value: 'cualquiera', label: 'Cualquiera' },
		{ value: 'corta', label: '≤ 30 min' },
		{ value: 'media', label: '30–60' },
		{ value: 'larga', label: '60–120' },
		{ value: 'epica', label: '> 120' }
	];

	const opcionesDisponibilidad: Array<{
		value: FiltroDisponibilidad;
		label: string;
	}> = [
		{ value: 'cualquiera', label: 'Cualquiera' },
		{ value: 'disponible', label: 'Disponible' },
		{ value: 'no-disponible', label: 'No disponible' }
	];

	let { paginaInicial, errorInicial }: Props = $props();

	let pagina = $state(untrack(() => paginaInicial));
	let error = $state(untrack(() => errorInicial));
	let nombre = $state('');
	let jugadores = $state<number | null>(null);
	let duracion = $state<FiltroDuracion>('cualquiera');
	let disponibilidad = $state<FiltroDisponibilidad>('cualquiera');
	let cargando = $state(false);
	let menuAbierto = $state<MenuFiltro>('ninguno');

	let primeraEjecucion = true;
	let solicitudActual: AbortController | null = null;

	const jugadoresValidos = $derived(
		jugadores === null || (Number.isInteger(jugadores) && jugadores > 0)
	);

	const etiquetaDuracion = $derived(
		opcionesDuracion.find((opcion) => opcion.value === duracion)?.label ?? 'Cualquiera'
	);
	const etiquetaDisponibilidad = $derived(
		opcionesDisponibilidad.find((opcion) => opcion.value === disponibilidad)?.label ?? 'Cualquiera'
	);

	const hayFiltrosActivos = $derived(
		nombre.trim() !== '' ||
			jugadores !== null ||
			duracion !== 'cualquiera' ||
			disponibilidad !== 'cualquiera'
	);

	const chipBase =
		'cursor-pointer rounded-full border px-3 py-1 font-mono text-sm tracking-wide transition';

	function alternarMenu(menu: Exclude<MenuFiltro, 'ninguno'>): void {
		menuAbierto = menuAbierto === menu ? 'ninguno' : menu;
	}

	function seleccionarDuracion(valor: FiltroDuracion): void {
		duracion = valor;
		menuAbierto = 'ninguno';
	}

	function seleccionarDisponibilidad(valor: FiltroDisponibilidad): void {
		disponibilidad = valor;
		menuAbierto = 'ninguno';
	}

	function obtenerDisponibilidad(valor: FiltroDisponibilidad): boolean | null {
		switch (valor) {
			case 'disponible':
				return true;
			case 'no-disponible':
				return false;
			default:
				return null;
		}
	}

	function obtenerRangoDuracion(valor: FiltroDuracion): {
		minimo: number | null;
		maximo: number | null;
	} {
		switch (valor) {
			case 'corta':
				return { minimo: null, maximo: 30 };
			case 'media':
				return { minimo: 31, maximo: 60 };
			case 'larga':
				return { minimo: 61, maximo: 120 };
			case 'epica':
				return { minimo: 121, maximo: null };
			default:
				return { minimo: null, maximo: null };
		}
	}

	function limpiarFiltros(): void {
		nombre = '';
		jugadores = null;
		duracion = 'cualquiera';
		disponibilidad = 'cualquiera';
		menuAbierto = 'ninguno';
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

		if (filtros.duracionMin !== null) {
			parametros.set('duracionMin', String(filtros.duracionMin));
		}

		if (filtros.duracionMax !== null) {
			parametros.set('duracionMax', String(filtros.duracionMax));
		}

		if (filtros.disponible !== null) {
			parametros.set('disponible', String(filtros.disponible));
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
		const duracionActual = duracion;
		const disponibilidadActual = disponibilidad;

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

		const rangoDuracion = obtenerRangoDuracion(duracionActual);
		const disponibleActual = obtenerDisponibilidad(disponibilidadActual);

		const temporizador = window.setTimeout(() => {
			void consultarCatalogo({
				nombre: nombreActual,
				jugadores: jugadoresActuales,
				duracionMin: rangoDuracion.minimo,
				duracionMax: rangoDuracion.maximo,
				disponible: disponibleActual
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
			menuAbierto = 'ninguno';
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
					aria-expanded={menuAbierto === 'jugadores'}
					onclick={() => alternarMenu('jugadores')}
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

				{#if menuAbierto === 'jugadores'}
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

			<div class="relative">
				<button
					type="button"
					aria-haspopup="listbox"
					aria-expanded={menuAbierto === 'duracion'}
					onclick={() => alternarMenu('duracion')}
					class={chipBase +
						' inline-flex w-full items-center justify-between gap-2 px-4 py-2 sm:w-auto sm:justify-start ' +
						(duracion !== 'cualquiera'
							? ' border-primary/50 bg-primary/15 text-primary'
							: ' border-glass-border bg-white/5 text-on-surface-variant hover:border-primary/30 hover:text-on-surface')}
				>
					<span class="sm:hidden">
						{duracion === 'cualquiera' ? 'Duración' : etiquetaDuracion}
					</span>

					<span class="hidden sm:inline">Duración</span>

					{#if duracion !== 'cualquiera'}
						<span class="hidden sm:inline">· {etiquetaDuracion}</span>
					{/if}

					<ChevronDown class="h-4 w-4" strokeWidth={2} aria-hidden="true" />
				</button>

				{#if menuAbierto === 'duracion'}
					<div
						class="absolute top-full left-0 z-20 mt-2 w-max min-w-40 rounded-base surface-level-3 border border-glass-border p-1.5"
						role="listbox"
						aria-label="Duración"
					>
						{#each opcionesDuracion as opcion (opcion.value)}
							<button
								type="button"
								role="option"
								aria-selected={duracion === opcion.value}
								onclick={() => seleccionarDuracion(opcion.value)}
								class="flex w-full cursor-pointer items-center justify-between gap-8 rounded-base px-3 py-1.5 font-mono text-sm whitespace-nowrap transition hover:bg-white/5"
							>
								<span class={duracion === opcion.value ? 'text-primary' : 'text-on-surface'}>
									{opcion.label}
								</span>

								{#if duracion === opcion.value}
									<Check class="h-4 w-4 text-primary" strokeWidth={2.2} aria-hidden="true" />
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<div class="relative">
				<button
					type="button"
					aria-haspopup="listbox"
					aria-expanded={menuAbierto === 'estado'}
					onclick={() => alternarMenu('estado')}
					class={chipBase +
						' inline-flex w-full items-center justify-between gap-2 px-4 py-2 sm:w-auto sm:justify-start ' +
						(disponibilidad !== 'cualquiera'
							? ' border-primary/50 bg-primary/15 text-primary'
							: ' border-glass-border bg-white/5 text-on-surface-variant hover:border-primary/30 hover:text-on-surface')}
				>
					<span class="sm:hidden">
						{disponibilidad === 'cualquiera' ? 'Estado' : etiquetaDisponibilidad}
					</span>

					<span class="hidden sm:inline">Estado</span>

					{#if disponibilidad !== 'cualquiera'}
						<span class="hidden sm:inline">· {etiquetaDisponibilidad}</span>
					{/if}

					<ChevronDown class="h-4 w-4" strokeWidth={2} aria-hidden="true" />
				</button>

				{#if menuAbierto === 'estado'}
					<div
						class="absolute top-full left-0 z-20 mt-2 w-max min-w-40 rounded-base surface-level-3 border border-glass-border p-1.5"
						role="listbox"
						aria-label="Estado de disponibilidad"
					>
						{#each opcionesDisponibilidad as opcion (opcion.value)}
							<button
								type="button"
								role="option"
								aria-selected={disponibilidad === opcion.value}
								onclick={() => seleccionarDisponibilidad(opcion.value)}
								class="flex w-full cursor-pointer items-center justify-between gap-8 rounded-base px-3 py-1.5 font-mono text-sm whitespace-nowrap transition hover:bg-white/5"
							>
								<span class={disponibilidad === opcion.value ? 'text-primary' : 'text-on-surface'}>
									{opcion.label}
								</span>

								{#if disponibilidad === opcion.value}
									<Check class="h-4 w-4 text-primary" strokeWidth={2.2} aria-hidden="true" />
								{/if}
							</button>
						{/each}
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

		{#if menuAbierto !== 'ninguno'}
			<button
				type="button"
				class="fixed inset-0 z-10 cursor-default"
				aria-label="Cerrar filtros"
				onclick={() => (menuAbierto = 'ninguno')}
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
