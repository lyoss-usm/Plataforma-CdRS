<script lang="ts">
	import { Star } from '@lucide/svelte';
	import type { CatalogGame } from '$lib/schemas';

	interface Props {
		juego: CatalogGame;
	}

	let { juego }: Props = $props();
	let imagenFallida = $state(false);

	function formatearJugadores(minimo: number | null, maximo: number | null): string {
		if (minimo === null && maximo === null) {
			return 'Jug. sin informar';
		}

		if (minimo === null) {
			return `Hasta ${maximo} jug.`;
		}

		if (maximo === null) {
			return `Desde ${minimo} jug.`;
		}

		if (minimo === maximo) {
			return `${minimo} jug.`;
		}

		return `${minimo}–${maximo} jug.`;
	}
</script>

<article class="group flex flex-col text-left">
	<div class="relative aspect-[3/4] overflow-hidden rounded-base bg-surface-container-lowest">
		{#if juego.pathImagen && !imagenFallida}
			<img
				src={juego.pathImagen}
				alt={`Imagen de ${juego.nombreJuego}`}
				loading="lazy"
				width="400"
				height="533"
				class={juego.disponible
					? 'h-full w-full object-cover transition duration-500 group-hover:scale-105'
					: 'h-full w-full object-cover opacity-70 grayscale transition duration-500 group-hover:opacity-80'}
				onerror={() => (imagenFallida = true)}
			/>
		{:else}
			<div
				class="flex h-full items-center justify-center px-4 text-center font-mono text-sm text-on-surface-variant"
				role="img"
				aria-label={`No hay imagen disponible para ${juego.nombreJuego}`}
			>
				Sin imagen disponible
			</div>
		{/if}

		{#if juego.disponible}
			<span class="sr-only">Disponible</span>
		{:else}
			<div class="absolute inset-0 bg-primary/20"></div>

			<span
				class="absolute bottom-2 left-2 rounded-base bg-black/50 px-2 py-0.5 font-mono text-xs tracking-wider text-on-surface uppercase backdrop-blur-sm"
			>
				No disponible
			</span>
		{/if}

		{#if juego.tipo === 'Expansión'}
			<span
				class="absolute top-2 left-2 rounded-base bg-black/50 px-2 py-0.5 font-mono text-xs tracking-wider text-on-surface uppercase backdrop-blur-sm"
			>
				Expansión
			</span>
		{/if}

		{#if juego.calificacion !== null}
			<span
				class="absolute top-2 right-2 inline-flex items-center gap-1 rounded-base bg-black/50 px-2 py-0.5 font-mono text-xs tracking-wider text-on-surface backdrop-blur-sm"
				aria-label={`Valoración: ${juego.calificacion.toFixed(1)} de 10`}
			>
				<Star
					class="h-3.5 w-3.5 fill-current text-primary"
					strokeWidth={1.8}
					aria-hidden="true"
				/>
				<span aria-hidden="true">{juego.calificacion.toFixed(1)}</span>
			</span>
		{/if}
	</div>

	<div class="flex flex-col gap-0.5 px-1 pt-2">
		<h3
			class="line-clamp-2 font-display text-body-lg leading-snug font-semibold text-on-surface transition group-hover:text-primary"
		>
			{juego.nombreJuego}
		</h3>

		<p class="font-mono text-xs text-on-surface-variant">
			{formatearJugadores(juego.jugadoresMin, juego.jugadoresMax)}
			· {juego.duracion === null ? 'Duración sin informar' : `${juego.duracion} min`}
			· {juego.edadMinima === null ? 'Edad sin informar' : `${juego.edadMinima}+`}
		</p>
	</div>
</article>
