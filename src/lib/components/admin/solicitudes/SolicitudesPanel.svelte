<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { onMount } from 'svelte';
	import DataTable from '$lib/components/admin/primitives/DataTable.svelte';
	import type { DataColumn } from '$lib/components/admin/primitives/types';
	import Dropdown from '$lib/components/admin/primitives/Dropdown.svelte';
	import Pagination from '$lib/components/admin/primitives/Pagination.svelte';
	import StatusBadge from '$lib/components/admin/primitives/StatusBadge.svelte';
	import DetalleSolicitudModal from './DetalleSolicitudModal.svelte';
	import DescartarSolicitudModal from './DescartarSolicitudModal.svelte';
	import { meson, formatearRut, type SolicitudContexto } from '$lib/data/junta.svelte';
	import { adminSession } from '$lib/stores/adminSession.svelte';
	import { notificaciones } from '$lib/stores/notificaciones.svelte';
	import type { EstadoSolicitud } from '$lib/schemas';

	const sizePagina = 8;

	const itemsFiltro: { value: string; label: string }[] = [
		{ value: 'Todos', label: 'Todos' },
		{ value: 'Pendiente', label: 'Pendiente' },
		{ value: 'Aprobada', label: 'Aprobada' },
		{ value: 'Rechazada', label: 'Rechazada' },
		{ value: 'Vencida', label: 'Vencida' }
	];

	const tonoEstado: Record<EstadoSolicitud, 'neutral' | 'info' | 'success' | 'warning' | 'error'> =
		{
			Pendiente: 'warning',
			Aprobada: 'success',
			Rechazada: 'error',
			Vencida: 'neutral'
		};

	const columnas: DataColumn[] = [
		{ id: 'solicitud', label: 'Solicitud' },
		{ id: 'sansano', label: 'Sansano' },
		{ id: 'juego', label: 'Juego' },
		{ id: 'estado', label: 'Estado' },
		{ id: 'retiro', label: 'Retiro' },
		{ id: 'fecha', label: 'Recibida' },
		{ id: 'acciones', label: 'Acciones', align: 'right' }
	];

	const claseBotonAtender =
		'inline-flex cursor-pointer items-center gap-1.5 rounded-base border border-primary/50 bg-primary/10 px-2.5 py-1.5 font-mono text-xs uppercase tracking-wider text-primary transition hover:bg-primary/20';
	const claseBotonDescartar =
		'inline-flex cursor-pointer items-center gap-1.5 rounded-base border border-glass-border bg-surface-container-lowest px-2.5 py-1.5 font-mono text-xs uppercase tracking-wider text-on-surface-variant transition hover:border-error/50 hover:bg-error/15 hover:text-error';

	const accesible = $derived(adminSession.user.role !== 'junior');

	let filtro = $state<string>('Pendiente');
	let pagina = $state(1);
	let cargando = $state(true);
	let detalle = $state<SolicitudContexto | null>(null);
	let descartar = $state<SolicitudContexto | null>(null);

	function fechaCorta(iso: string): string {
		return new Date(iso).toLocaleDateString('es-CL', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function haceTiempo(iso: string): string {
		const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

		if (minutos < 1) return 'recién publicada';
		if (minutos < 60) return `hace ${minutos} min`;

		const horas = Math.floor(minutos / 60);

		if (horas < 24) return `hace ${horas} hora${horas === 1 ? '' : 's'}`;

		const dias = Math.floor(horas / 24);

		return `hace ${dias} día${dias === 1 ? '' : 's'}`;
	}

	onMount(() => {
		const vencidas = meson.vencerSolicitudes();

		if (vencidas > 0) {
			notificaciones.mostrar(
				'info',
				'Vencimiento automático',
				`${vencidas} solicitud${vencidas === 1 ? '' : 'es'} con fecha de retiro pasada pasó${
					vencidas === 1 ? ' ' : 'n '
				}a «Vencidas».`,
				{ duracion: 8000 }
			);
		}

		const temporizador = setTimeout(() => {
			cargando = false;
		}, 450);

		return () => clearTimeout(temporizador);
	});

	const contextos = $derived(meson.solicitudesAdmin());
	const filtrados = $derived(
		filtro === 'Todos' ? contextos : contextos.filter((c) => c.solicitud.estadoSolicitud === filtro)
	);
	const paginados = $derived(filtrados.slice((pagina - 1) * sizePagina, pagina * sizePagina));

	$effect(() => {
		const totalPaginas = Math.max(Math.ceil(filtrados.length / sizePagina), 1);

		if (pagina > totalPaginas) {
			pagina = totalPaginas;
		}
	});

	const vacioMensaje = $derived(
		filtro === 'Todos' ? 'Todavía no hay solicitudes' : `Sin solicitudes «${filtro}»`
	);
	const vacioDescripcion = $derived(
		filtro === 'Todos'
			? 'Cuando alguien complete el formulario público aparecerá aquí.'
			: 'Cambia el filtro para ver otras solicitudes.'
	);
</script>

{#snippet toolbar()}
	<div class="flex items-center gap-2.5">
		<Icon name="filter" class="h-4 w-4 text-on-surface-variant" strokeWidth={1.8} />
		<span class="font-mono text-xs tracking-wider text-on-surface-variant uppercase">Estado</span>
		<Dropdown
			items={itemsFiltro}
			value={filtro}
			onchange={(valor) => {
				filtro = valor;
				pagina = 1;
			}}
			class="w-40"
		/>
	</div>
	<span class="font-mono text-xs tracking-wider text-on-surface-variant/70 uppercase">
		{filtrados.length} solicitud{filtrados.length === 1 ? '' : 'es'}
	</span>
{/snippet}

{#snippet tarjetaMovil(fila: SolicitudContexto)}
	<div class="flex flex-col gap-2.5">
		<div class="flex items-center justify-between gap-2">
			<div class="flex min-w-0 items-baseline gap-2">
				<span class="font-mono font-semibold text-on-surface">
					#{fila.solicitud.idSolicitud}
				</span>
				<span class="truncate text-body-md font-medium text-on-surface">
					{fila.sansano.nombreSansano}
				</span>
			</div>
			<span class="shrink-0">
				<StatusBadge tone={tonoEstado[fila.solicitud.estadoSolicitud]}>
					{fila.solicitud.estadoSolicitud}
				</StatusBadge>
			</span>
		</div>

		<div class="min-w-0">
			<p class="truncate text-body-md font-medium text-on-surface">{fila.juego.nombreJuego}</p>
			<p class="flex flex-wrap items-center gap-x-1.5 font-mono text-xs text-on-surface-variant/80">
				<span class="text-on-surface-variant">{fila.ejemplar.idEjemplar}</span>
				{#if fila.solicitud.idExpansion}
					<span class="text-secondary">+ {fila.solicitud.idExpansion}</span>
				{/if}
				<span>·</span>
				<span>
					Retiro {fechaCorta(fila.solicitud.fechaSeleccionada)} · {haceTiempo(
						fila.solicitud.fechaSolicitud
					)}
				</span>
			</p>
		</div>

		{#if fila.solicitud.estadoSolicitud === 'Pendiente'}
			<div class="grid grid-cols-2 gap-2">
				<button
					type="button"
					onclick={() => (detalle = fila)}
					aria-label="Atender solicitud #{fila.solicitud.idSolicitud}"
					class={`${claseBotonAtender} w-full justify-center`}
				>
					<Icon name="check" class="h-3.5 w-3.5" strokeWidth={2} />
					Atender
				</button>
				<button
					type="button"
					onclick={() => (descartar = fila)}
					aria-label="Descartar solicitud #{fila.solicitud.idSolicitud}"
					class={`${claseBotonDescartar} w-full justify-center`}
				>
					<Icon name="ban" class="h-3.5 w-3.5" strokeWidth={2} />
					Descartar
				</button>
			</div>
		{/if}
	</div>
{/snippet}

{#snippet cell(fila: SolicitudContexto, columna: DataColumn)}
	{#if columna.id === 'solicitud'}
		<span class="font-mono text-on-surface">#{fila.solicitud.idSolicitud}</span>
	{:else if columna.id === 'fecha'}
		<span class="text-on-surface-variant">
			{haceTiempo(fila.solicitud.fechaSolicitud)}
		</span>
	{:else if columna.id === 'sansano'}
		<span class="flex min-w-0 flex-col">
			<span class="font-medium">{fila.sansano.nombreSansano}</span>
			<span class="font-mono text-xs text-on-surface-variant/70">
				{formatearRut(fila.sansano.rutSansano, fila.sansano.digitoVerificador)}
			</span>
		</span>
	{:else if columna.id === 'juego'}
		<span class="flex min-w-0 flex-col">
			<span>{fila.juego.nombreJuego}</span>
			<span
				class="flex flex-wrap items-center gap-1.5 font-mono text-xs text-on-surface-variant/70"
			>
				{fila.ejemplar.idEjemplar}
				{#if fila.solicitud.idExpansion}
					<span class="text-secondary">+ {fila.solicitud.idExpansion}</span>
				{/if}
			</span>
		</span>
	{:else if columna.id === 'estado'}
		<StatusBadge tone={tonoEstado[fila.solicitud.estadoSolicitud]}>
			{fila.solicitud.estadoSolicitud}
		</StatusBadge>
	{:else if columna.id === 'retiro'}
		<span class="text-on-surface-variant">{fechaCorta(fila.solicitud.fechaSeleccionada)}</span>
	{:else if fila.solicitud.estadoSolicitud === 'Pendiente'}
		<span class="flex items-center justify-end gap-2">
			<button
				type="button"
				onclick={() => (detalle = fila)}
				aria-label="Atender solicitud #{fila.solicitud.idSolicitud}"
				class={claseBotonAtender}
			>
				<Icon name="check" class="h-3.5 w-3.5" strokeWidth={2} />
				Atender
			</button>
			<button
				type="button"
				onclick={() => (descartar = fila)}
				aria-label="Descartar solicitud #{fila.solicitud.idSolicitud}"
				class={claseBotonDescartar}
			>
				<Icon name="ban" class="h-3.5 w-3.5" strokeWidth={2} />
				Descartar
			</button>
		</span>
	{:else}
		<span class="text-on-surface-variant/50">—</span>
	{/if}
{/snippet}

{#if !accesible}
	<div
		class="flex flex-col items-center gap-3 rounded-base border border-glass-border surface-level-1 px-6 py-12 text-center"
	>
		<span
			class="flex h-12 w-12 items-center justify-center rounded-full border border-glass-border bg-on-surface/10"
		>
			<Icon name="shield-check" class="h-6 w-6 text-on-surface-variant" />
		</span>
		<p class="font-display text-headline-md font-semibold text-on-surface">
			Sin acceso a solicitudes web
		</p>
		<p class="max-w-md text-body-md text-on-surface-variant">
			Solo el staff Senior y Directivo puede gestionar las solicitudes del formulario público.
		</p>
	</div>
{:else}
	<div class="flex flex-col gap-4">
		<DataTable
			columns={columnas}
			rows={paginados}
			keyRow={(fila) => String(fila.solicitud.idSolicitud)}
			{cell}
			mobileCard={tarjetaMovil}
			loading={cargando}
			emptyMessage={vacioMensaje}
			emptyDescription={vacioDescripcion}
			{toolbar}
		/>

		<Pagination
			page={pagina}
			pageSize={sizePagina}
			total={filtrados.length}
			onchange={(paginaNueva) => (pagina = paginaNueva)}
		/>
	</div>
{/if}

{#if detalle}
	<DetalleSolicitudModal contexto={detalle} onclose={() => (detalle = null)} />
{/if}

{#if descartar}
	<DescartarSolicitudModal contexto={descartar} onclose={() => (descartar = null)} />
{/if}
