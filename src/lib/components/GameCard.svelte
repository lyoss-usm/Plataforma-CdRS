<script lang="ts">
	import type { CatalogGame } from '$lib/schemas';

	interface Props {
		juego: CatalogGame;
	}

	let { juego }: Props = $props();
	let imagenFallida = $state(false);

	function formatearJugadores(minimo: number | null, maximo: number | null): string {
		if (minimo === null && maximo === null) {
			return 'Sin información';
		}

		if (minimo === null) {
			return `Hasta ${maximo}`;
		}

		if (maximo === null) {
			return `Desde ${minimo}`;
		}

		if (minimo === maximo) {
			return String(minimo);
		}

		return `${minimo}–${maximo}`;
	}
</script>

<article class="overflow-hidden rounded-base border border-glass-border bg-surface-container-low">
	<div class="relative aspect-[3/4] bg-surface-container-lowest">
		{#if juego.pathImagen && !imagenFallida}
			<img
				src={juego.pathImagen}
				alt={`Imagen de ${juego.nombreJuego}`}
				loading="lazy"
				width="400"
				height="533"
				class="h-full w-full object-cover"
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

		<span
			class={juego.disponible
				? 'absolute right-2 bottom-2 rounded-base bg-primary px-2 py-1 font-mono text-xs font-semibold text-on-primary'
				: 'absolute right-2 bottom-2 rounded-base bg-surface-container-highest px-2 py-1 font-mono text-xs font-semibold text-on-surface-variant'}
		>
			{juego.disponible ? 'Disponible' : 'No disponible'}
		</span>
	</div>

	<div class="flex flex-col gap-4 p-4">
		<div class="flex flex-col gap-1">
			<span class="font-mono text-xs tracking-wider text-on-surface-variant uppercase">
				{juego.tipo}
			</span>

			<h3 class="font-display text-body-lg font-semibold text-on-surface">
				{juego.nombreJuego}
			</h3>
		</div>

		<dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
			<div>
				<dt class="text-on-surface-variant">Jugadores</dt>
				<dd class="font-medium text-on-surface">
					{formatearJugadores(juego.jugadoresMin, juego.jugadoresMax)}
				</dd>
			</div>

			<div>
				<dt class="text-on-surface-variant">Duración</dt>
				<dd class="font-medium text-on-surface">
					{juego.duracion === null ? 'Sin información' : `${juego.duracion} min`}
				</dd>
			</div>

			<div>
				<dt class="text-on-surface-variant">Edad mínima</dt>
				<dd class="font-medium text-on-surface">
					{juego.edadMinima === null ? 'Sin información' : `${juego.edadMinima}+`}
				</dd>
			</div>

			<div>
				<dt class="text-on-surface-variant">Dificultad</dt>
				<dd class="font-medium text-on-surface">
					{juego.dificultad ?? 'Sin información'}
				</dd>
			</div>

			<div>
				<dt class="text-on-surface-variant">Calificación</dt>
				<dd class="font-medium text-on-surface">
					{juego.calificacion === null ? 'Sin información' : `${juego.calificacion.toFixed(1)}/10`}
				</dd>
			</div>
		</dl>
	</div>
</article>
