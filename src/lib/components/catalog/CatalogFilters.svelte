<script lang="ts">
	import { Check, ChevronDown, LoaderCircle, Search } from '@lucide/svelte';
	import type { CatalogFilterValues } from '$lib/schemas';

	type FiltroDuracion = 'cualquiera' | 'corta' | 'media' | 'larga' | 'epica';
	type FiltroDisponibilidad = 'cualquiera' | 'disponible' | 'no-disponible';
	type FiltroCalificacion = number | null;
	type MenuFiltro = 'ninguno' | 'jugadores' | 'duracion' | 'estado' | 'calificacion';

	interface Props {
		cargando: boolean;
		onCambiar: (filtros: CatalogFilterValues | null) => void;
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

	const opcionesCalificacion: Array<{
		value: FiltroCalificacion;
		label: string;
	}> = [
		{ value: null, label: 'Cualquiera' },
		{ value: 8, label: '8.0+' },
		{ value: 7, label: '7.0+' },
		{ value: 6, label: '6.0+' }
	];

	let { cargando, onCambiar }: Props = $props();

	let nombre = $state('');
	let jugadores = $state<number | null>(null);
	let duracion = $state<FiltroDuracion>('cualquiera');
	let disponibilidad = $state<FiltroDisponibilidad>('cualquiera');
	let calificacionMin = $state<FiltroCalificacion>(null);
	let menuAbierto = $state<MenuFiltro>('ninguno');

	let primeraEjecucion = true;

	const jugadoresValidos = $derived(
		jugadores === null || (Number.isInteger(jugadores) && jugadores > 0)
	);

	const etiquetaDuracion = $derived(
		opcionesDuracion.find((opcion) => opcion.value === duracion)?.label ?? 'Cualquiera'
	);

	const etiquetaDisponibilidad = $derived(
		opcionesDisponibilidad.find((opcion) => opcion.value === disponibilidad)?.label ?? 'Cualquiera'
	);
	const etiquetaCalificacion = $derived(
		opcionesCalificacion.find((opcion) => opcion.value === calificacionMin)?.label ?? 'Cualquiera'
	);

	const hayFiltrosActivos = $derived(
		nombre.trim() !== '' ||
			jugadores !== null ||
			duracion !== 'cualquiera' ||
			disponibilidad !== 'cualquiera' ||
			calificacionMin !== null
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

	function seleccionarCalificacion(valor: FiltroCalificacion): void {
		calificacionMin = valor;
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
		calificacionMin = null;
		menuAbierto = 'ninguno';
	}

	$effect(() => {
		const nombreActual = nombre.trim();
		const jugadoresActuales = jugadores;
		const duracionActual = duracion;
		const disponibilidadActual = disponibilidad;
		const calificacionMinimaActual = calificacionMin;

		if (primeraEjecucion) {
			primeraEjecucion = false;
			return;
		}

		if (
			jugadoresActuales !== null &&
			(!Number.isInteger(jugadoresActuales) || jugadoresActuales <= 0)
		) {
			onCambiar(null);
			return;
		}

		const rangoDuracion = obtenerRangoDuracion(duracionActual);

		onCambiar({
			nombre: nombreActual,
			jugadores: jugadoresActuales,
			duracionMin: rangoDuracion.minimo,
			duracionMax: rangoDuracion.maximo,
			disponible: obtenerDisponibilidad(disponibilidadActual),
			calificacionMin: calificacionMinimaActual
		});
	});
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape') {
			menuAbierto = 'ninguno';
		}
	}}
/>

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

		<div class="relative">
			<button
				type="button"
				aria-haspopup="listbox"
				aria-expanded={menuAbierto === 'calificacion'}
				onclick={() => alternarMenu('calificacion')}
				class={chipBase +
					' inline-flex w-full items-center justify-between gap-2 px-4 py-2 sm:w-auto sm:justify-start ' +
					(calificacionMin !== null
						? ' border-primary/50 bg-primary/15 text-primary'
						: ' border-glass-border bg-white/5 text-on-surface-variant hover:border-primary/30 hover:text-on-surface')}
			>
				<span class="sm:hidden">
					{calificacionMin === null ? 'Calificación' : etiquetaCalificacion}
				</span>

				<span class="hidden sm:inline">Calificación</span>

				{#if calificacionMin !== null}
					<span class="hidden sm:inline">· {etiquetaCalificacion}</span>
				{/if}

				<ChevronDown class="h-4 w-4" strokeWidth={2} aria-hidden="true" />
			</button>

			{#if menuAbierto === 'calificacion'}
				<div
					class="absolute top-full left-0 z-20 mt-2 w-max min-w-40 rounded-base surface-level-3 border border-glass-border p-1.5"
					role="listbox"
					aria-label="Calificación mínima"
				>
					{#each opcionesCalificacion as opcion (opcion.value)}
						<button
							type="button"
							role="option"
							aria-selected={calificacionMin === opcion.value}
							onclick={() => seleccionarCalificacion(opcion.value)}
							class="flex w-full cursor-pointer items-center justify-between gap-8 rounded-base px-3 py-1.5 font-mono text-sm whitespace-nowrap transition hover:bg-white/5"
						>
							<span class={calificacionMin === opcion.value ? 'text-primary' : 'text-on-surface'}>
								{opcion.label}
							</span>

							{#if calificacionMin === opcion.value}
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
