<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '$lib/components/admin/primitives/Modal.svelte';
	import StatusBadge from '$lib/components/admin/primitives/StatusBadge.svelte';
	import QrEjemplar from './QrEjemplar.svelte';
	import { meson } from '$lib/data/junta.svelte';
	import { imprimirQr } from '$lib/qr/imprimirQr';
	import { notificaciones } from '$lib/stores/notificaciones.svelte';
	import type { Ejemplar, Juego } from '$lib/schemas';

	interface Props {
		juego: Juego;
		onclose: () => void;
		onEditarJuego: (juego: Juego) => void;
		onEliminarJuego: (juego: Juego) => void;
		onNuevoEjemplar: (juego: Juego) => void;
		onEditarEjemplar: (juego: Juego, ejemplar: Ejemplar) => void;
		onEliminarEjemplar: (juego: Juego, ejemplar: Ejemplar) => void;
	}

	let {
		juego,
		onclose,
		onEditarJuego,
		onEliminarJuego,
		onNuevoEjemplar,
		onEditarEjemplar,
		onEliminarEjemplar
	}: Props = $props();

	const tonoEstado: Record<
		Ejemplar['estadoEjemplar'],
		'neutral' | 'info' | 'success' | 'warning' | 'error'
	> = {
		'En bodega': 'success',
		Prestado: 'info',
		Perdido: 'error',
		'Para revisar': 'warning',
		'Con su dueño': 'neutral'
	};

	const ejemplares = $derived(meson.ejemplaresDeJuego(juego.idJuego));

	function detalleJugadores(): string {
		if (juego.jugadoresMin === null && juego.jugadoresMax === null) return 'Sin informar';
		if (juego.jugadoresMin === null) return `Hasta ${juego.jugadoresMax}`;
		if (juego.jugadoresMax === null) return `Desde ${juego.jugadoresMin}`;
		if (juego.jugadoresMin === juego.jugadoresMax) return `${juego.jugadoresMin}`;
		return `${juego.jugadoresMin}–${juego.jugadoresMax}`;
	}

	const claseBotonSecundario =
		'inline-flex cursor-pointer items-center gap-1.5 rounded-base border border-glass-border bg-surface-container-lowest px-3 py-2 font-mono text-xs uppercase tracking-wider text-on-surface-variant transition hover:text-on-surface';

	function imprimir(ejemplar: Ejemplar) {
		const ok = imprimirQr(ejemplar.idEjemplar, juego.nombreJuego);

		if (!ok) {
			notificaciones.mostrar(
				'error',
				'Ventana bloqueada',
				'El navegador bloqueó la ventana de impresión. Permite ventanas emergentes.'
			);
		}
	}
</script>

