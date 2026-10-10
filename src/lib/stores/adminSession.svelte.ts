export type AdminRole = 'junior' | 'senior' | 'directivo';

export interface AdminUser {
	name: string;
	avatar: string;
	role: AdminRole;
}

const avatarPorDefecto = '/logos/logo.webp';

class AdminSession {
	// Valor inicial mínimo: el layout de /admin lo reemplaza con el staff real antes de renderizar.
	user = $state<AdminUser>({ name: '', avatar: avatarPorDefecto, role: 'junior' });

	/** Fija el staff autenticado (lo llama el layout de /admin con los datos del guard). */
	iniciar(staff: { nombre: string; rol: AdminRole }) {
		this.user = { name: staff.nombre, avatar: avatarPorDefecto, role: staff.rol };
	}
}

export const adminSession = new AdminSession();
