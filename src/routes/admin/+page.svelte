<script lang="ts">
	import { resolve } from '$app/paths';
	import { quickActions } from '$lib/data/admin';
	import { adminSession } from '$lib/stores/adminSession.svelte';

	const role = $derived(adminSession.user.role);
	const actions = $derived(quickActions.filter((action) => action.roles.includes(role)));
	const showsDataPanels = $derived(role === 'directivo');
</script>

<div class="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
	<header class="flex flex-col gap-1">
		<h1 class="font-display text-headline-lg font-semibold tracking-tight text-on-surface">
			Hola, {adminSession.user.name}
		</h1>
		<p class="text-body-md text-on-surface-variant">¿Qué vamos a registrar hoy?</p>
	</header>

	<section class="mt-8">
		<h2 class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase">
			Accesos rápidos
		</h2>
		<div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each actions as action (action.id)}
				<a
					href={resolve(action.href)}
					class="group flex flex-col gap-2 rounded-base surface-level-2 border border-glass-border p-5 transition hover:scale-[1.02] hover:ice-glow"
				>
					<svg
						viewBox="0 0 24 24"
						class="h-6 w-6 text-primary transition"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d={action.icon} />
					</svg>
					<span class="font-display text-body-lg font-semibold text-on-surface">{action.label}</span
					>
					<span class="text-body-md text-on-surface-variant">{action.description}</span>
				</a>
			{/each}
		</div>
	</section>

	{#if showsDataPanels}
		<section class="mt-10">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 class="font-display text-headline-md font-semibold tracking-tight text-on-surface">
					Datos
				</h2>
				<button
					type="button"
					class="flex items-center gap-2 rounded-base border border-primary/50 bg-primary/10 px-4 py-2 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow"
				>
					<svg
						viewBox="0 0 24 24"
						class="h-5 w-5"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="M12 3v11m0 0 4-4m-4 4-4-4M4 20h16" />
					</svg>
					Exportar
				</button>
			</div>

			<div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				{#each [1, 2, 3, 4] as metric (metric)}
					<div
						class="flex flex-col gap-3 rounded-base border border-dashed border-outline-variant p-5"
					>
						<div class="h-2.5 w-1/2 rounded-full bg-white/10"></div>
						<div class="flex h-20 items-end gap-1.5" aria-hidden="true">
							{#each [40, 65, 50, 80, 60, 90, 70] as bar (bar)}
								<div class="h-full w-full rounded-sm bg-white/5" style={`height: ${bar}%`}></div>
							{/each}
						</div>
						<span
							class="self-start rounded-full border border-glass-border bg-white/5 px-3 py-1 font-mono text-xs tracking-wider text-on-surface-variant uppercase"
						>
							Por definir
						</span>
					</div>
				{/each}
			</div>
		</section>
	{/if}
</div>
