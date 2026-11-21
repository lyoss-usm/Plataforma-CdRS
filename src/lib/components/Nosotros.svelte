<script lang="ts">
	import { landing } from '$lib/data/landing';

	const items = landing.nosotros;
</script>

<section
	id="sobre-nosotros"
	class="relative flex scroll-mt-16 flex-col items-center justify-center gap-4 glass-border bg-surface-container-lowest p-12 px-6 py-24"
>
	<h2 class="font-display text-headline-lg font-semibold text-on-surface">Sobre nosotros</h2>

	<div class="mt-10 flex w-full flex-col items-center gap-12">
		{#each items as item, i (item.titulo)}
			<div
				class="flex w-full max-w-5xl flex-col items-center gap-6 md:flex-row md:gap-10 {i % 2 !== 0
					? 'md:flex-row-reverse'
					: ''}"
			>
				<img
					src={item.img}
					alt={item.alt}
					class={item.cuadrado
						? 'aspect-square w-48 shrink-0 rounded-2xl border border-glass-border object-cover shadow-lg select-none md:w-52'
						: 'w-40 shrink-0 drop-shadow-lg select-none md:w-52'}
					style={item.cuadrado ? 'object-position: 25%' : undefined}
					loading="lazy"
					width="320"
					height="320"
				/>
				<div class="flex flex-col gap-2">
					<h3 class="font-display text-headline-lg font-semibold text-on-surface md:text-left">
						{item.titulo}
					</h3>
					<p class="text-body-lg text-on-surface-variant md:text-left">{item.texto}</p>
				</div>
			</div>
		{/each}
	</div>

	<img
		src="/rolo/rolo_saludando.webp"
		alt="Rolo saludando a los integrantes del club"
		class="pointer-events-none absolute right-0 bottom-2 z-10 hidden w-44 -scale-x-100 drop-shadow-lg select-none md:block lg:w-52"
		loading="lazy"
		width="400"
		height="400"
	/>
</section>
