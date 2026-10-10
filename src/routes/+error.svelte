<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import type { IconName } from '$lib/icons';

	interface Contenido {
		icono: IconName;
		titulo: string;
		descripcion: string;
	}

	const contenido = $derived.by((): Contenido => {
		switch (page.status) {
			case 403:
				return {
					icono: 'shield-check',
					titulo: 'No tienes acceso a esta sección',
					descripcion:
						page.error?.message ??
						'Tu cuenta no tiene los permisos necesarios para ver esta página.'
				};
			case 404:
				return {
					icono: 'search',
					titulo: 'No encontramos esta página',
					descripcion: 'Puede que el enlace esté roto o que la página ya no exista.'
				};
			default:
				return {
					icono: 'circle-alert',
					titulo: 'Algo salió mal',
					descripcion:
						'Tuvimos un problema al cargar la página. Inténtalo de nuevo en unos minutos.'
				};
		}
	});

	const esAdmin = $derived(page.url.pathname.startsWith('/admin'));
</script>

<svelte:head>
	<title>{page.status} · CdRS</title>
</svelte:head>

<main
	class="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-on-background"
>
	<div
		class="flex w-full max-w-md flex-col items-center gap-5 rounded-base surface-level-2 border border-glass-border p-6 text-center sm:p-8"
	>
		<span
			class="flex h-14 w-14 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary"
		>
			<Icon name={contenido.icono} class="h-7 w-7" />
		</span>

		<div class="flex flex-col gap-2">
			<p class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase">
				Error {page.status}
			</p>
			<h1 class="font-display text-headline-md font-semibold tracking-tight text-on-surface">
				{contenido.titulo}
			</h1>
			<p class="text-body-md text-on-surface-variant">{contenido.descripcion}</p>
		</div>

		<div class="flex w-full flex-col gap-2.5">
			<a
				href={resolve('/')}
				class="flex items-center justify-center gap-2 rounded-base border border-glass-border px-5 py-2.5 font-medium text-on-surface transition hover:bg-white/5"
			>
				<Icon name="home" class="h-4 w-4" />
				Ir al inicio
			</a>

			{#if esAdmin && page.url.pathname !== '/admin'}
				<a
					href={resolve('/admin')}
					class="flex items-center justify-center gap-2 rounded-base border border-glass-border px-5 py-2.5 font-medium text-on-surface transition hover:bg-white/5"
				>
					<Icon name="chevron-left" class="h-4 w-4" />
					Volver al panel
				</a>
			{/if}

			{#if esAdmin && page.status === 403}
				<form method="POST" action="/logout">
					<button
						type="submit"
						class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-base border border-primary/50 bg-primary/10 px-5 py-2.5 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow"
					>
						Cambiar de cuenta
					</button>
				</form>
			{/if}
		</div>
	</div>
</main>
