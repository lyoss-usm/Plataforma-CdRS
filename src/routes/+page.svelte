<script lang="ts">
	import LogoCoin from '$lib/components/LogoCoin.svelte';
	import StarField from '$lib/components/StarField.svelte';

	const navLinks = [
		{ href: '#inicio', label: 'Inicio' },
		{ href: '#sobre-nosotros', label: 'Nosotros' },
		{ href: '#eventos', label: 'Eventos' },
		{ href: '#faq', label: 'FAQ' },
		{ href: '#redes', label: 'Redes' }
	];

	const members = [
		{ name: 'Matías', role: 'Cronista', img: '/avatares/men-32.jpg' },
		{ name: 'Valentina', role: 'Game Master', img: '/avatares/women-44.jpg' },
		{ name: 'Sebastián', role: 'Estratega', img: '/avatares/men-75.jpg' },
		{ name: 'Fernanda', role: 'Narradora', img: '/avatares/women-68.jpg' },
		{ name: 'Cristóbal', role: 'Dador', img: '/avatares/men-22.jpg' },
		{ name: 'Isidora', role: 'Guardiana', img: '/avatares/women-29.jpg' },
		{ name: 'Benjamín', role: 'Cuidador', img: '/avatares/men-64.jpg' },
		{ name: 'Antonia', role: 'Enigmista', img: '/avatares/women-12.jpg' }
	];

	const socials = [
		{
			name: 'Instagram',
			handle: '@club.rol.sansano',
			url: '#',
			path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92C2.165 15.6 2.153 15.221 2.153 12c0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069Zm0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12s.014 3.668.072 4.948c.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24s3.668-.014 4.948-.072c4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948s-.014-3.667-.072-4.947c-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0Zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881Z'
		},
		{
			name: 'WhatsApp',
			handle: '+56 9 1234 5678',
			url: '#',
			path: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z'
		},
		{
			name: 'Discord',
			handle: 'discord.gg/cdrs',
			url: '#',
			path: 'M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .079.01c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.363 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028ZM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z'
		},
		{
			name: 'Correo',
			handle: 'hola@cdrs.cl',
			url: 'mailto:hola@cdrs.cl',
			path: 'M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5-8-5V6l8 5 8-5v2Z'
		}
	];

	const faqs = [
		{
			q: '¿Necesito experiencia previa?',
			a: 'Nada. Aprendemos jugando: cada mesa recibe con partidas introductorias y explica las reglas sobre la marcha.'
		},
		{
			q: '¿Cómo me sumo a una partida?',
			a: 'Por Discord o nuestro correo: coordinas tu primera sesión con el director o directora de la mesa que te interese.'
		},
		{
			q: '¿Hay que pagar algo?',
			a: 'El club es gratuito. Solo cubres tus propios traslados o consumo cuando la sesión es presencial.'
		},
		{
			q: '¿Juegan online o presencial?',
			a: 'Ambos. Presencial cerca del campus y online por Discord, con voz y vídeo.'
		},
		{
			q: '¿Puedo dirigir una mesa?',
			a: 'Por supuesto. Tenemos tutores que acompañan a nuevos directores y un repositorio de materiales compartidos.'
		},
		{
			q: '¿Qué sistemas de rol se juegan?',
			a: 'Dungeons & Dragons, Vampiro: La Mascarada, Call of Cthulhu y otros según el interés de cada mesa.'
		}
	];

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

	let menuOpen = $state(false);

	const closeMenu = () => (menuOpen = false);
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && closeMenu()} />

