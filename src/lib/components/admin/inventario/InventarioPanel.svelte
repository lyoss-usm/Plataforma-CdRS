<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { onMount } from 'svelte';
	import DataTable from '$lib/components/admin/primitives/DataTable.svelte';
	import type { DataColumn } from '$lib/components/admin/primitives/types';
	import Dropdown from '$lib/components/admin/primitives/Dropdown.svelte';
	import Pagination from '$lib/components/admin/primitives/Pagination.svelte';
	import StatusBadge from '$lib/components/admin/primitives/StatusBadge.svelte';
	import JuegoFormModal from './JuegoFormModal.svelte';
	import FichaInventarioModal from './FichaInventarioModal.svelte';
	import EjemplarFormModal from './EjemplarFormModal.svelte';
	import EliminarInventarioModal from './EliminarInventarioModal.svelte';
	import { meson } from '$lib/data/junta.svelte';
	import { adminSession } from '$lib/stores/adminSession.svelte';
	import { notificaciones } from '$lib/stores/notificaciones.svelte';
	import type { Ejemplar, Juego } from '$lib/schemas';

	const sizePagina = 8;

	const columnas: DataColumn[] = [
		{ id: 'juego', label: 'Juego' },
		{ id: 'tipo', label: 'Tipo' },
		{ id: 'disponibilidad', label: 'Disponibilidad' },
		{ id: 'ejemplares', label: 'Ejemplares' },
		{ id: 'acciones', label: 'Acciones', align: 'right' }
	];

	const itemsTipo = [
		{ value: 'Todos', label: 'Todos' },
		{ value: 'Juego base', label: 'Juego base' },
		{ value: 'Expansión', label: 'Expansión' }
	];

	const itemsDisponibilidad = [
		{ value: 'Todos', label: 'Todos' },
		{ value: 'Disponible', label: 'Disponible' },
		{ value: 'No disponible', label: 'No disponible' }
	];

	const claseBotonVer =
		'inline-flex cursor-pointer items-center gap-1.5 rounded-base border border-glass-border bg-surface-container-lowest px-2.5 py-1.5 font-mono text-xs uppercase tracking-wider text-on-surface-variant transition hover:border-secondary/50 hover:bg-secondary/10 hover:text-secondary';
	const claseBotonEditar =
		'inline-flex cursor-pointer items-center gap-1.5 rounded-base border border-glass-border bg-surface-container-lowest px-2.5 py-1.5 font-mono text-xs uppercase tracking-wider text-on-surface-variant transition hover:border-primary/50 hover:bg-primary/10 hover:text-primary';
	const claseBotonEliminar =
		'inline-flex cursor-pointer items-center gap-1.5 rounded-base border border-glass-border bg-surface-container-lowest px-2.5 py-1.5 font-mono text-xs uppercase tracking-wider text-on-surface-variant transition hover:border-error/50 hover:bg-error/15 hover:text-error';
	const claseInput =
		'w-full rounded-base border bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/70 focus:border-primary/50 border-glass-border';

	const puedeEditar = $derived(adminSession.user.role !== 'junior');

	let buscar = $state('');
	let filtroTipo = $state('Todos');
	let filtroDisp = $state('Todos');
	let soloExternos = $state(false);
	let pagina = $state(1);
	let cargando = $state(true);

	let creandoJuego = $state(false);
	let editandoJuego = $state<Juego | null>(null);
	let fichaJuego = $state<Juego | null>(null);
	let ejemplarNuevoPara = $state<Juego | null>(null);
	let ejemplarEditando = $state<{ juego: Juego; ejemplar: Ejemplar } | null>(null);
	let eliminandoJuego = $state<Juego | null>(null);
	let eliminandoEjemplar = $state<{ juego: Juego; ejemplar: Ejemplar } | null>(null);

	function normalizar(texto: string): string {
		return texto
			.toLowerCase()
			.normalize('NFD')
			.replace(/\p{Diacritic}/gu, '');
	}

	onMount(() => {
		const temporizador = setTimeout(() => {
			cargando = false;
		}, 450);

		return () => clearTimeout(temporizador);
	});

	function resumen(idJuego: number): { total: number; bodega: number; externos: number } {
		const ejemplares = meson.ejemplaresDeJuego(idJuego);

		return {
			total: ejemplares.length,
			bodega: ejemplares.filter((e) => e.estadoEjemplar === 'En bodega').length,
			externos: ejemplares.filter((e) => e.esExterno).length
		};
	}

	const filtrados = $derived(
		meson.juegos.filter((j) => {
			const termino = normalizar(buscar.trim());
			const coincideTexto =
				termino === '' ||
				normalizar(j.nombreJuego).includes(termino) ||
				normalizar(String(j.idJuego)).includes(termino);

			if (!coincideTexto) return false;

			if (filtroTipo !== 'Todos' && j.tipo !== filtroTipo) return false;

			const disponible = meson.disponibleDe(j.idJuego);

			if (filtroDisp === 'Disponible' && !disponible) return false;
			if (filtroDisp === 'No disponible' && disponible) return false;

			if (soloExternos && resumen(j.idJuego).externos === 0) return false;

			return true;
		})
	);
	const paginados = $derived(filtrados.slice((pagina - 1) * sizePagina, pagina * sizePagina));

	$effect(() => {
		const totalPaginas = Math.max(Math.ceil(filtrados.length / sizePagina), 1);

		if (pagina > totalPaginas) {
			pagina = totalPaginas;
		}
	});

	function confirmarEliminarJuego(): { ok: boolean; motivo: string } {
		if (!eliminandoJuego) return { ok: false, motivo: 'No hay juego seleccionado.' };

		const resultado = meson.eliminarJuego(eliminandoJuego.idJuego);

		if (!resultado.ok) return resultado;

		notificaciones.mostrar(
			'success',
			'Juego eliminado',
			`«${eliminandoJuego.nombreJuego}» se retiró del catálogo.`
		);
		eliminandoJuego = null;

		return { ok: true, motivo: '' };
	}

	function confirmarEliminarEjemplar(): { ok: boolean; motivo: string } {
		if (!eliminandoEjemplar) return { ok: false, motivo: 'No hay ejemplar seleccionado.' };

		const resultado = meson.eliminarEjemplar(eliminandoEjemplar.ejemplar.idEjemplar);

		if (!resultado.ok) return resultado;

		notificaciones.mostrar(
			'success',
			'Ejemplar eliminado',
			`${eliminandoEjemplar.ejemplar.idEjemplar} se retiró del inventario.`
		);
		eliminandoEjemplar = null;

		return { ok: true, motivo: '' };
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
			<label class="sr-only" for="inventario-buscar">Buscar juego por nombre o ID</label>
			<input
				id="inventario-buscar"
				type="search"
				bind:value={buscar}
				oninput={() => (pagina = 1)}
				placeholder="Buscar por nombre o ID…"
				class={`${claseInput} w-56 pl-9`}
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
				class="w-36"
			/>
		</div>

		<div class="flex items-center gap-2.5">
			<span class="font-mono text-xs tracking-wider text-on-surface-variant uppercase">Estado</span>
			<Dropdown
				items={itemsDisponibilidad}
				value={filtroDisp}
				onchange={(valor) => {
					filtroDisp = valor;
					pagina = 1;
				}}
				class="w-40"
			/>
		</div>

		<button
			type="button"
			aria-pressed={soloExternos}
			onclick={() => {
				soloExternos = !soloExternos;
				pagina = 1;
			}}
			class="inline-flex cursor-pointer items-center gap-1.5 rounded-base border px-2.5 py-2 font-mono text-xs tracking-wider uppercase transition {soloExternos
				? 'border-secondary/50 bg-secondary/10 text-secondary'
				: 'border-glass-border bg-surface-container-lowest text-on-surface-variant hover:text-on-surface'}"
		>
			<Icon name="box" class="h-3.5 w-3.5" strokeWidth={2} />
			Externos
		</button>
	</div>

	<div class="flex flex-wrap items-center gap-3">
		<span class="font-mono text-xs tracking-wider text-on-surface-variant/70 uppercase">
			{filtrados.length} juego{filtrados.length === 1 ? '' : 's'}
		</span>
		{#if puedeEditar}
			<button
				type="button"
				onclick={() => (creandoJuego = true)}
				class="inline-flex cursor-pointer items-center gap-1.5 rounded-base border border-primary/50 bg-primary/10 px-3 py-2 font-mono text-xs tracking-wider text-primary uppercase transition hover:bg-primary/20 hover:ice-glow"
			>
				<Icon name="plus" class="h-3.5 w-3.5" strokeWidth={2} />
				Nuevo juego
			</button>
		{/if}
	</div>
{/snippet}

{#snippet tarjetaMovil(fila: Juego)}
	{@const r = resumen(fila.idJuego)}
	{@const disponible = meson.disponibleDe(fila.idJuego)}
	<div class="flex flex-col gap-2.5">
		<div class="flex items-start justify-between gap-2">
			<div class="flex min-w-0 flex-col">
				<span class="truncate text-body-md font-medium text-on-surface">{fila.nombreJuego}</span>
				<span class="font-mono text-xs text-on-surface-variant/80">
					#{fila.idJuego} · {fila.tipo}
				</span>
			</div>
			<span class="flex shrink-0 flex-col items-end gap-1.5">
				<StatusBadge tone={disponible ? 'success' : 'neutral'}>
					{disponible ? 'Disponible' : 'No disponible'}
				</StatusBadge>
				{#if r.externos > 0}
					<StatusBadge tone="info">Externo × {r.externos}</StatusBadge>
				{/if}
			</span>
		</div>

		<p class="font-mono text-xs text-on-surface-variant/80">
			{r.total} ejemplar{r.total === 1 ? '' : 'es'} · {r.bodega} en bodega
		</p>

		<div class="grid grid-cols-3 gap-2">
			<button
				type="button"
				onclick={() => (fichaJuego = fila)}
				aria-label={`Ver ficha de ${fila.nombreJuego}`}
				class={`${claseBotonVer} justify-center`}
			>
				<Icon name="info" class="h-3.5 w-3.5" strokeWidth={2} />
				Ver
			</button>
			{#if puedeEditar}
				<button
					type="button"
					onclick={() => (editandoJuego = fila)}
					aria-label={`Editar ${fila.nombreJuego}`}
					class={`${claseBotonEditar} justify-center`}
				>
					<Icon name="pencil" class="h-3.5 w-3.5" strokeWidth={2} />
					Editar
				</button>
				<button
					type="button"
					onclick={() => (eliminandoJuego = fila)}
					aria-label={`Eliminar ${fila.nombreJuego}`}
					class={`${claseBotonEliminar} justify-center`}
				>
					<Icon name="trash-2" class="h-3.5 w-3.5" strokeWidth={2} />
					Borrar
				</button>
			{/if}
		</div>
	</div>
{/snippet}

{#snippet cell(fila: Juego, columna: DataColumn)}
	{@const r = resumen(fila.idJuego)}
	{@const disponible = meson.disponibleDe(fila.idJuego)}
	{#if columna.id === 'juego'}
		<span class="flex min-w-0 flex-col">
			<span class="font-medium">{fila.nombreJuego}</span>
			<span class="font-mono text-xs text-on-surface-variant/70">#{fila.idJuego}</span>
		</span>
	{:else if columna.id === 'tipo'}
		<span class="flex flex-col items-start gap-1.5">
			<StatusBadge tone={fila.tipo === 'Expansión' ? 'info' : 'neutral'}>{fila.tipo}</StatusBadge>
			{#if fila.tipo === 'Expansión' && fila.idJuegoBase !== null}
				<span class="font-mono text-xs text-on-surface-variant/70">
					base #{fila.idJuegoBase}
				</span>
			{/if}
		</span>
	{:else if columna.id === 'disponibilidad'}
		<span class="flex flex-col items-start gap-1.5">
			<StatusBadge tone={disponible ? 'success' : 'neutral'}>
				{disponible ? `Disponible (${r.bodega})` : 'No disponible'}
			</StatusBadge>
			{#if r.externos > 0}
				<StatusBadge tone="info">Externo × {r.externos}</StatusBadge>
			{/if}
		</span>
	{:else if columna.id === 'ejemplares'}
		<span class="font-mono text-sm text-on-surface-variant">
			{r.total} total · {r.bodega} bodega
		</span>
	{:else}
		<span class="flex items-center justify-end gap-2">
			<button
				type="button"
				onclick={() => (fichaJuego = fila)}
				aria-label={`Ver ficha de ${fila.nombreJuego}`}
				class={claseBotonVer}
			>
				<Icon name="info" class="h-3.5 w-3.5" strokeWidth={2} />
				Ver
			</button>
			{#if puedeEditar}
				<button
					type="button"
					onclick={() => (editandoJuego = fila)}
					aria-label={`Editar ${fila.nombreJuego}`}
					class={claseBotonEditar}
				>
					<Icon name="pencil" class="h-3.5 w-3.5" strokeWidth={2} />
					Editar
				</button>
				<button
					type="button"
					onclick={() => (eliminandoJuego = fila)}
					aria-label={`Eliminar ${fila.nombreJuego}`}
					class={claseBotonEliminar}
				>
					<Icon name="trash-2" class="h-3.5 w-3.5" strokeWidth={2} />
					Borrar
				</button>
			{/if}
		</span>
	{/if}
{/snippet}

{#if !puedeEditar}
	<div
		class="flex flex-col items-center gap-3 rounded-base border border-glass-border surface-level-1 px-6 py-12 text-center"
	>
		<span
			class="flex h-12 w-12 items-center justify-center rounded-full border border-glass-border bg-on-surface/10"
		>
			<Icon name="shield-check" class="h-6 w-6 text-on-surface-variant" />
		</span>
		<p class="font-display text-headline-md font-semibold text-on-surface">
			Sin acceso al inventario
		</p>
		<p class="max-w-md text-body-md text-on-surface-variant">
			Solo el staff Senior y Directivo puede administrar el catálogo físico y los juegos externos.
		</p>
	</div>
{:else}
	<div class="flex flex-col gap-4">
		<DataTable
			columns={columnas}
			rows={paginados}
			keyRow={(fila) => String(fila.idJuego)}
			{cell}
			mobileCard={tarjetaMovil}
			loading={cargando}
			emptyMessage="No hay juegos en el catálogo"
			emptyDescription="Crea el primero con «Nuevo juego» o ajusta los filtros."
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

{#if creandoJuego}
	<JuegoFormModal juego={null} onclose={() => (creandoJuego = false)} />
{/if}

{#if editandoJuego}
	<JuegoFormModal juego={editandoJuego} onclose={() => (editandoJuego = null)} />
{/if}

{#if fichaJuego}
	<FichaInventarioModal
		juego={fichaJuego}
		onclose={() => (fichaJuego = null)}
		onEditarJuego={(j) => {
			fichaJuego = null;
			editandoJuego = j;
		}}
		onEliminarJuego={(j) => {
			fichaJuego = null;
			eliminandoJuego = j;
		}}
		onNuevoEjemplar={(j) => {
			ejemplarNuevoPara = j;
		}}
		onEditarEjemplar={(j, e) => {
			ejemplarEditando = { juego: j, ejemplar: e };
		}}
		onEliminarEjemplar={(j, e) => {
			eliminandoEjemplar = { juego: j, ejemplar: e };
		}}
	/>
{/if}

{#if ejemplarNuevoPara}
	<EjemplarFormModal
		juego={ejemplarNuevoPara}
		ejemplar={null}
		onclose={() => (ejemplarNuevoPara = null)}
	/>
{/if}

{#if ejemplarEditando}
	<EjemplarFormModal
		juego={ejemplarEditando.juego}
		ejemplar={ejemplarEditando.ejemplar}
		onclose={() => (ejemplarEditando = null)}
	/>
{/if}

{#if eliminandoJuego}
	<EliminarInventarioModal
		titulo="Eliminar juego"
		mensaje={`«${eliminandoJuego.nombreJuego}» (#${eliminandoJuego.idJuego}) desaparecerá del catálogo. Solo procede sin ejemplares ni expansiones asociadas (FK RESTRICT).`}
		onclose={() => (eliminandoJuego = null)}
		onConfirmar={confirmarEliminarJuego}
	/>
{/if}

{#if eliminandoEjemplar}
	<EliminarInventarioModal
		titulo="Eliminar ejemplar"
		mensaje={`${eliminandoEjemplar.ejemplar.idEjemplar} («${eliminandoEjemplar.juego.nombreJuego}») se retirará del inventario. Solo procede sin solicitudes ni préstamos asociados.`}
		onclose={() => (eliminandoEjemplar = null)}
		onConfirmar={confirmarEliminarEjemplar}
	/>
{/if}
