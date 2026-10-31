<script lang="ts">
	import { goto } from '$app/navigation';
	import { navigating } from '$app/state';
	import { resolve } from '$app/paths';
	import { onDestroy } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import Icon from '$lib/components/Icon.svelte';
	import DataTable from '$lib/components/admin/primitives/DataTable.svelte';
	import type { DataColumn } from '$lib/components/admin/primitives/types';
	import Dropdown from '$lib/components/admin/primitives/Dropdown.svelte';
	import Pagination from '$lib/components/admin/primitives/Pagination.svelte';
	import StatusBadge from '$lib/components/admin/primitives/StatusBadge.svelte';
	import FichaStaffModal from './FichaStaffModal.svelte';
	import InvitarStaffModal from './InvitarStaffModal.svelte';
	import { formatearRut } from '$lib/data/junta.svelte';
	import {
		STAFF_PAGE_SIZE,
		formatearTelefono,
		type StaffFila,
		type StaffPage,
		type StaffQuery
	} from '$lib/schemas';

	interface Props {
		staffPage: StaffPage;
		cargos: { idCargo: number; nombreCargo: string }[];
		permisosPorCargo: Record<number, string[]>;
		filtros: StaffQuery;
		puedeGestionar: boolean;
		errorCarga: string | null;
	}

	let { staffPage, cargos, permisosPorCargo, filtros, puedeGestionar, errorCarga }: Props =
		$props();

	const columnas: DataColumn[] = [
		{ id: 'sansano', label: 'Sansano' },
		{ id: 'cargo', label: 'Cargo' },
		{ id: 'acceso', label: 'Acceso' },
		{ id: 'correo', label: 'Correo' },
		{ id: 'contacto', label: 'Contacto' },
		{ id: 'acciones', label: 'Acción', align: 'right' }
	];

	const itemsFiltro = $derived([
		{ value: 'Todos', label: 'Todos' },
		...cargos.map((c) => ({ value: String(c.idCargo), label: c.nombreCargo }))
	]);

	const claseBotonVer =
		'inline-flex cursor-pointer items-center gap-1.5 rounded-base border border-glass-border bg-surface-container-lowest px-2.5 py-1.5 font-mono text-xs uppercase tracking-wider text-on-surface-variant transition hover:border-secondary/50 hover:bg-secondary/10 hover:text-secondary';
	const claseInput =
		'w-full rounded-base border bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/70 focus:border-primary/50 border-glass-border';

	// El input es local mientras se escribe; la URL se actualiza con retardo.
	// svelte-ignore state_referenced_locally
	let buscar = $state(filtros.busqueda);
	let fichaRut = $state<number | null>(null);
	let invitando = $state(false);
	let temporizador: ReturnType<typeof setTimeout> | undefined;

	const cargando = $derived(navigating.to !== null);
	// Se resuelve contra la página actual: tras editar y recargar, la ficha muestra lo nuevo.
	const ficha = $derived(staffPage.filas.find((f) => f.rutSansano === fichaRut) ?? null);

	function navegar(cambios: { busqueda?: string; idCargo?: number | null; pagina?: number }) {
		const busqueda = cambios.busqueda ?? filtros.busqueda;
		const idCargo = cambios.idCargo === undefined ? filtros.idCargo : cambios.idCargo;
		const pagina = cambios.pagina ?? 1;
		const parametros = new SvelteURLSearchParams();

		if (busqueda) parametros.set('q', busqueda);
		if (idCargo !== null) parametros.set('cargo', String(idCargo));
		if (pagina > 1) parametros.set('pagina', String(pagina));

		const consulta = parametros.toString();

		// eslint-disable-next-line svelte/no-navigation-without-resolve -- ruta resuelta; solo se agrega la query
		goto(`${resolve('/admin/miembros')}${consulta ? `?${consulta}` : ''}`, {
			keepFocus: true,
			noScroll: true,
			replaceState: true
		});
	}

	function alEscribir() {
		clearTimeout(temporizador);
		temporizador = setTimeout(() => navegar({ busqueda: buscar.trim() }), 300);
	}

	onDestroy(() => clearTimeout(temporizador));

	function toneCargo(nombreCargo: string): 'error' | 'info' | 'neutral' {
		if (nombreCargo === 'Directivo') return 'error';
		if (nombreCargo === 'Senior') return 'info';

		return 'neutral';
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
			<label class="sr-only" for="miembros-buscar">Buscar por nombre, correo, RUT o rol</label>
			<input
				id="miembros-buscar"
				type="search"
				bind:value={buscar}
				oninput={alEscribir}
				placeholder="Buscar por nombre, correo, RUT o rol…"
				class={`${claseInput} w-56 pl-9`}
			/>
		</div>

		<div class="flex items-center gap-2.5">
			<Icon name="filter" class="h-4 w-4 text-on-surface-variant" strokeWidth={1.8} />
			<span class="font-mono text-xs tracking-wider text-on-surface-variant uppercase">Cargo</span>
			<Dropdown
				items={itemsFiltro}
				value={filtros.idCargo === null ? 'Todos' : String(filtros.idCargo)}
				onchange={(valor) => navegar({ idCargo: valor === 'Todos' ? null : Number(valor) })}
				class="w-36"
			/>
		</div>
	</div>

	<div class="flex flex-wrap items-center gap-3">
		<span class="font-mono text-xs tracking-wider text-on-surface-variant/70 uppercase">
			{staffPage.total} miembro{staffPage.total === 1 ? '' : 's'} del staff
		</span>
		{#if puedeGestionar}
			<button
				type="button"
				onclick={() => (invitando = true)}
				class="inline-flex cursor-pointer items-center gap-1.5 rounded-base border border-primary/50 bg-primary/10 px-3 py-2 font-mono text-xs tracking-wider text-primary uppercase transition hover:bg-primary/20 hover:ice-glow"
			>
				<Icon name="user-plus" class="h-3.5 w-3.5" strokeWidth={2} />
				Invitar staff
			</button>
		{/if}
	</div>
{/snippet}

{#snippet tarjetaMovil(fila: StaffFila)}
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
			<span class="flex shrink-0 flex-col items-end gap-1.5">
				<StatusBadge tone={toneCargo(fila.nombreCargo)}>
					{fila.nombreCargo}
				</StatusBadge>
				<StatusBadge tone={fila.authUserId ? 'success' : 'warning'}>
					{fila.authUserId ? 'Activo' : 'Pendiente'}
				</StatusBadge>
			</span>
		</div>

		<p class="truncate font-mono text-xs text-on-surface-variant/80">
			{fila.correoInstitucional}
		</p>

		<button
			type="button"
			onclick={() => (fichaRut = fila.rutSansano)}
			aria-label={`Ver ficha de ${fila.nombreSansano}`}
			class={`${claseBotonVer} w-full justify-center`}
		>
			<Icon name="info" class="h-3.5 w-3.5" strokeWidth={2} />
			Ver
		</button>
	</div>
{/snippet}

{#snippet cell(fila: StaffFila, columna: DataColumn)}
	{#if columna.id === 'sansano'}
		<span class="flex min-w-0 flex-col">
			<span class="font-medium">{fila.nombreSansano}</span>
			<span class="font-mono text-xs text-on-surface-variant/70">
				{formatearRut(fila.rutSansano, fila.digitoVerificador)}
			</span>
		</span>
	{:else if columna.id === 'cargo'}
		<StatusBadge tone={toneCargo(fila.nombreCargo)}>
			{fila.nombreCargo}
		</StatusBadge>
	{:else if columna.id === 'acceso'}
		<StatusBadge tone={fila.authUserId ? 'success' : 'warning'}>
			{fila.authUserId ? 'Activo' : 'Pendiente'}
		</StatusBadge>
	{:else if columna.id === 'correo'}
		<span class="font-mono text-sm text-on-surface-variant">{fila.correoInstitucional}</span>
	{:else if columna.id === 'contacto'}
		<span class="font-mono text-sm text-on-surface-variant">{formatearTelefono(fila.telefono)}</span
		>
	{:else}
		<span class="flex items-center justify-end">
			<button
				type="button"
				onclick={() => (fichaRut = fila.rutSansano)}
				aria-label={`Ver ficha de ${fila.nombreSansano}`}
				class={claseBotonVer}
			>
				<Icon name="info" class="h-3.5 w-3.5" strokeWidth={2} />
				Ver
			</button>
		</span>
	{/if}
{/snippet}

<div class="flex flex-col gap-4">
	<DataTable
		columns={columnas}
		rows={staffPage.filas}
		keyRow={(fila) => String(fila.rutSansano)}
		{cell}
		mobileCard={tarjetaMovil}
		loading={cargando}
		error={errorCarga}
		emptyMessage={filtros.busqueda || filtros.idCargo !== null
			? 'Ningún miembro coincide con la búsqueda'
			: 'No hay staff registrado'}
		emptyDescription={filtros.busqueda || filtros.idCargo !== null
			? 'Prueba con otro nombre, correo o cargo.'
			: 'Cuando se invite a alguien, aparecerá aquí con su cargo y estado de acceso.'}
		{toolbar}
	/>

	<Pagination
		page={filtros.pagina}
		pageSize={STAFF_PAGE_SIZE}
		total={staffPage.total}
		onchange={(pagina) => navegar({ pagina })}
	/>
</div>

{#if ficha}
	<FichaStaffModal
		{ficha}
		{cargos}
		permisos={permisosPorCargo[ficha.idCargo ?? 0] ?? []}
		{puedeGestionar}
		onclose={() => (fichaRut = null)}
	/>
{/if}

{#if invitando}
	<InvitarStaffModal {cargos} onclose={() => (invitando = false)} />
{/if}
