<script lang="ts">
	import SectionPage from '$lib/components/admin/SectionPage.svelte';
	import DataTable from '$lib/components/admin/primitives/DataTable.svelte';
	import type { DataColumn } from '$lib/components/admin/primitives/types';
	import Dropdown from '$lib/components/admin/primitives/Dropdown.svelte';
	import FormField from '$lib/components/admin/primitives/FormField.svelte';
	import Modal from '$lib/components/admin/primitives/Modal.svelte';
	import Pagination from '$lib/components/admin/primitives/Pagination.svelte';
	import StatusBadge from '$lib/components/admin/primitives/StatusBadge.svelte';

	type ToneDemo = 'neutral' | 'info' | 'success' | 'warning' | 'error';

	interface FilaDemo {
		id: string;
		nombre: string;
		rol: string;
		estado: string;
		tone: ToneDemo;
		puntos: number;
	}

	let modalAbierto = $state(false);
	const estadoSelect = $state({ valor: 'general' });
	let paginaDemo = $state(1);

	const itemsDropdown = [
		{ value: 'general', label: 'General' },
		{ value: 'junta', label: 'Junta' },
		{ value: 'solicitudes', label: 'Solicitudes' },
		{ value: 'inventario', label: 'Inventario' }
	];

	const columnasTabla: DataColumn[] = [
		{ id: 'nombre', label: 'Nombre' },
		{ id: 'rol', label: 'Rol', mobileHidden: true },
		{ id: 'estado', label: 'Estado' },
		{ id: 'puntos', label: 'Puntos', align: 'right' }
	];

	const filasTabla: FilaDemo[] = [
		{
			id: 'u-1',
			nombre: 'Ana Verdugo',
			rol: 'Sansana',
			estado: 'Aprobada',
			tone: 'success',
			puntos: 120
		},
		{
			id: 'u-2',
			nombre: 'Bruno Muñoz',
			rol: 'Sansano',
			estado: 'Pendiente',
			tone: 'warning',
			puntos: 85
		},
		{
			id: 'u-3',
			nombre: 'Cata Soto',
			rol: 'Directiva',
			estado: 'Rechazada',
			tone: 'error',
			puntos: 342
		},
		{
			id: 'u-4',
			nombre: 'Diego Rojas',
			rol: 'Vocal',
			estado: 'Aprobada',
			tone: 'success',
			puntos: 210
		}
	];

	const claseInputValido =
		'w-full rounded-base border border-glass-border bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/70 focus:border-primary/50';
	const claseInputInvalido =
		'w-full rounded-base border border-error bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/70';
	const claseBotonPrimario =
		'cursor-pointer rounded-base border border-primary/50 bg-primary/10 px-4 py-2 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow';
	const claseBotonSecundario =
		'cursor-pointer rounded-base border border-glass-border px-4 py-2 text-on-surface-variant transition hover:bg-white/5 hover:text-on-surface';
	const clasePanel = 'rounded-base border border-glass-border surface-level-1 p-5';
</script>

