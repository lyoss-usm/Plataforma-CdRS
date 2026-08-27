<script lang="ts">
	import LogoCoin from '$lib/components/LogoCoin.svelte';
</script>

<header class="sticky top-0 z-40 surface-level-1">
	<nav class="flex h-16 items-center justify-center glass-border">
		<span class="font-display text-headline-md font-semibold tracking-tight text-on-surface">
			Navegación
		</span>
	</nav>
</header>

<main>
	<section
		id="inicio"
		class="flex min-h-screen scroll-mt-16 items-center justify-center overflow-hidden glass-border"
	>
		<div class="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 lg:grid-cols-2 lg:px-12">
			<div class="flex flex-col items-start gap-6">
				<span class="font-mono text-label-md text-on-surface-variant uppercase"
					>Club de Rol Sansano</span
				>
				<h1 class="font-display text-headline-xl font-bold text-on-surface">
					La mesa de los que juegan
				</h1>
				<p class="max-w-md text-body-lg leading-relaxed text-on-surface-variant">
					Explora el catálogo de juegos de mesa del CdRS y solicita tu préstamo en segundos.
				</p>
				<div class="flex flex-wrap gap-4">
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

			<div class="relative mx-auto aspect-square w-full max-w-105">
				<div class="absolute inset-6 rounded-full"></div>
				<div class="absolute inset-0 p-6">
					<LogoCoin />
				</div>
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
