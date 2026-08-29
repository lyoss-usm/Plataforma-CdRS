import type { IconName } from '$lib/icons';
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

function loanSlotFor(role: AdminRole): NavSlot {
	return {
		id: 'prestamos',
		href: loanRouteFor[roleMeta[role].defaultTipo],
		label: 'Préstamos',
		icon: 'box'
	};
}

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
				icon: 'box',
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
						id: 'sanciones',
						href: moderacionRoute,
						label: 'Sanciones',
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
		description: 'Registro de préstamos en Juntas Masivas',
		href: loanRouteFor.junta,
		icon: 'boxes',
		roles: ['junior', 'senior', 'directivo']
	},
	{
		id: 'prestamos-generales',
		label: 'Préstamos Generales',
		description: 'Préstamos externos e internos fuera de junta',
		href: loanRouteFor.general,
		icon: 'box',
		roles: ['senior', 'directivo']
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
