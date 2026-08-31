export type AdminRole = 'junior' | 'senior' | 'directivo';

export interface AdminUser {
	name: string;
	avatar: string;
	role: AdminRole;
}

const previewUsers: Record<AdminRole, Omit<AdminUser, 'role'>> = {
	junior: { name: 'Valentina Rojas', avatar: '/avatares/women-29.jpg' },
	senior: { name: 'Manuel Pizarro', avatar: '/avatares/men-32.jpg' },
	directivo: { name: 'Camila Vergara', avatar: '/avatares/women-68.jpg' }
};

class AdminSession {
	user = $state<AdminUser>({
		name: previewUsers.senior.name,
		avatar: previewUsers.senior.avatar,
		role: 'senior'
	});

	switchRole(role: AdminRole) {
		this.user = { role, ...previewUsers[role] };
	}
}

export const adminSession = new AdminSession();
