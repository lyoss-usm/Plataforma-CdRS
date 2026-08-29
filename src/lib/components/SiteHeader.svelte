<script lang="ts">
	import { Menu, X } from '@lucide/svelte';

	const navLinks = [
		{ href: '#inicio', label: 'Inicio' },
		{ href: '#sobre-nosotros', label: 'Nosotros' },
		{ href: '#faq', label: 'FAQ' },
		{ href: '#redes', label: 'Redes' }
	];

	let menuOpen = $state(false);

	const closeMenu = () => (menuOpen = false);
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') closeMenu();
	}}
/>

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
				class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-base text-on-surface-variant transition hover:bg-white/5 hover:text-on-surface md:hidden"
				type="button"
				aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
				aria-expanded={menuOpen}
				aria-controls="menu-mobile"
				onclick={() => (menuOpen = !menuOpen)}
			>
				{#if menuOpen}
					<X class="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
				{:else}
					<Menu class="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
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
