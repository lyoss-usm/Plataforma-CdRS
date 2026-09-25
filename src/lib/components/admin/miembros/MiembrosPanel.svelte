<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { onMount } from 'svelte';
	import DataTable from '$lib/components/admin/primitives/DataTable.svelte';
	import type { DataColumn } from '$lib/components/admin/primitives/types';
	import Dropdown from '$lib/components/admin/primitives/Dropdown.svelte';
	import Pagination from '$lib/components/admin/primitives/Pagination.svelte';
	import StatusBadge from '$lib/components/admin/primitives/StatusBadge.svelte';
	import FichaStaffModal from './FichaStaffModal.svelte';
	import InvitarStaffModal from './InvitarStaffModal.svelte';
	import { meson, formatearRut } from '$lib/data/junta.svelte';
	import { adminSession } from '$lib/stores/adminSession.svelte';
	import type { Sansano } from '$lib/schemas';

	const sizePagina = 6;

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
		...meson.cargos.map((c) => ({ value: String(c.idCargo), label: c.nombreCargo }))
	]);

	const gestiona = $derived(adminSession.user.role === 'directivo');

	const claseBotonVer =
		'inline-flex cursor-pointer items-center gap-1.5 rounded-base border border-glass-border bg-surface-container-lowest px-2.5 py-1.5 font-mono text-xs uppercase tracking-wider text-on-surface-variant transition hover:border-secondary/50 hover:bg-secondary/10 hover:text-secondary';
	const claseInput =
		'w-full rounded-base border bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/70 focus:border-primary/50 border-glass-border';

	let buscar = $state('');
	let filtroCargo = $state('Todos');
	let pagina = $state(1);
	let cargando = $state(true);
	let ficha = $state<Sansano | null>(null);
	let invitando = $state(false);

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

	const staff = $derived(meson.sansanos.filter((s) => s.idCargo !== null));
	const filtrados = $derived(
		staff.filter((s) => {
			const coincideCargo = filtroCargo === 'Todos' || s.idCargo === Number(filtroCargo);
			const termino = normalizar(buscar.trim());
			const coincideTexto =
				termino === '' ||
				normalizar(s.nombreSansano).includes(termino) ||
				normalizar(s.correoInstitucional).includes(termino) ||
				normalizar(formatearRut(s.rutSansano, s.digitoVerificador)).includes(termino) ||
				normalizar(String(s.rutSansano)).includes(termino) ||
				normalizar(`rol ${String(s.rolSansano)}`).includes(termino) ||
				normalizar(String(s.telefono)).includes(termino);
			return coincideCargo && coincideTexto;
		})
	);
	const paginados = $derived(filtrados.slice((pagina - 1) * sizePagina, pagina * sizePagina));

	$effect(() => {
		const totalPaginas = Math.max(Math.ceil(filtrados.length / sizePagina), 1);

		if (pagina > totalPaginas) {
			pagina = totalPaginas;
		}
	});

	function cargoNombre(idCargo: number | null): string {
		if (idCargo === null) {
			return 'Sin cargo';
		}

		return meson.cargoDe(idCargo)?.nombreCargo ?? '—';
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
				oninput={() => (pagina = 1)}
				placeholder="Buscar por nombre, correo, RUT o rol…"
				class={`${claseInput} w-56 pl-9`}
			/>
		</div>

		<div class="flex items-center gap-2.5">
			<Icon name="filter" class="h-4 w-4 text-on-surface-variant" strokeWidth={1.8} />
			<span class="font-mono text-xs tracking-wider text-on-surface-variant uppercase">Cargo</span>
			<Dropdown
				items={itemsFiltro}
				value={filtroCargo}
				onchange={(valor) => {
					filtroCargo = valor;
					pagina = 1;
				}}
				class="w-36"
			/>
		</div>
	</div>

	<div class="flex flex-wrap items-center gap-3">
		<span class="font-mono text-xs tracking-wider text-on-surface-variant/70 uppercase">
			{filtrados.length} miembro{filtrados.length === 1 ? '' : 's'} del staff
		</span>
		{#if gestiona}
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
			<span class="flex shrink-0 flex-col items-end gap-1.5">
				<StatusBadge tone={fila.idCargo === 3 ? 'error' : fila.idCargo === 2 ? 'info' : 'neutral'}>
					{cargoNombre(fila.idCargo)}
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
			onclick={() => (ficha = fila)}
			aria-label={`Ver ficha de ${fila.nombreSansano}`}
			class={`${claseBotonVer} w-full justify-center`}
		>
			<Icon name="info" class="h-3.5 w-3.5" strokeWidth={2} />
			Ver
		</button>
	</div>
{/snippet}

{#snippet cell(fila: Sansano, columna: DataColumn)}
	{#if columna.id === 'sansano'}
		<span class="flex min-w-0 flex-col">
			<span class="font-medium">{fila.nombreSansano}</span>
			<span class="font-mono text-xs text-on-surface-variant/70">
				{formatearRut(fila.rutSansano, fila.digitoVerificador)}
			</span>
		</span>
	{:else if columna.id === 'cargo'}
		<StatusBadge tone={fila.idCargo === 3 ? 'error' : fila.idCargo === 2 ? 'info' : 'neutral'}>
			{cargoNombre(fila.idCargo)}
		</StatusBadge>
	{:else if columna.id === 'acceso'}
		<StatusBadge tone={fila.authUserId ? 'success' : 'warning'}>
			{fila.authUserId ? 'Activo' : 'Pendiente'}
		</StatusBadge>
	{:else if columna.id === 'correo'}
		<span class="font-mono text-sm text-on-surface-variant">{fila.correoInstitucional}</span>
	{:else if columna.id === 'contacto'}
		<span class="font-mono text-sm text-on-surface-variant">+56 {fila.telefono}</span>
	{:else}
		<span class="flex items-center justify-end">
			<button
				type="button"
				onclick={() => (ficha = fila)}
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
		rows={paginados}
		keyRow={(fila) => String(fila.rutSansano)}
		{cell}
		mobileCard={tarjetaMovil}
		loading={cargando}
		emptyMessage="No hay staff registrado"
		emptyDescription="Cuando se invite a alguien, aparecerá aquí con su cargo y estado de acceso."
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
	<FichaStaffModal sansano={ficha} onclose={() => (ficha = null)} />
{/if}

{#if invitando}
	<InvitarStaffModal onclose={() => (invitando = false)} />
{/if}
