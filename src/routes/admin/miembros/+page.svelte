<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import SectionPage from '$lib/components/admin/SectionPage.svelte';
	import SectionPlaceholder from '$lib/components/admin/SectionPlaceholder.svelte';
	import { moderacionRoute } from '$lib/data/admin';
	import { adminSession } from '$lib/stores/adminSession.svelte';

	type MembersTab = 'miembros' | 'sanciones';

	const role = $derived(adminSession.user.role);
	const canManageSanciones = $derived(role === 'directivo');
	const tab = $derived<MembersTab>(
		page.url.searchParams.get('tab') === 'sanciones' && canManageSanciones
			? 'sanciones'
			: 'miembros'
	);

	const tabClasses = (t: MembersTab) =>
		t === tab ? 'bg-tertiary/15 text-tertiary' : 'text-on-surface-variant hover:text-on-surface';

	$effect(() => {
		if (page.url.searchParams.get('tab') === 'sanciones' && !canManageSanciones) {
			goto(resolve('/admin/miembros'));
		}
	});
</script>

<SectionPage title="Miembros del Club">
	{#snippet actions()}
		{#if canManageSanciones}
			<div
				class="flex items-center rounded-base border border-glass-border bg-white/5 p-0.5"
				role="group"
				aria-label="Sub-secciones de Miembros"
			>
				<a
					href={resolve('/admin/miembros')}
					aria-current={tab === 'miembros' ? 'page' : undefined}
					class="rounded-base px-3 py-1.5 font-mono text-label-md tracking-wider uppercase transition {tabClasses(
						'miembros'
					)}"
				>
					Miembros
				</a>
				<a
					href={resolve(moderacionRoute)}
					aria-current={tab === 'sanciones' ? 'page' : undefined}
					class="rounded-base px-3 py-1.5 font-mono text-label-md tracking-wider uppercase transition {tabClasses(
						'sanciones'
					)}"
				>
					Sanciones
				</a>
			</div>
		{/if}
	{/snippet}

	{#if tab === 'sanciones'}
		<SectionPlaceholder
			description="Permisos y baneos de usuarios. Esta vista aún no tiene maqueta."
		/>
	{:else}
		<SectionPlaceholder
			description="Nómina de miembros y staff del club. Esta vista aún no tiene maqueta."
		/>
	{/if}
</SectionPage>
