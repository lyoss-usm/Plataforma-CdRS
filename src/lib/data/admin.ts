import type { AdminRole } from '$lib/stores/adminSession.svelte';

export type LoanType = 'general' | 'junta';

export type AdminRoute =
	| '/admin'
	| '/admin/prestamos'
	| '/admin/prestamos?tipo=general'
	| '/admin/prestamos?tipo=junta'
	| '/admin/solicitudes'
	| '/admin/inventario'
	| '/admin/miembros'
	| '/admin/miembros?tab=sanciones';

export type LoanRoute = '/admin/prestamos?tipo=general' | '/admin/prestamos?tipo=junta';

export const loanRouteFor: Record<LoanType, LoanRoute> = {
	general: '/admin/prestamos?tipo=general',
	junta: '/admin/prestamos?tipo=junta'
};

export const moderacionRoute: AdminRoute = '/admin/miembros?tab=sanciones';

export const roleMeta: Record<
	AdminRole,
	{ label: string; defaultTipo: LoanType; allowed: LoanType[]; badge: string; switchActive: string }
> = {
	junior: {
		label: 'Junior',
		defaultTipo: 'junta',
		allowed: ['junta'],
		badge: 'border-primary/40 bg-primary/10 text-primary',
		switchActive: 'bg-primary/15 text-primary'
	},
	senior: {
		label: 'Senior',
		defaultTipo: 'general',
		allowed: ['general', 'junta'],
		badge: 'border-secondary/40 bg-secondary/10 text-secondary',
		switchActive: 'bg-secondary/15 text-secondary'
	},
	directivo: {
		label: 'Directivo',
		defaultTipo: 'general',
		allowed: ['general', 'junta'],
		badge: 'border-tertiary/40 bg-tertiary/10 text-tertiary',
		switchActive: 'bg-tertiary/15 text-tertiary'
	}
};

export const loanTypeMeta: Record<LoanType, { label: string }> = {
	general: { label: 'Generales' },
	junta: { label: 'Juntas' }
};

export const posIcon = 'M4 4h16v12H4zM8 8h8v2H8zM6 20h12';
export const homeIcon = 'M3 11.5 12 4l9 7.5M5 10v10h5v-7h4v7h5V10';
export const listIcon = 'M8 6h12M8 11h12M8 16h8M4 6h.01M4 11h.01M4 16h.01';
export const boxIcon = 'M12 2 21 7v10l-9 5-9-5V7l9-5zM3.5 7 12 12l8.5-5M12 12v10';
export const peopleIcon =
	'M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 20c0-3.3 2.7-6 6-6h6c3.3 0 6 2.7 6 6';
export const shieldIcon = 'M12 2 20 6v6c0 5.2-3.4 8.4-8 10-4.6-1.6-8-4.8-8-10V6l8-4zM9 12l2 2 4-4';

export interface NavSlot {
	id: string;
	href: AdminRoute;
	label: string;
	icon: string;
}

export interface SidebarLink {
	id: string;
	href: AdminRoute;
	label: string;
	icon: string;
	roles: AdminRole[];
	children?: SidebarLink[];
}

export interface QuickAction {
	id: string;
	label: string;
	description: string;
	href: AdminRoute;
	icon: string;
	roles: AdminRole[];
}

function loanSlotFor(role: AdminRole): NavSlot {
	return {
		id: 'prestamos',
		href: loanRouteFor[roleMeta[role].defaultTipo],
		label: 'Préstamos',
		icon: posIcon
	};
}

const homeSlot: NavSlot = { id: 'home', href: '/admin', label: 'Home', icon: homeIcon };
const solicitudesSlot: NavSlot = {
	id: 'solicitudes',
	href: '/admin/solicitudes',
	label: 'Solicitudes',
	icon: listIcon
};
const miembrosSlot: NavSlot = {
	id: 'miembros',
	href: '/admin/miembros',
	label: 'Miembros',
	icon: peopleIcon
};

export const bottomSlotsByRole: Record<AdminRole, NavSlot[]> = {
	junior: [loanSlotFor('junior'), homeSlot, miembrosSlot],
	senior: [loanSlotFor('senior'), homeSlot, solicitudesSlot],
	directivo: [loanSlotFor('directivo'), homeSlot, solicitudesSlot]
};

export const sidebarSections: { title: string; links: SidebarLink[] }[] = [
	{
		title: 'Principal',
		links: [
			{
				id: 'home',
				href: '/admin',
				label: 'Inicio',
				icon: homeIcon,
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
				icon: posIcon,
				roles: ['junior', 'senior', 'directivo']
			},
			{
				id: 'solicitudes',
				href: '/admin/solicitudes',
				label: 'Solicitudes Web',
				icon: listIcon,
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
				icon: boxIcon,
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
				icon: peopleIcon,
				roles: ['junior', 'senior', 'directivo'],
				children: [
					{
						id: 'sanciones',
						href: moderacionRoute,
						label: 'Sanciones',
						icon: shieldIcon,
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
		description: 'Registro de préstamos en Juntas Masivas',
		href: loanRouteFor.junta,
		icon: 'M7 3v4M17 3v4M4 7h16v13H4zM4 11h16',
		roles: ['junior', 'senior', 'directivo']
	},
	{
		id: 'prestamos-generales',
		label: 'Préstamos Generales',
		description: 'Préstamos externos e internos fuera de junta',
		href: loanRouteFor.general,
		icon: posIcon,
		roles: ['senior', 'directivo']
	},
	{
		id: 'solicitudes',
		label: 'Solicitudes Web',
		description: 'Respuestas del formulario público de préstamo',
		href: '/admin/solicitudes',
		icon: 'M12 3v10m0 0 4-4m-4 4-4-4M4 13v7h16v-7',
		roles: ['senior', 'directivo']
	},
	{
		id: 'inventario',
		label: 'Inventario',
		description: 'Catálogo físico y juegos externos con dueño',
		href: '/admin/inventario',
		icon: boxIcon,
		roles: ['senior', 'directivo']
	},
	{
		id: 'miembros',
		label: 'Miembros del Club',
		description: 'Nómina de miembros y staff del club',
		href: '/admin/miembros',
		icon: peopleIcon,
		roles: ['junior', 'senior', 'directivo']
	},
	{
		id: 'moderacion',
		label: 'Moderación',
		description: 'Permisos y baneos de usuarios',
		href: moderacionRoute,
		icon: shieldIcon,
		roles: ['directivo']
	}
];