<header class="fixed top-0 z-40 w-full border-b border-glass-border surface-level-1">
	<nav class="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-6">
		<a href="#inicio" class="flex shrink-0 items-center gap-3" aria-label="Ir al inicio">
			<img
				src="/logos/logo.webp"
				alt="Logo del Club de Rol Sansano"
				class="h-9 w-9 rounded-full object-cover"
				width="36"
				height="36"
			/>
			<span
				class="font-display text-xl font-semibold tracking-tight text-on-surface max-sm:text-xl"
			>
				Club de Rol
			</span>
		</a>

		<div class="hidden items-center gap-8 md:flex">
			{#each navLinks as link (link.href)}
				<a
					href={link.href}
					class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase transition hover:text-on-surface"
				>
					{link.label}
				</a>
			{/each}
		</div>

		<div class="flex items-center gap-3">
			<a
				href="#catalogo"
				class="hidden shrink-0 rounded-base border border-primary/50 bg-primary/10 px-4 py-2 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow md:block"
			>
				Ver catálogo
			</a>

			<button
				class="flex h-10 w-10 items-center justify-center rounded-base text-on-surface-variant transition hover:bg-white/5 hover:text-on-surface md:hidden"
				type="button"
				aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
				aria-expanded={menuOpen}
				aria-controls="menu-mobile"
				onclick={() => (menuOpen = !menuOpen)}
			>
				{#if menuOpen}
					<svg
						viewBox="0 0 24 24"
						class="h-6 w-6"
						fill="none"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path d="M6 6l12 12 M18 6L6 18" stroke-linecap="round" stroke-width="1.8" />
					</svg>
				{:else}
					<svg
						viewBox="0 0 24 24"
						class="h-6 w-6"
						fill="none"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path d="M4 7h16 M4 12h16 M4 17h16" stroke-linecap="round" stroke-width="1.8" />
					</svg>
				{/if}
			</button>
		</div>
	</nav>

	{#if menuOpen}
		<div
			id="menu-mobile"
			class="absolute inset-x-0 top-16 flex flex-col gap-1 border-b border-glass-border surface-level-1 px-6 py-4 md:hidden"
		>
			{#each navLinks as link (link.href)}
				<a
					href={link.href}
					class="rounded-base px-3 py-3 text-body-md font-medium text-on-surface-variant transition hover:bg-white/5 hover:text-on-surface"
					onclick={closeMenu}
				>
					{link.label}
				</a>
			{/each}

			<a
				href="#catalogo"
				class="mt-2 rounded-base border border-primary/50 bg-primary/10 px-3 py-3 text-center font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow"
				onclick={closeMenu}
			>
				Ver catálogo
			</a>
		</div>
	{/if}
</header>

<main>
	<section
		id="inicio"
		class="relative mt-12 flex scroll-mt-16 flex-col items-center justify-center gap-16 glass-border px-6 py-16"
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
						<img
							src={event.src}
							alt={event.alt}
							class="h-full w-full object-cover"
							loading="lazy"
						/>
						<span
							class="pointer-events-none absolute inset-x-2 bottom-2 rounded-base bg-black/45 px-2 py-1 font-mono text-xs tracking-wider text-on-surface uppercase opacity-0 backdrop-blur-sm transition group-hover:opacity-100"
						>
							{event.caption}
						</span>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section
		id="sobre-nosotros"
		class="relative flex scroll-mt-16 flex-col items-center justify-center gap-4 glass-border bg-surface-container-lowest p-12 px-6 py-24"
	>
		<h2 class="font-display text-headline-lg font-semibold text-on-surface">Sobre nosotros</h2>
		<p class="max-w-xl text-center text-body-md text-on-surface-variant">
			El Club de Rol Sansano reúne a narradoras, estrategas y guardianes de dados. Estos son algunos
			de sus integrantes.
		</p>

		<div class="mt-6 grid w-full max-w-2xl grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
			{#each members as member (member.name)}
				<div class="flex flex-col items-center gap-2 text-center">
					<img
						src={member.img}
						alt={`Avatar de ${member.name}`}
						class="bg-surface-level-2 aspect-square w-24 rounded-full border border-primary/40 object-cover sm:w-28"
						width="128"
						height="128"
						loading="lazy"
					/>
					<span class="font-display text-body-lg font-semibold text-on-surface">{member.name}</span>
					<span class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
						>{member.role}</span
					>
				</div>
			{/each}
		</div>
	</section>

	<section
		id="faq"
		class="flex scroll-mt-16 flex-col items-center justify-center gap-6 glass-border p-12 px-6 py-24"
	>
		<h2 class="font-display text-headline-lg font-semibold text-on-surface">
			Preguntas frecuentes
		</h2>

		<div class="mt-2 flex w-full max-w-2xl flex-col gap-3">
			{#each faqs as faq (faq.q)}
				<details
					class="group rounded-base border border-glass-border bg-surface-container-lowest transition hover:border-primary/40"
				>
					<summary
						class="flex cursor-pointer list-none items-center justify-between gap-4 rounded-base px-5 py-4 font-display text-body-lg font-semibold text-on-surface select-none [&::-webkit-details-marker]:hidden"
					>
						<span>{faq.q}</span>
						<svg
							viewBox="0 0 24 24"
							class="h-5 w-5 shrink-0 text-primary transition-transform group-open:rotate-45"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
							aria-hidden="true"
						>
							<path d="M12 5v14 M5 12h14" stroke-linecap="round" />
						</svg>
					</summary>
					<p class="px-5 pb-5 text-body-md text-on-surface-variant">{faq.a}</p>
				</details>
			{/each}
		</div>
	</section>

	<section
		id="redes"
		class="flex scroll-mt-16 flex-col items-center justify-center gap-4 glass-border bg-surface-container-lowest p-12 px-6 py-24"
	>
		<h2 class="font-display text-headline-lg font-semibold text-on-surface">Redes</h2>

		<div class="mt-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-5 max-sm:flex-col">
			{#each socials as social (social.name)}
				<a
					href={social.url}
					target="_blank"
					rel="noopener noreferrer"
					aria-label={social.name}
					class="flex items-center gap-3 text-on-surface-variant transition hover:text-on-surface"
				>
					<svg
						viewBox="0 0 24 24"
						class="h-6 w-6 text-primary"
						fill="currentColor"
						aria-hidden="true"
					>
						<path d={social.path} />
					</svg>
					<span class="font-mono text-label-md tracking-wider uppercase">{social.handle}</span>
				</a>
			{/each}
		</div>
	</section>

	<section
		id="catalogo"
		class="flex h-screen scroll-mt-16 flex-col items-center justify-center gap-4 glass-border"
	>
		<h2 class="font-display text-headline-lg font-semibold text-on-surface">Catálogo</h2>
	</section>
</main>

<footer class="flex items-center justify-center gap-4 glass-border surface-level-1 p-8">
	<span class="font-mono text-label-md text-on-surface-variant uppercase"
		>CdRS · Club de Rol Sansano</span
	>
</footer>
