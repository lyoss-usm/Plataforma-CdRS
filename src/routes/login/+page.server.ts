import { fail, redirect } from '@sveltejs/kit';
import { loginSchema } from '$lib/schemas';
import { destinoSeguro } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const prerender = false;

export const load: PageServerLoad = async ({ locals, url }) => {
	const {
		data: { user }
	} = await locals.supabase.auth.getUser();

	if (user) {
		redirect(303, destinoSeguro(url.searchParams.get('redirectTo')));
	}
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const formulario = await request.formData();
		const correo = String(formulario.get('correo') ?? '');
		const validacion = loginSchema.safeParse({
			correo,
			password: formulario.get('password') ?? ''
		});

		if (!validacion.success) {
			return fail(400, { correo, mensaje: 'Revisa el correo y la contraseña.' });
		}

		const { error } = await locals.supabase.auth.signInWithPassword({
			email: validacion.data.correo,
			password: validacion.data.password
		});

		if (error) {
			// Mismo mensaje para cualquier fallo: no revelar qué correos tienen cuenta.
			return fail(400, { correo, mensaje: 'Correo o contraseña incorrectos.' });
		}

		redirect(303, destinoSeguro(url.searchParams.get('redirectTo')));
	}
};
