<script lang="ts">
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
</script>

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

	<img
		src="/rolo/rolo_saludando.webp"
		alt="Rolo saludando a los integrantes del club"
		class="pointer-events-none absolute right-0 bottom-2 z-10 hidden w-44 -scale-x-100 drop-shadow-lg select-none md:block lg:w-52"
		loading="lazy"
		width="400"
		height="400"
	/>
</section>
