<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import type { IconName } from '$lib/icons';
	import {
		bottomSlotsByRole,
		roleMeta,
		sidebarSections,
		type AdminRoute,
		type SidebarLink
	} from '$lib/data/admin';
	import { adminSession, type AdminRole } from '$lib/stores/adminSession.svelte';

	const roles: AdminRole[] = ['junior', 'senior', 'directivo'];

	let { children } = $props();

	const role = $derived(adminSession.user.role);
	const bottomSlots = $derived(bottomSlotsByRole[role]);

	const visibleSections = $derived(
		sidebarSections
			.map((section) => ({
				...section,
				links: section.links
					.filter((link) => link.roles.includes(role))
					.map((link) => ({
						...link,
						children: (link.children ?? []).filter((child) => child.roles.includes(role))
					}))
			}))
			.filter((section) => section.links.length > 0)
	);

	const activeId = $derived.by(() => {
		const path = page.url.pathname;
		if (path.startsWith('/admin/miembros')) {
			return page.url.searchParams.get('tab') === 'sanciones' ? 'sanciones' : 'miembros';
		}
		if (path.startsWith('/admin/solicitudes')) return 'solicitudes';
		if (path.startsWith('/admin/inventario')) return 'inventario';
		if (path.startsWith('/admin/prestamos')) return 'prestamos';
		if (path === '/admin') return 'home';
		return '';
	});

	const prestamosIcon = $derived(
		page.url.searchParams.get('tipo') === 'junta' ? 'boxes' : ('box' as IconName)
	);

	const isActive = (id: string) =>
		id === activeId || (id === 'miembros' && activeId === 'sanciones');

	const linkClasses = (id: string) =>
		isActive(id)
			? 'bg-primary/10 text-primary'
			: 'text-on-surface-variant hover:bg-white/5 hover:text-on-surface';

	const iconClasses = (id: string) =>
		isActive(id) ? 'text-primary' : 'text-on-surface-variant/70';

	$effect(() => {
		if (page.url.pathname !== '/admin/prestamos') return;
		const tipo = page.url.searchParams.get('tipo');
		const meta = roleMeta[role];
		const current: string | null = tipo === 'general' || tipo === 'junta' ? tipo : null;
		const target =
			current && meta.allowed.includes(current as 'general' | 'junta') ? null : meta.defaultTipo;
		if (target) goto(resolve(loanRouteHref(target)));
	});

	function loanRouteHref(tipo: 'general' | 'junta'): AdminRoute {
		return `/admin/prestamos?tipo=${tipo}` as AdminRoute;
	}

	function childOf(parent: SidebarLink) {
		return parent.children ?? [];
	}

	const switchClasses = (r: AdminRole) =>
		r === role ? roleMeta[r].switchActive : 'text-on-surface-variant hover:text-on-surface';
</script>

<div class="min-h-screen bg-background text-on-background">
	<header class="fixed top-0 z-40 h-16 w-full border-b border-glass-border surface-level-1">
		<div class="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
			<a href={resolve('/admin')} class="flex min-w-0 items-center gap-3">
				<img
					src="/logos/logo.webp"
					alt="Logo del Club de Rol Sansano"
					class="h-9 w-9 shrink-0 rounded-full object-cover"
					width="36"
					height="36"
				/>
				<span
					class="hidden truncate font-display text-lg font-semibold tracking-tight text-on-surface sm:block"
					>Panel CdRS</span
				>
			</a>

			<div class="flex items-center gap-3">
				<div
					class="flex items-center rounded-base border border-glass-border bg-white/5 p-0.5"
					role="group"
					aria-label="Cambiar rol de vista previa"
				>
					{#each roles as currentRole (currentRole)}
						<button
							type="button"
							aria-pressed={role === currentRole}
							onclick={() => adminSession.switchRole(currentRole)}
							class="rounded-base px-2.5 py-1 font-mono text-[11px] tracking-wider uppercase transition {switchClasses(
								currentRole
							)}"
						>
							{roleMeta[currentRole].label}
						</button>
					{/each}
				</div>

				<div class="flex items-center gap-2.5">
					<img
						src={adminSession.user.avatar}
						alt={`Avatar de ${adminSession.user.name}`}
						class="h-9 w-9 rounded-full border border-glass-border object-cover"
						width="36"
						height="36"
					/>
					<div class="hidden leading-tight sm:block">
						<p class="text-body-md font-medium text-on-surface">{adminSession.user.name}</p>
						<span
							class={`inline-block rounded-full border px-2 py-0.5 font-mono text-xs tracking-wider uppercase ${roleMeta[role].badge}`}
						>
							{roleMeta[role].label}
						</span>
					</div>
				</div>
			</div>
		</div>
	</header>

	<aside
		class="fixed top-16 bottom-0 left-0 z-30 hidden w-64 flex-col gap-6 overflow-y-auto border-r border-glass-border surface-level-1 px-4 py-6 md:flex"
		aria-label="Navegación administrativa"
	>
		<nav class="flex flex-col gap-6">
			{#each visibleSections as section (section.title)}
				<div class="flex flex-col gap-1">
					<span
						class="px-3 pb-2 font-mono text-label-md tracking-wider text-on-surface-variant/60 uppercase"
						>{section.title}</span
					>
					{#each section.links as link (link.id)}
						<a
							href={resolve(link.href)}
							aria-current={isActive(link.id) ? 'page' : undefined}
							class="group flex items-center gap-3 rounded-base px-3 py-2.5 text-body-md font-medium transition {linkClasses(
								link.id
							)}"
						>
							<Icon
								name={link.id === 'prestamos' ? prestamosIcon : link.icon}
								class="h-5 w-5 shrink-0 transition {iconClasses(link.id)}"
							/>
							<span class="truncate">{link.label}</span>
						</a>
						{#each childOf(link) as child (child.id)}
							<a
								href={resolve(child.href)}
								aria-current={isActive(child.id) ? 'page' : undefined}
								class="group flex items-center gap-3 rounded-base py-2 pr-3 pl-10 text-body-md font-medium transition {linkClasses(
									child.id
								)}"
							>
								<Icon
									name={child.icon}
									class="h-4 w-4 shrink-0 transition {iconClasses(child.id)}"
								/>
								<span class="truncate">{child.label}</span>
							</a>
						{/each}
					{/each}
				</div>
			{/each}
		</nav>
	</aside>

	<main class="pt-16 pb-20 md:pb-0 md:pl-64">
		{@render children()}
	</main>

	<nav
		class="fixed inset-x-0 bottom-0 z-40 h-16 border-t border-glass-border surface-level-1 md:hidden"
		aria-label="Navegación principal"
	>
		<div class="mx-auto grid h-16 max-w-md grid-cols-3">
			{#each bottomSlots as slot (slot.id)}
				<a
					href={resolve(slot.href)}
					aria-current={isActive(slot.id) ? 'page' : undefined}
					class={`flex flex-col items-center justify-center gap-0.5 transition ${isActive(slot.id) ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
				>
					<Icon class="h-6 w-6" name={slot.id === 'prestamos' ? prestamosIcon : slot.icon} />
					<span class="font-mono text-[10px] tracking-wider uppercase">{slot.label}</span>
				</a>
			{/each}
		</div>
	</nav>
</div>
