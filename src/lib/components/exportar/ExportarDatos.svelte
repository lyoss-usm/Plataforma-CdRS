<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	type ExportEstado = 'idle' | 'loading' | 'success' | 'error';

	const DATASETS = [
		{ value: 'prestamos', label: 'Préstamos', detalle: 'Préstamos con duración en días' },
		{ value: 'solicitudes', label: 'Solicitudes', detalle: 'Solicitudes y su estado' },
		{ value: 'inventario', label: 'Inventario', detalle: 'Ejemplares con datos del juego' },
		{ value: 'nomina', label: 'Nómina', detalle: 'Sansanos con cargo' }
	] as const;

	let dialog: HTMLDialogElement;

	let seleccion = $state<string[]>(DATASETS.map((d) => d.value));
	let estado = $state<ExportEstado>('idle');
	let mensaje = $state('');
	let totalDescargado = $state(0);
	let timer: ReturnType<typeof setTimeout>;

	const todosMarcados = $derived(seleccion.length === DATASETS.length);

	function abrir() {
		clearTimeout(timer);
		estado = 'idle';
		mensaje = '';
		dialog.showModal();
	}

	function cerrar() {
		if (estado === 'loading') return;
		clearTimeout(timer);
		dialog.close();
	}

	function alternarTodos() {
		seleccion = todosMarcados ? [] : DATASETS.map((d) => d.value);
	}

	function guardar(nombre: string, blob: Blob) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = nombre;
		a.click();
		URL.revokeObjectURL(url);
	}

	async function exportar() {
		if (estado === 'loading') return;

		const elegidos = DATASETS.filter((d) => seleccion.includes(d.value));
		if (elegidos.length === 0) return;

		clearTimeout(timer);
		estado = 'loading';
		mensaje = '';

		try {
			const params = new SvelteURLSearchParams();
			for (const d of elegidos) params.append('dataset', d.value);

			const res = await fetch(`/api/exportar?${params}`);

			if (res.status === 403) {
				mensaje = 'Solo los directivos pueden exportar datos.';
				estado = 'error';
				return;
			}
			if (!res.ok) {
				mensaje = 'No se pudo generar la exportación. Intenta de nuevo.';
				estado = 'error';
				return;
			}

			const nombre =
				res.headers.get('Content-Disposition')?.match(/filename="(.+?)"/)?.[1] ??
				(elegidos.length === 1 ? `${elegidos[0].value}.csv` : 'exportacion.zip');

			guardar(nombre, await res.blob());

			totalDescargado = elegidos.length;
			estado = 'success';

			timer = setTimeout(() => {
				dialog.close();
				estado = 'idle';
			}, 1500);
		} catch {
			mensaje = 'Sin conexión con el servidor. Intenta de nuevo.';
			estado = 'error';
		}
	}
</script>

<!-- Botón que abre el modal -->
<button
	type="button"
	onclick={abrir}
	class="flex items-center gap-2 rounded-base border border-primary/50 bg-primary/10 px-4 py-2 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow"
>
	<Icon name="download" class="h-5 w-5" />
	Exportar
</button>


<dialog
	bind:this={dialog}
	aria-labelledby="export-titulo"
	oncancel={(e) => {
		if (estado === 'loading') e.preventDefault(); // Esc no cierra mientras descarga
	}}
	onclick={(e) => {
		if (e.target === dialog) cerrar(); // clic en el fondo oscuro
	}}
	class="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-base border border-outline-variant bg-surface p-0 text-on-surface backdrop:bg-black/60 backdrop:backdrop-blur-sm"
>
	<div class="flex flex-col gap-5 p-6">
		<div class="flex items-start justify-between gap-4">
			<div>
				<h3 id="export-titulo" class="font-display text-xl font-semibold tracking-tight">
					Exportar datos
				</h3>
				<p class="mt-1 text-sm text-on-surface-variant">
					Elige qué datasets incluir. Con varios se descarga un ZIP con un CSV por dataset.
				</p>
			</div>
			<button
				type="button"
				onclick={cerrar}
				disabled={estado === 'loading'}
				aria-label="Cerrar"
				class="rounded-base px-2 text-xl leading-none text-on-surface-variant transition hover:text-on-surface disabled:opacity-40"
			>
				×
			</button>
		</div>

		<fieldset class="flex flex-col gap-2" disabled={estado === 'loading'}>
			<legend class="sr-only">Datasets a exportar</legend>

			{#each DATASETS as d (d.value)}
				<label
					class="flex cursor-pointer items-center gap-3 rounded-base border border-outline-variant px-4 py-3 transition hover:bg-on-surface/5 has-checked:border-primary/50 has:checked:bg-primary/10"
				>
					<input type="checkbox" value={d.value} bind:group={seleccion} class="h-4 w-4 accent-primary" />
					<span class="flex flex-col">
						<span class="font-semibold">{d.label}</span>
						<span class="text-xs text-on-surface-variant">{d.detalle}</span>
					</span>
				</label>
			{/each}

			<button
				type="button"
				onclick={alternarTodos}
				class="self-start text-sm text-on-surface-variant underline-offset-2 hover:underline"
			>
				{todosMarcados ? 'Quitar todos' : 'Marcar todos'}
			</button>
		</fieldset>

		<p class="min-h-5 text-sm text-red-400" role="status" aria-live="polite">
			{#if estado === 'error'}{mensaje}{/if}
		</p>

		<div class="flex items-center justify-end gap-2">
			<button
				type="button"
				onclick={cerrar}
				disabled={estado === 'loading'}
				class="rounded-base px-4 py-2 font-semibold text-on-surface-variant transition hover:text-on-surface disabled:opacity-40"
			>
				Cancelar
			</button>

			<button
				type="button"
				onclick={exportar}
				disabled={estado === 'loading' || estado === 'success' || seleccion.length === 0}
				class="flex items-center gap-2 rounded-base border px-4 py-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60
					{estado === 'error'
					? 'border-red-400/60 bg-red-400/10 text-red-400 hover:bg-red-400/20'
					: estado === 'success'
						? 'border-green-400/60 bg-green-400/10 text-green-400'
						: 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 hover:ice-glow'}"
			>
				{#if estado === 'loading'}
					<span
						class="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
						aria-hidden="true"
					></span>
					Exportando...
				{:else if estado === 'success'}
					✓ {totalDescargado === 1 ? 'CSV descargado' : 'ZIP descargado'}
				{:else if estado === 'error'}
					Reintentar
				{:else}
					<Icon name="download" class="h-5 w-5" />
					Exportar{seleccion.length > 0 ? ` (${seleccion.length})` : ''}
				{/if}
			</button>
		</div>
	</div>
</dialog>