{#snippet tituloSeccion(clase: string, nombre: string)}
	<div class="mb-3 flex items-center justify-between">
		<h2 class="font-mono text-label-md tracking-wider text-on-surface-variant/60 uppercase">
			{clase}
		</h2>
		<span
			class="rounded-full border border-glass-border bg-on-surface/10 px-2 py-0.5 font-mono text-[10px] tracking-wider text-on-surface-variant/70 uppercase"
		>
			{nombre}
		</span>
	</div>
{/snippet}

{#snippet celda(fila: FilaDemo, columna: DataColumn)}
	{#if columna.id === 'nombre'}
		<span class="font-medium">{fila.nombre}</span>
	{:else if columna.id === 'rol'}
		<span class="text-on-surface-variant">{fila.rol}</span>
	{:else if columna.id === 'estado'}
		<StatusBadge tone={fila.tone}>{fila.estado}</StatusBadge>
	{:else}
		{fila.puntos}
	{/if}
{/snippet}

<SectionPage
	title="Guía de primitivas"
	description="Estados reutilizables de la vista administrativa."
>
	<div class="flex flex-col gap-6">
		<section class={clasePanel}>
			{@render tituloSeccion('status', 'StatusBadge')}
			<div class="flex flex-wrap items-center gap-3">
				<StatusBadge tone="neutral">Sin estado</StatusBadge>
				<StatusBadge tone="info">Información</StatusBadge>
				<StatusBadge tone="success">Completado</StatusBadge>
				<StatusBadge tone="warning">Pendiente</StatusBadge>
				<StatusBadge tone="error">Rechazado</StatusBadge>
			</div>
		</section>

		<section class={clasePanel}>
			{@render tituloSeccion('form', 'FormField')}
			<div class="grid gap-5 md:grid-cols-3">
				<FormField label="Nombre" htmlFor="demo-nombre" hint="Nombre completo visible en la ficha.">
					<input id="demo-nombre" type="text" value="Ana Verdugo" class={claseInputValido} />
				</FormField>

				<FormField label="Correo" htmlFor="demo-correo" error="El correo ya está registrado.">
					<input
						id="demo-correo"
						type="email"
						value="ana@usm.cl"
						aria-invalid="true"
						aria-describedby="demo-correo-error"
						class={claseInputInvalido}
					/>
				</FormField>

				<FormField
					label="Teléfono"
					htmlFor="demo-telefono"
					hint="Se muestra al resto de la directiva."
					disabled
				>
					<input
						id="demo-telefono"
						type="tel"
						value="+56 9 1234 5678"
						disabled
						class="w-full rounded-base border border-glass-border bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface opacity-50 transition outline-none"
					/>
				</FormField>
			</div>
		</section>

		<section class={clasePanel}>
			{@render tituloSeccion('select', 'Dropdown')}
			<div class="max-w-sm">
				<Dropdown
					items={itemsDropdown}
					value={estadoSelect.valor}
					placeholder="Elegir sección"
					label="Sección"
					onchange={(valor) => (estadoSelect.valor = valor)}
				/>
			</div>
		</section>

		<section class={clasePanel}>
			{@render tituloSeccion('dialog', 'Modal')}
			<div class="flex flex-wrap items-center gap-3">
				<button type="button" class={claseBotonPrimario} onclick={() => (modalAbierto = true)}>
					Abrir modal
				</button>
				<span class="font-mono text-xs tracking-wider text-on-surface-variant/70 uppercase"
					>Esc cierra; clic en el fondo también.</span
				>
			</div>
		</section>

		<section class={clasePanel}>
			{@render tituloSeccion('tabla', 'DataTable')}
			<div class="flex flex-col gap-5">
				<DataTable
					columns={columnasTabla}
					rows={filasTabla}
					keyRow={(fila) => fila.id}
					cell={celda}
				/>

				<DataTable
					columns={columnasTabla}
					rows={[]}
					keyRow={(fila) => fila.id}
					cell={celda}
					loading
				/>

				<DataTable
					columns={columnasTabla}
					rows={[]}
					keyRow={(fila) => fila.id}
					cell={celda}
					emptyMessage="Todavía no hay membresías"
					emptyDescription="Cuando alguien ingrese al club aparecerá aquí."
				/>

				<DataTable
					columns={columnasTabla}
					rows={[]}
					keyRow={(fila) => fila.id}
					cell={celda}
					error="No pudimos conectar con Supabase. Verifica tu red."
				/>
			</div>
		</section>

		<section class={clasePanel}>
			{@render tituloSeccion('nav', 'Pagination')}
			<Pagination
				page={paginaDemo}
				pageSize={10}
				total={42}
				onchange={(pagina) => (paginaDemo = pagina)}
			/>
		</section>
	</div>
</SectionPage>

{#if modalAbierto}
	<Modal title="Detalle de préstamo" onclose={() => (modalAbierto = false)}>
		<div class="flex flex-col gap-4">
			<p class="text-body-md text-on-surface-variant">
				Ejemplo de contenido de modal reutilizable con FormField y StatusBadge.
			</p>
			<div class="rounded-base border border-glass-border p-4">
				<dl class="grid gap-1 font-mono text-sm">
					<div class="flex justify-between gap-4">
						<dt class="text-on-surface-variant/70">Estado</dt>
						<dd><StatusBadge tone="warning">Pendiente</StatusBadge></dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-on-surface-variant/70">Ejemplar</dt>
						<dd class="text-on-surface">EVE-042 · Eclipse Phoenix</dd>
					</div>
				</dl>
			</div>
			<FormField label="Motivo" htmlFor="demo-motivo" hint="Se guarda con la devolución.">
				<textarea
					id="demo-motivo"
					rows="2"
					class="w-full resize-none rounded-base border border-glass-border bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/70 focus:border-primary/50"
					placeholder="Detalle opcional"
				></textarea>
			</FormField>
		</div>

		{#snippet footer()}
			<button type="button" class={claseBotonSecundario} onclick={() => (modalAbierto = false)}>
				Cancelar
			</button>
			<button type="button" class={claseBotonPrimario} onclick={() => (modalAbierto = false)}>
				Guardar
			</button>
		{/snippet}
	</Modal>
{/if}
