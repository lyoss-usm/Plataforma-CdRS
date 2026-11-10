import type { IconName } from '$lib/icons';
import type { AdminRole } from '$lib/stores/adminSession.svelte';

export type AdminRoute =
	| '/admin'
	| '/admin/prestamos'
	| '/admin/solicitudes'
	| '/admin/inventario'
	| '/admin/miembros'
	| '/admin/miembros?tab=moderacion';

export const moderacionRoute: AdminRoute = '/admin/miembros?tab=moderacion';

export const roleMeta: Record<AdminRole, { label: string; badge: string }> = {
	junior: {
		label: 'Junior',
		badge: 'border-primary/40 bg-primary/10 text-primary'
	},
	senior: {
		label: 'Senior',
		badge: 'border-secondary/40 bg-secondary/10 text-secondary'
	},
	directivo: {
		label: 'Directivo',
		badge: 'border-tertiary/40 bg-tertiary/10 text-tertiary'
	}
};

export interface NavSlot {
	id: string;
	href: AdminRoute;
	label: string;
	icon: IconName;
}

export interface SidebarLink {
	id: string;
	href: AdminRoute;
	label: string;
	icon: IconName;
	roles: AdminRole[];
	children?: SidebarLink[];
}

export interface QuickAction {
	id: string;
	label: string;
	description: string;
	href: AdminRoute;
	icon: IconName;
	roles: AdminRole[];
}

// Préstamos = cajero de Juntas Masivas (wiki § 1.3). El préstamo general es la solicitud web (§ 1.2).
const prestamosSlot: NavSlot = {
	id: 'prestamos',
	href: '/admin/prestamos',
	label: 'Préstamos',
	icon: 'boxes'
};
const homeSlot: NavSlot = { id: 'home', href: '/admin', label: 'Home', icon: 'home' };
const solicitudesSlot: NavSlot = {
	id: 'solicitudes',
	href: '/admin/solicitudes',
	label: 'Solicitudes',
	icon: 'globe'
};
const miembrosSlot: NavSlot = {
	id: 'miembros',
	href: '/admin/miembros',
	label: 'Miembros',
	icon: 'users'
};

export const bottomSlotsByRole: Record<AdminRole, NavSlot[]> = {
	junior: [prestamosSlot, homeSlot, miembrosSlot],
	senior: [prestamosSlot, homeSlot, solicitudesSlot],
	directivo: [prestamosSlot, homeSlot, solicitudesSlot]
};

export const sidebarSections: { title: string; links: SidebarLink[] }[] = [
	{
		title: 'Principal',
		links: [
			{
				id: 'home',
				href: '/admin',
				label: 'Inicio',
				icon: 'home',
				roles: ['junior', 'senior', 'directivo']
			}
		]
	},
	{
		title: 'Operación',
		links: [
			{
				id: 'prestamos',
				href: '/admin/prestamos',
				label: 'Préstamos',
				icon: 'boxes',
				roles: ['junior', 'senior', 'directivo']
			},
			{
				id: 'solicitudes',
				href: '/admin/solicitudes',
				label: 'Solicitudes Web',
				icon: 'globe',
				roles: ['senior', 'directivo']
			}
		]
	},
	{
		title: 'Catálogo',
		links: [
			{
				id: 'inventario',
				href: '/admin/inventario',
				label: 'Inventario',
				icon: 'shapes',
				roles: ['senior', 'directivo']
			}
		]
	},
	{
		title: 'Equipo',
		links: [
			{
				id: 'miembros',
				href: '/admin/miembros',
				label: 'Miembros',
				icon: 'users',
				roles: ['junior', 'senior', 'directivo'],
				children: [
					{
						id: 'moderacion',
						href: moderacionRoute,
						label: 'Moderación',
						icon: 'shield-check',
						roles: ['directivo']
					}
				]
			}
		]
	}
];

export const quickActions: QuickAction[] = [
	{
		id: 'juntas',
		label: 'Juntas',
		description: 'Registro de préstamos en Juntas Masivas, con documento retenido',
		href: '/admin/prestamos',
		icon: 'boxes',
		roles: ['junior', 'senior', 'directivo']
	},
	{
		id: 'solicitudes',
		label: 'Solicitudes Web',
		description: 'Respuestas del formulario público de préstamo',
		href: '/admin/solicitudes',
		icon: 'globe',
		roles: ['senior', 'directivo']
	},
	{
		id: 'inventario',
		label: 'Inventario',
		description: 'Catálogo físico y juegos externos con dueño',
		href: '/admin/inventario',
		icon: 'shapes',
		roles: ['senior', 'directivo']
	},
	{
		id: 'miembros',
		label: 'Miembros del Club',
		description: 'Nómina de miembros y staff del club',
		href: '/admin/miembros',
		icon: 'users',
		roles: ['junior', 'senior', 'directivo']
	},
	{
		id: 'moderacion',
		label: 'Moderación',
		description: 'Permisos y baneos de usuarios',
		href: moderacionRoute,
		icon: 'shield-check',
		roles: ['directivo']
	}
];
