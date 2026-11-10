import { fail, redirect } from '@sveltejs/kit';
import { definirClaveSchema } from '$lib/schemas';
import type { Actions, PageServerLoad } from './$types';

export const prerender = false;

const sinErrores: Record<string, string> = {};

/** Acepta la invitación del staff (wiki § 3.2): verifica el enlace y pide la contraseña. */
export const load: PageServerLoad = async ({ locals, url }) => {
	const tokenHash = url.searchParams.get('token_hash');

	if (tokenHash && url.searchParams.get('type') === 'invite') {
		const { error } = await locals.supabase.auth.verifyOtp({
			type: 'invite',
			token_hash: tokenHash
		});

		// La sesión queda en cookies; se limpia el token de la URL.
		redirect(303, error ? '/auth/confirmar?error=1' : '/auth/confirmar');
	}

	const {
		data: { user }
	} = await locals.supabase.auth.getUser();

	return {
		sesionLista: user !== null,
		enlaceInvalido: url.searchParams.has('error') || user === null
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();

		if (!user) {
			return fail(401, {
				mensaje: 'El enlace expiró. Pide una nueva invitación.',
				errores: sinErrores
			});
		}

		const formulario = await request.formData();
		const validacion = definirClaveSchema.safeParse({
			password: String(formulario.get('password') ?? ''),
			confirmacion: String(formulario.get('confirmacion') ?? '')
		});

		if (!validacion.success) {
			const errores: Record<string, string> = {};
			for (const issue of validacion.error.issues) {
				const campo = String(issue.path[0] ?? 'password');
				errores[campo] ??= issue.message;
			}

			return fail(400, { mensaje: 'Revisa la contraseña.', errores });
		}

		const { error } = await locals.supabase.auth.updateUser({
			password: validacion.data.password
		});

		if (error) {
			console.error('confirmar: no se pudo definir la contraseña:', error);
			return fail(400, {
				mensaje: 'No pudimos guardar tu contraseña. Intenta de nuevo.',
				errores: sinErrores
			});
		}

		// /admin vincula la cuenta con el Sansano por correo en el primer ingreso.
		redirect(303, '/admin');
	}
};
