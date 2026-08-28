<script lang="ts">
	import LogoCoin from '$lib/components/LogoCoin.svelte';
	import StarField from '$lib/components/StarField.svelte';

	const events = [
		{
			src: '/eventos/evento-1.jpg',
			alt: 'Dados sobre una mesa durante una sesión',
			caption: 'Noche de dados',
			cols: 'col-span-2 row-span-2',
			rot: '-rotate-1'
		},
		{
			src: '/eventos/evento-2.jpg',
			alt: 'Juego de mesa en una mesa de eventos',
			caption: 'Torneo de mesa',
			cols: '',
			rot: 'rotate-2'
		},
		{
			src: '/eventos/evento-3.jpg',
			alt: 'Reunión festiva del club',
			caption: 'Fiesta de cierre',
			cols: '',
			rot: '-rotate-2'
		},
		{
			src: '/eventos/evento-4.jpg',
			alt: 'Amigos jugando en grupo',
			caption: 'Mesa de verano',
			cols: 'row-span-2',
			rot: 'rotate-1'
		},
		{
			src: '/eventos/evento-5.jpg',
			alt: 'Partida de mesa con gente al fondo',
			caption: 'Campeonato del club',
			cols: 'col-span-2',
			rot: '-rotate-1'
		},
		{
			src: '/eventos/evento-6.jpg',
			alt: 'Sesión de rol en vivo',
			caption: 'Rol en vivo',
			cols: '',
			rot: 'rotate-2'
		},
		{
			src: '/eventos/evento-7.jpg',
			alt: 'Juegos y accesorios de mesa',
			caption: 'Salón de juegos',
			cols: '',
			rot: '-rotate-2'
		},
		{
			src: '/eventos/evento-8.jpg',
			alt: 'Convención con público',
			caption: 'Convención',
			cols: '',
			rot: 'rotate-1'
		},
		{
			src: '/eventos/evento-9.jpg',
			alt: 'Cartas sobre la mesa',
			caption: 'Tarde de cartas',
			cols: '',
			rot: '-rotate-2'
		},
		{
			src: '/eventos/evento-10.jpg',
			alt: 'Tablero de ajedrez',
			caption: 'Ajedrez rápido',
			cols: '',
			rot: 'rotate-2'
		},
		{
			src: '/eventos/evento-11.jpg',
			alt: 'Juegos de mesa variados',
			caption: 'Ludoteca abierta',
			cols: '',
			rot: '-rotate-1'
		}
	];
</script>

<section
	id="inicio"
	class="relative mt-16 flex scroll-mt-16 flex-col items-center justify-center gap-16 glass-border px-6 py-16"
>
	<div
		class="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden select-none"
		aria-hidden="true"
	></div>

	<div class="pointer-events-none absolute inset-0" aria-hidden="true">
		<StarField />
	</div>

	<div
		class="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-2 px-6 text-center sm:gap-6"
	>
		<span class="text-label-lg font-mono tracking-wider text-on-surface-variant uppercase"
			>Club de Rol</span
		>
		<span
			class="font-display text-[clamp(4rem,10vw,18rem)] leading-none font-bold tracking-tight whitespace-nowrap uppercase"
		>
			Sansano
		</span>

		<div class="flex flex-col items-center">
			<div class="relative aspect-square w-28 sm:w-32">
				<div class="absolute inset-2 rounded-full bg-ice-glow blur-2xl" aria-hidden="true"></div>
				<div class="absolute inset-0">
					<LogoCoin />
				</div>
			</div>

			<img
				src="/rolo/rolo_admirando_arriba_fix.png"
				alt="Rolo admirando la moneda del club"
				class="-mt-6 w-60 select-none sm:w-72"
				width="436"
				height="400"
			/>
		</div>

		<div class="mt-8 flex flex-wrap justify-center gap-4">
			<a
				href="#catalogo"
				class="rounded-base border border-primary/50 bg-primary/10 px-6 py-3 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow"
				>Ver catálogo</a
			>
			<a
				href="#sobre-nosotros"
				class="rounded-base border border-glass-border px-6 py-3 font-semibold text-on-surface-variant transition hover:bg-white/5 hover:text-on-surface"
				>Conócenos</a
			>
		</div>
	</div>

	<div id="eventos" class="relative z-10 w-full max-w-4xl scroll-mt-16">
		<div
			class="grid w-full grid-flow-dense auto-rows-[8rem] grid-cols-2 gap-4 sm:auto-rows-[9.5rem] md:grid-cols-4"
		>
			{#each events as event (event.src)}
				<div
					class={`group bg-surface-level-2 relative overflow-hidden rounded-base border border-glass-border ${event.cols} ${event.rot} transition hover:scale-[1.03] hover:rotate-0 hover:ice-glow`}
				>
					<img src={event.src} alt={event.alt} class="h-full w-full object-cover" loading="lazy" />
					<span
						class="pointer-events-none absolute inset-x-2 bottom-2 rounded-base bg-black/45 px-2 py-1 font-mono text-xs tracking-wider text-on-surface uppercase opacity-0 backdrop-blur-sm transition group-hover:opacity-100"
					>
						{event.caption}
					</span>
				</div>
			{/each}
		</div>
	</div>

	<img
		src="/rolo/rolo_corriendo_apurado_fix.png"
		alt="Rolo corriendo apurado de regreso al catálogo"
		class="pointer-events-none absolute bottom-2 left-0 z-10 hidden w-40 drop-shadow-lg select-none md:block lg:w-52"
		loading="lazy"
		width="358"
		height="360"
	/>
</section>