<Modal title={juego.nombreJuego} size="lg" {onclose}>
	{#snippet header()}
		<div class="flex flex-wrap items-center gap-2">
			<StatusBadge tone={juego.tipo === 'Expansión' ? 'info' : 'neutral'}>{juego.tipo}</StatusBadge>
			{#if juego.tipo === 'Expansión' && juego.idJuegoBase !== null}
				<span class="font-mono text-xs text-on-surface-variant/70">
					base #{juego.idJuegoBase} · {meson.juegoDe(juego.idJuegoBase)?.nombreJuego ?? '—'}
				</span>
			{/if}
			<span class="font-mono text-xs text-on-surface-variant/70">#{juego.idJuego}</span>
		</div>
	{/snippet}

	<div class="flex flex-col gap-5">
		<dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			<div class="rounded-base border border-glass-border bg-surface-container-lowest p-3">
				<dt class="font-mono text-[10px] tracking-wider text-on-surface-variant/70 uppercase">
					Jugadores
				</dt>
				<dd class="text-body-md text-on-surface">{detalleJugadores()}</dd>
			</div>
			<div class="rounded-base border border-glass-border bg-surface-container-lowest p-3">
				<dt class="font-mono text-[10px] tracking-wider text-on-surface-variant/70 uppercase">
					Duración
				</dt>
				<dd class="text-body-md text-on-surface">
					{juego.duracion === null ? '—' : `${juego.duracion} min`}
				</dd>
			</div>
			<div class="rounded-base border border-glass-border bg-surface-container-lowest p-3">
				<dt class="font-mono text-[10px] tracking-wider text-on-surface-variant/70 uppercase">
					Edad mín.
				</dt>
				<dd class="text-body-md text-on-surface">{juego.edadMinima ?? '—'}</dd>
			</div>
			<div class="rounded-base border border-glass-border bg-surface-container-lowest p-3">
				<dt class="font-mono text-[10px] tracking-wider text-on-surface-variant/70 uppercase">
					Calificación
				</dt>
				<dd class="text-body-md text-on-surface">
					{juego.calificacion ?? '—'}{juego.dificultad ? ` · ${juego.dificultad}` : ''}
				</dd>
			</div>
		</dl>

		{#if juego.manual || juego.video || juego.pathImagen}
			<div class="flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-on-surface-variant">
				{#if juego.pathImagen}
					<span class="truncate">Imagen: {juego.pathImagen}</span>
				{/if}
				{#if juego.manual}
					<span class="truncate">Manual: {juego.manual}</span>
				{/if}
				{#if juego.video}
					<span class="truncate">Video: {juego.video}</span>
				{/if}
			</div>
		{/if}

		<div class="flex flex-wrap items-center gap-2">
			<button type="button" onclick={() => onEditarJuego(juego)} class={claseBotonSecundario}>
				<Icon name="pencil" class="h-3.5 w-3.5" strokeWidth={2} />
				Editar ficha
			</button>
			<button type="button" onclick={() => onEliminarJuego(juego)} class={claseBotonSecundario}>
				<Icon name="trash-2" class="h-3.5 w-3.5" strokeWidth={2} />
				Eliminar juego
			</button>
			<button type="button" onclick={() => onNuevoEjemplar(juego)} class={claseBotonSecundario}>
				<Icon name="plus" class="h-3.5 w-3.5" strokeWidth={2} />
				Agregar ejemplar
			</button>
		</div>

		<section aria-label="Ejemplares del juego" class="flex flex-col gap-2.5">
			<h3 class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase">
				Ejemplares ({ejemplares.length})
			</h3>

			{#if ejemplares.length === 0}
				<p
					class="rounded-base border border-glass-border px-4 py-6 text-center text-body-md text-on-surface-variant"
				>
					Sin ejemplares: el juego aparece «No disponible» en el catálogo hasta agregar uno.
				</p>
			{:else}
				<ul class="flex flex-col gap-2.5">
					{#each ejemplares as ejemplar (ejemplar.idEjemplar)}
						<li
							class="flex flex-col gap-2 rounded-base border border-glass-border bg-surface-container-lowest p-3.5"
						>
							<div class="flex flex-wrap items-center justify-between gap-2">
								<span class="font-mono font-semibold text-on-surface">
									{ejemplar.idEjemplar}
								</span>
								<span class="flex flex-wrap gap-1.5">
									<StatusBadge tone={tonoEstado[ejemplar.estadoEjemplar]}>
										{ejemplar.estadoEjemplar}
									</StatusBadge>
									<StatusBadge
										tone={ejemplar.estadoCompletitud === 'Completo' ? 'success' : 'warning'}
									>
										{ejemplar.estadoCompletitud}
									</StatusBadge>
									{#if ejemplar.esExterno}
										<StatusBadge tone="info">Externo</StatusBadge>
									{/if}
								</span>
							</div>

							{#if ejemplar.situacion || ejemplar.comentarios || ejemplar.componentes}
								<p class="text-body-sm text-on-surface-variant/80">
									{[ejemplar.situacion, ejemplar.comentarios, ejemplar.componentes]
										.filter(Boolean)
										.join(' · ')}
								</p>
							{/if}

							<div class="flex items-center gap-3">
								<QrEjemplar texto={ejemplar.idEjemplar} tamano={76} />
								<div class="flex min-w-0 flex-col gap-1.5">
									<p class="text-body-sm text-on-surface-variant/70">
										El QR codifica el ID: escanéalo en el mesón o imprímelo para la caja.
									</p>
									<div>
										<button
											type="button"
											onclick={() => imprimir(ejemplar)}
											aria-label={`Imprimir QR de ${ejemplar.idEjemplar}`}
											class={claseBotonSecundario}
										>
											<Icon name="qr-code" class="h-3.5 w-3.5" strokeWidth={2} />
											Imprimir QR
										</button>
									</div>
								</div>
							</div>

							<div class="flex flex-wrap gap-2">
								<button
									type="button"
									onclick={() => onEditarEjemplar(juego, ejemplar)}
									aria-label={`Editar ${ejemplar.idEjemplar}`}
									class={claseBotonSecundario}
								>
									<Icon name="pencil" class="h-3.5 w-3.5" strokeWidth={2} />
									Editar
								</button>
								<button
									type="button"
									onclick={() => onEliminarEjemplar(juego, ejemplar)}
									aria-label={`Eliminar ${ejemplar.idEjemplar}`}
									class={claseBotonSecundario}
								>
									<Icon name="trash-2" class="h-3.5 w-3.5" strokeWidth={2} />
									Eliminar
								</button>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>

	{#snippet footer()}
		<button type="button" onclick={onclose} class={claseBotonSecundario}>Cerrar</button>
	{/snippet}
</Modal>
