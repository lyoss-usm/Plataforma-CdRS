<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { onMount } from 'svelte';
	import DataTable from '$lib/components/admin/primitives/DataTable.svelte';
	import type { DataColumn } from '$lib/components/admin/primitives/types';
	import Dropdown from '$lib/components/admin/primitives/Dropdown.svelte';
	import Pagination from '$lib/components/admin/primitives/Pagination.svelte';
	import StatusBadge from '$lib/components/admin/primitives/StatusBadge.svelte';
	import FichaModeracionModal from './FichaModeracionModal.svelte';
	import BaneoModal from './BaneoModal.svelte';
	import { meson, formatearRut } from '$lib/data/junta.svelte';
	import { adminSession } from '$lib/stores/adminSession.svelte';
	import type { Sansano } from '$lib/schemas';

	type EstadoSuspension = 'permanente' | 'temporal' | 'historial' | 'integro';

	const sizePagina = 8;

	const columnas: DataColumn[] = [
		{ id: 'sansano', label: 'Usuario' },
		{ id: 'correo', label: 'Correo' },
		{ id: 'estado', label: 'Suspensión' },
		{ id: 'acciones', label: 'Acciones', align: 'right' }
	];

	const itemsFiltro: { value: string; label: string }[] = [
		{ value: 'Todos', label: 'Todos' },
		{ value: 'activa', label: 'Activa' },
		{ value: 'historial', label: 'Historial' },
		{ value: 'integro', label: 'Sin suspensión' }
	];

	const itemsTipo: { value: string; label: string }[] = [
		{ value: 'clientes', label: 'Clientes' },
		{ value: 'staff', label: 'Staff' },
		{ value: 'todos', label: 'Todos' }
	];

	const tonoEstado: Record<EstadoSuspension, 'neutral' | 'info' | 'success' | 'warning' | 'error'> =
		{
			permanente: 'error',
			temporal: 'warning',
			historial: 'neutral',
			integro: 'success'
		};

	const etiquetaEstado: Record<EstadoSuspension, string> = {
		permanente: 'Permanente',
		temporal: 'Temporal',
		historial: 'Historial',
		integro: 'Sin suspensión'
	};

	const gestiona = $derived(adminSession.user.role === 'directivo');

	const claseBotonVer =
		'inline-flex cursor-pointer items-center gap-1.5 rounded-base border border-glass-border bg-surface-container-lowest px-2.5 py-1.5 font-mono text-xs uppercase tracking-wider text-on-surface-variant transition hover:border-secondary/50 hover:bg-secondary/10 hover:text-secondary';
	const claseBotonBannear =
		'inline-flex cursor-pointer items-center gap-1.5 rounded-base border border-error/50 bg-error/15 px-2.5 py-1.5 font-mono text-xs uppercase tracking-wider text-error transition hover:bg-error/25';
	const claseInput =
		'w-full rounded-base border bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/70 focus:border-primary/50 border-glass-border';

	let buscar = $state('');
	let filtroEstado = $state('Todos');
	let filtroTipo = $state('clientes');
	let pagina = $state(1);
	let cargando = $state(true);
	let ficha = $state<Sansano | null>(null);
	let baneando = $state<Sansano | null>(null);

	function normalizar(texto: string): string {
		return texto
			.toLowerCase()
			.normalize('NFD')
			.replace(/\p{Diacritic}/gu, '')
			.replace(/[^a-z0-9]/gu, '');
	}

	onMount(() => {
		const temporizador = setTimeout(() => {
			cargando = false;
		}, 450);

		return () => clearTimeout(temporizador);
	});

	function estadoDe(sansano: Sansano): EstadoSuspension {
		return meson.estadoSuspension(sansano.rutSansano);
	}

	function esStaff(sansano: Sansano): boolean {
		return sansano.idCargo !== null;
	}

	const claseTipo = (staff: boolean) =>
		staff
			? 'inline-flex items-center rounded-full border border-secondary/30 bg-secondary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-secondary'
			: 'inline-flex items-center rounded-full border border-glass-border bg-surface-container px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant/80';

	const usuarios = $derived(meson.sansanos);
	const filtrados = $derived(
		usuarios.filter((s) => {
			const estado = estadoDe(s);
			const coincideEstado =
				filtroEstado === 'Todos' ||
				(filtroEstado === 'activa' && (estado === 'permanente' || estado === 'temporal')) ||
				filtroEstado === estado;
			const coincideTipo =
				filtroTipo === 'todos' ||
				(filtroTipo === 'clientes' ? s.idCargo === null : s.idCargo !== null);
			const termino = normalizar(buscar.trim());
			const coincideTexto =
				termino === '' ||
				normalizar(s.nombreSansano).includes(termino) ||
				normalizar(s.correoInstitucional).includes(termino) ||
				normalizar(formatearRut(s.rutSansano, s.digitoVerificador)).includes(termino) ||
				normalizar(String(s.rutSansano)).includes(termino);
			return coincideEstado && coincideTipo && coincideTexto;
		})
	);
	const paginados = $derived(filtrados.slice((pagina - 1) * sizePagina, pagina * sizePagina));

	$effect(() => {
		const totalPaginas = Math.max(Math.ceil(filtrados.length / sizePagina), 1);

		if (pagina > totalPaginas) {
			pagina = totalPaginas;
		}
	});

	function fechaCorta(iso: string): string {
		return new Date(iso).toLocaleDateString('es-CL', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function actividadDetail(rutSansano: number): string | null {
		const estado = meson.estadoSuspension(rutSansano);

		if (estado === 'permanente') {
			return 'Suspendido permanentemente';
		}

		if (estado === 'temporal') {
			const activa = meson.suspensionActiva(rutSansano);
			return activa ? `Hasta el ${fechaCorta(activa.fechaTermino ?? '')}` : null;
		}

		if (estado === 'historial') {
			const cantidad = meson.suspensionesDe(rutSansano).length;
			return `${cantidad} suspensione${cantidad === 1 ? '' : 's'} registrada${cantidad === 1 ? '' : 's'}`;
		}

		return null;
	}
</script>

{#snippet toolbar()}
	<div class="flex flex-wrap items-center gap-2.5">
		<div class="relative">
			<Icon
				name="search"
				class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
				strokeWidth={1.8}
			/>
			<label class="sr-only" for="moderacion-buscar">Buscar por nombre, correo o RUT</label>
			<input
				id="moderacion-buscar"
				type="search"
				bind:value={buscar}
				oninput={() => (pagina = 1)}
				placeholder="Buscar por nombre, correo o RUT…"
				class={`${claseInput} w-52 pl-9`}
			/>
		</div>

		<div class="flex items-center gap-2.5">
			<Icon name="filter" class="h-4 w-4 text-on-surface-variant" strokeWidth={1.8} />
			<span class="font-mono text-xs tracking-wider text-on-surface-variant uppercase">Tipo</span>
			<Dropdown
				items={itemsTipo}
				value={filtroTipo}
				onchange={(valor) => {
					filtroTipo = valor;
					pagina = 1;
				}}
				class="w-32"
			/>
		</div>

		<div class="flex items-center gap-2.5">
			<Icon name="filter" class="h-4 w-4 text-on-surface-variant" strokeWidth={1.8} />
			<span class="font-mono text-xs tracking-wider text-on-surface-variant uppercase">Estado</span>
			<Dropdown
				items={itemsFiltro}
				value={filtroEstado}
				onchange={(valor) => {
					filtroEstado = valor;
					pagina = 1;
				}}
				class="w-40"
			/>
		</div>
	</div>

	<span class="font-mono text-xs tracking-wider text-on-surface-variant/70 uppercase">
		{filtrados.length} usuario{filtrados.length === 1 ? '' : 's'}
	</span>
{/snippet}

{#snippet tarjetaMovil(fila: Sansano)}
	<div class="flex flex-col gap-2.5">
		<div class="flex items-center justify-between gap-2">
			<div class="flex min-w-0 flex-col">
				<span class="truncate text-body-md font-medium text-on-surface">
					{fila.nombreSansano}
				</span>
				<span class="font-mono text-xs text-on-surface-variant/80">
					{formatearRut(fila.rutSansano, fila.digitoVerificador)}
				</span>
			</div>
			<div class="flex shrink-0 flex-col items-end gap-1.5">
				<span class={claseTipo(esStaff(fila))}>{esStaff(fila) ? 'Staff' : 'Cliente'}</span>
				<StatusBadge tone={tonoEstado[estadoDe(fila)]}>{etiquetaEstado[estadoDe(fila)]}</StatusBadge
				>
			</div>
		</div>

		{#if actividadDetail(fila.rutSansano)}
			<p class="text-xs text-on-surface-variant">{actividadDetail(fila.rutSansano)}</p>
		{/if}

		<div class="grid grid-cols-2 gap-2">
			<button
				type="button"
				onclick={() => (ficha = fila)}
				aria-label={`Ver historial de ${fila.nombreSansano}`}
				class={`${claseBotonVer} w-full justify-center`}
			>
				<Icon name="info" class="h-3.5 w-3.5" strokeWidth={2} />
				Ver
			</button>
			{#if gestiona && (estadoDe(fila) === 'integro' || estadoDe(fila) === 'historial')}
				<button
					type="button"
					onclick={() => (baneando = fila)}
					aria-label={`Bannear a ${fila.nombreSansano}`}
					class={`${claseBotonBannear} w-full justify-center`}
				>
					<Icon name="ban" class="h-3.5 w-3.5" strokeWidth={2} />
					Bannear
				</button>
			{:else}
				<span></span>
			{/if}
		</div>
	</div>
{/snippet}

{#snippet cell(fila: Sansano, columna: DataColumn)}
	{#if columna.id === 'sansano'}
		<span class="flex min-w-0 flex-col items-start gap-1">
			<div class="flex min-w-0 items-center gap-2">
				<span class="truncate font-medium">{fila.nombreSansano}</span>
				<span class={claseTipo(esStaff(fila))}>{esStaff(fila) ? 'Staff' : 'Cliente'}</span>
			</div>
			<span class="font-mono text-xs text-on-surface-variant/70">
				{formatearRut(fila.rutSansano, fila.digitoVerificador)}
			</span>
		</span>
	{:else if columna.id === 'correo'}
		<span class="font-mono text-sm text-on-surface-variant">{fila.correoInstitucional}</span>
	{:else if columna.id === 'estado'}
		<span class="flex flex-col items-start gap-1">
			<StatusBadge tone={tonoEstado[estadoDe(fila)]}>{etiquetaEstado[estadoDe(fila)]}</StatusBadge>
			{#if actividadDetail(fila.rutSansano)}
				<span class="text-xs text-on-surface-variant/70">{actividadDetail(fila.rutSansano)}</span>
			{/if}
		</span>
	{:else}
		<span class="flex items-center justify-end gap-2">
			<button
				type="button"
				onclick={() => (ficha = fila)}
				aria-label={`Ver historial de ${fila.nombreSansano}`}
				class={claseBotonVer}
			>
				<Icon name="info" class="h-3.5 w-3.5" strokeWidth={2} />
				Ver
			</button>
			{#if gestiona && (estadoDe(fila) === 'integro' || estadoDe(fila) === 'historial')}
				<button
					type="button"
					onclick={() => (baneando = fila)}
					aria-label={`Bannear a ${fila.nombreSansano}`}
					class={claseBotonBannear}
				>
					<Icon name="ban" class="h-3.5 w-3.5" strokeWidth={2} />
					Bannear
				</button>
			{/if}
		</span>
	{/if}
{/snippet}

<div class="flex flex-col gap-4">
	<DataTable
		columns={columnas}
		rows={paginados}
		keyRow={(fila) => String(fila.rutSansano)}
		{cell}
		mobileCard={tarjetaMovil}
		loading={cargando}
		emptyMessage="Sin usuarios para esos filtros"
		emptyDescription="Ajusta el tipo, el estado o la búsqueda para ver más resultados."
		{toolbar}
	/>

	<Pagination
		page={pagina}
		pageSize={sizePagina}
		total={filtrados.length}
		onchange={(paginaNueva) => (pagina = paginaNueva)}
	/>
</div>

{#if ficha}
	<FichaModeracionModal sansano={ficha} onclose={() => (ficha = null)} />
{/if}

{#if baneando}
	<BaneoModal sansano={baneando} onclose={() => (baneando = null)} />
{/if}
