<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import StatusBadge from '../primitives/StatusBadge.svelte';
	import type { FichaBusqueda } from '$lib/data/junta.svelte';

	type Tono = 'neutral' | 'info' | 'success' | 'warning' | 'error';

	let { ficha }: { ficha: FichaBusqueda } = $props();

	const { ejemplar, juego } = $derived(ficha);

	const tonoEstado: Record<typeof ejemplar.estadoEjemplar, Tono> = {
		'En bodega': 'success',
		Prestado: 'info',
		Perdido: 'error',
		'Para revisar': 'warning',
		'Con su dueño': 'neutral'
	};

	const tonoCompletitud: Record<typeof ejemplar.estadoCompletitud, Tono> = {
		Completo: 'neutral',
		Incompleto: 'warning'
	};
</script>

<div
	class="rounded-base border border-glass-border surface-level-1 p-4 {ejemplar.estadoEjemplar ===
	'En bodega'
		? ''
		: 'opacity-90'}"
>
	<div class="flex gap-4">
		<div
			class="relative h-28 w-24 shrink-0 overflow-hidden rounded-base bg-surface-container-lowest"
		>
			{#if juego.pathImagen}
				<img
					src={juego.pathImagen}
					alt={`Imagen de ${juego.nombreJuego}`}
					class="h-full w-full object-cover {ejemplar.estadoEjemplar === 'En bodega'
						? ''
						: 'opacity-60 grayscale'}"
				/>
			{:else}
				<div
					class="flex h-full items-center justify-center px-2 text-center font-mono text-xs text-on-surface-variant"
					role="img"
					aria-label={`Sin imagen para ${juego.nombreJuego}`}
				>
					Sin imagen
				</div>
			{/if}
		</div>

		<div class="flex min-w-0 flex-col gap-1.5">
			<h3 class="font-display text-body-lg leading-snug font-semibold text-on-surface">
				{juego.nombreJuego}
			</h3>

			<p class="font-mono text-xs text-on-surface-variant">
				{ejemplar.idEjemplar}
				{#if juego.tipo === 'Expansión'}
					· Expansión
				{/if}
			</p>

			<div class="flex flex-wrap items-center gap-1.5">
				<StatusBadge tone={tonoEstado[ejemplar.estadoEjemplar]}>
					{ejemplar.estadoEjemplar}
				</StatusBadge>
				<StatusBadge tone={tonoCompletitud[ejemplar.estadoCompletitud]}>
					{ejemplar.estadoCompletitud}
				</StatusBadge>
				{#if ejemplar.esExterno}
					<StatusBadge tone="info">Externo</StatusBadge>
				{/if}
			</div>

			<p class="font-mono text-xs text-on-surface-variant">
				{juego.jugadoresMin === null || juego.jugadoresMax === null
					? 'Jugadores sin informar'
					: `${juego.jugadoresMin}–${juego.jugadoresMax} jug.`}
				· {juego.duracion === null ? 'Duración sin informar' : `${juego.duracion} min`}
				· {juego.dificultad ?? 'Dificultad sin informar'}
			</p>
		</div>
	</div>

	{#if ejemplar.estadoCompletitud === 'Incompleto' && ejemplar.comentarios}
		<p
			class="text-body-sm mt-3 flex items-start gap-2 rounded-base border border-tertiary/40 bg-tertiary/10 p-2.5 text-tertiary"
		>
			<Icon name="circle-alert" class="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
			<span>{ejemplar.comentarios}</span>
		</p>
	{/if}
</div>
