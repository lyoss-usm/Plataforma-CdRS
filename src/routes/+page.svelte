<script lang="ts">
	import LogoCoin from '$lib/components/LogoCoin.svelte';
	import StarField from '$lib/components/StarField.svelte';

	const navLinks = [
		{ href: '#inicio', label: 'Inicio' },
		{ href: '#sobre-nosotros', label: 'Nosotros' },
		{ href: '#faq', label: 'FAQ' },
		{ href: '#redes', label: 'Redes' }
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
				class="font-display text-headline-md font-semibold tracking-tight text-on-surface max-sm:text-xl"
			>
				CdRS
			</span>
		</a>

		<div class="hidden items-center gap-8 md:flex">
			{#each navLinks as link (link.href)}
				<a
					href={link.href}
					class="font-mono text-label-md tracking-[0.05em] text-on-surface-variant uppercase transition hover:text-on-surface"
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
		class="relative flex h-screen scroll-mt-16 items-center justify-center overflow-hidden glass-border"
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
			<span class="text-label-lg font-mono tracking-[0.05em] text-on-surface-variant uppercase"
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

			<div class="flex flex-wrap justify-center gap-4">
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
	</section>

	<section
		id="sobre-nosotros"
		class="flex h-screen scroll-mt-16 flex-col items-center justify-center gap-4 glass-border bg-surface-container-lowest"
	>
		<span class="font-mono text-label-md text-on-surface-variant uppercase">01 · Nosotros</span>
		<h2 class="font-display text-headline-lg font-semibold text-on-surface">Sobre nosotros</h2>
	</section>

	<section
		id="faq"
		class="flex h-screen scroll-mt-16 flex-col items-center justify-center gap-4 glass-border"
	>
		<span class="font-mono text-label-md text-on-surface-variant uppercase">02 · Dudas</span>
		<h2 class="font-display text-headline-lg font-semibold text-on-surface">FAQ</h2>
	</section>

	<section
		id="redes"
		class="flex h-screen scroll-mt-16 flex-col items-center justify-center gap-4 glass-border bg-surface-container-lowest"
	>
		<span class="font-mono text-label-md text-on-surface-variant uppercase">03 · Comunidad</span>
		<h2 class="font-display text-headline-lg font-semibold text-on-surface">Redes</h2>
	</section>

	<section
		id="catalogo"
		class="flex h-screen scroll-mt-16 flex-col items-center justify-center gap-4 glass-border"
	>
		<span class="font-mono text-label-md text-on-surface-variant uppercase">04 · Acción</span>
		<h2 class="font-display text-headline-lg font-semibold text-on-surface">Catálogo</h2>
	</section>
</main>

<footer class="flex items-center justify-center gap-4 glass-border surface-level-1 p-8">
	<span class="font-mono text-label-md text-on-surface-variant uppercase"
		>CdRS · Club de Rol Sansano</span
	>
</footer>
