import { env } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';

/**
 * Único uso de la service role en la app: enviar el correo de invitación de Supabase Auth, que no
 * tiene equivalente sin ella mientras el registro esté cerrado (`enable_signup = false`).
 *
 * Llamar **solo** después de que `invitar_staff()` (con la sesión del Directivo, validada por la
 * DB) devolvió `'invitar'`: la decisión de quién entra al staff la toma la base de datos.
 */
export async function enviarInvitacion(correo: string, redirectTo: string) {
	const url = env.SUPABASE_URL;
	const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

	if (!url || !serviceRoleKey) {
		throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
	}

	const admin = createClient(url, serviceRoleKey, {
		auth: { persistSession: false, autoRefreshToken: false }
	});

	return admin.auth.admin.inviteUserByEmail(correo, { redirectTo });
}
