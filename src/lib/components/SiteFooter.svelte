<script lang="ts">
	const navLinks = [
		{ href: '#inicio', label: 'Inicio' },
		{ href: '#sobre-nosotros', label: 'Nosotros' },
		{ href: '#faq', label: 'FAQ' },
		{ href: '#redes', label: 'Redes' }
	];

	const socials = [
		{
			name: 'Instagram',
			handle: '@clubderol_sansano',
			url: 'https://www.instagram.com/clubderol_sansano?igshid=YmMyMTA2M2Y%3D',
			path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92C2.165 15.6 2.153 15.221 2.153 12c0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069Zm0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12s.014 3.668.072 4.948c.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24s3.668-.014 4.948-.072c4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948s-.014-3.667-.072-4.947c-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0Zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881Z'
		},
		{
			name: 'WhatsApp',
			handle: 'Club de Rol Sansano 🦑🧙🏼‍♂️🎲',
			url: 'https://chat.whatsapp.com/LReSEEVJTfJARGi2V7gXfr',
			path: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z'
		},
		{
			name: 'Discord',
			handle: 'discord.gg/cdrs',
			url: 'https://discord.com/invite/9xJnxph',
			path: 'M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .079.01c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.363 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028ZM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z'
		},
		{
			name: 'Correo',
			handle: 'hola@cdrs.cl',
			url: 'mailto:hola@cdrs.cl',
			path: 'M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5-8-5V6l8 5 8-5v2Z'
		}
	];
</script>

<footer id="redes" class="scroll-mt-16 border-t border-glass-border surface-level-1">
	<div class="mx-auto max-w-6xl px-6 py-16">
		<div class="grid gap-10 md:grid-cols-3">
			<div class="flex flex-col items-start gap-3">
				<a href="#inicio" class="flex items-center gap-3" aria-label="Ir al inicio">
					<img
						src="/logos/logo.webp"
						alt="Logo del Club de Rol Sansano"
						class="h-9 w-9 rounded-full object-cover"
						width="36"
						height="36"
					/>
					<span class="font-display text-headline-md font-semibold tracking-tight text-on-surface"
						>Club de Rol Sansano</span
					>
				</a>
				<p class="max-w-xs text-body-md text-on-surface-variant">
					El club de rol del sur: dados, historias y buenas juntas.
				</p>
			</div>

			<nav class="flex flex-col gap-2">
				<span class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
					>Navegación</span
				>
				{#each navLinks as link (link.href)}
					<a
						href={link.href}
						class="text-body-md text-on-surface-variant transition hover:text-on-surface"
					>
						{link.label}
					</a>
				{/each}
			</nav>

			<div class="flex flex-col gap-2">
				<span class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
					>Redes</span
				>
				{#each socials as social (social.name)}
					<a
						href={social.url}
						target="_blank"
						rel="noopener noreferrer"
						aria-label={social.name}
						class="group flex items-center gap-3 text-on-surface-variant transition hover:text-primary"
					>
						<svg
							viewBox="0 0 24 24"
							class="h-5 w-5 text-primary"
							fill="currentColor"
							aria-hidden="true"
						>
							<path d={social.path} />
						</svg>
						<span class="font-mono text-label-md tracking-wider uppercase">{social.handle}</span>
					</a>
				{/each}
			</div>
		</div>

		<div
			class="mt-12 flex flex-col items-center justify-between gap-2 border-t border-glass-border pt-6 sm:flex-row"
		>
			<span class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
				>© {new Date().getFullYear()} · Club de Rol Sansano</span
			>
			<div
				class="flex flex-wrap items-center justify-end gap-x-2 font-mono text-label-md tracking-wider uppercase"
			>
				<span class="text-on-surface-variant">Hecho por</span>
				<a class="font-semibold text-primary" href="https://www.lyoss.org/">
					Linux y OpenSource USM
					<span class="text-on-surface-variant">🐧</span>
				</a>
			</div>
		</div>
	</div>
</footer>
