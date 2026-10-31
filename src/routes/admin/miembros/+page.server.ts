import { fail, redirect } from '@sveltejs/kit';
import type { z } from 'zod';
import {
	STAFF_PAGE_SIZE,
	editarStaffSchema,
	invitarStaffSchema,
	rutStaffSchema,
	staffFilaSchema,
	staffQuerySchema,
	type StaffFila
} from '$lib/schemas';
import { parsearRol } from '$lib/schemas';
import { enviarInvitacion } from '$lib/server/supabaseAdmin';
import type { Actions, PageServerLoad } from './$types';

export const prerender = false;

type Accion = 'invitar' | 'editar' | 'baja' | 'eliminar';
type Errores = Record<string, string>;

const SIN_PERMISO = 'Solo el Directivo puede gestionar al staff.';

function numero(valor: FormDataEntryValue | null): number | undefined {
	const texto = String(valor ?? '').trim();
	if (!texto) return undefined;

	const convertido = Number(texto);

	return Number.isFinite(convertido) ? convertido : undefined;
}

function texto(valor: FormDataEntryValue | null): string {
	return String(valor ?? '').trim();
}

/** Errores de zod → `{ campo: mensaje }` para pintarlos junto a cada input. */
function erroresPorCampo(error: z.ZodError): Errores {
	const errores: Errores = {};

	for (const issue of error.issues) {
		const ruta = issue.path.at(-1);
		const campo = typeof ruta === 'string' ? ruta : 'general';
		errores[campo] ??= issue.message;
	}

	return errores;
}

function rechazo(accion: Accion, mensaje: string, estado = 400, errores: Errores = {}) {
	return fail(estado, { accion, ok: false as const, mensaje, errores });
}

function exito(accion: Accion, mensaje: string) {
	return { accion, ok: true as const, mensaje, errores: {} as Errores };
}

function puedeGestionar(locals: App.Locals): boolean {
	return locals.staff?.permisos.includes('usuarios:gestionar') ?? false;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const gestiona = puedeGestionar(locals);
	const vacio = {
		staffPage: { filas: [] as StaffFila[], total: 0 },
		cargos: [] as { idCargo: number; nombreCargo: string }[],
		permisosPorCargo: {} as Record<number, string[]>,
		filtros: { busqueda: '', idCargo: null as number | null, pagina: 1 },
		puedeGestionar: gestiona,
		errorCarga: null as string | null
	};

	// La pestaña de moderación tiene su propio panel; no necesita la nómina.
	if (url.searchParams.get('tab') === 'moderacion') return vacio;

	const consulta = staffQuerySchema.safeParse({
		busqueda: url.searchParams.get('q') ?? undefined,
		idCargo: numero(url.searchParams.get('cargo')),
		pagina: numero(url.searchParams.get('pagina'))
	});
	const filtros = consulta.success ? consulta.data : staffQuerySchema.parse({});

	try {
		const [nomina, cargos, permisos, cargoPermisos] = await Promise.all([
			locals.supabase.rpc('buscar_staff', {
				p_busqueda: filtros.busqueda,
				p_id_cargo: filtros.idCargo,
				p_offset: (filtros.pagina - 1) * STAFF_PAGE_SIZE,
				p_limit: STAFF_PAGE_SIZE
			}),
			locals.supabase.from('Cargo').select('idCargo, nombreCargo').order('idCargo'),
			locals.supabase.from('Permiso').select('idPermiso, nombrePermiso'),
			locals.supabase.from('CargoPermiso').select('idCargo, idPermiso')
		]);

		for (const respuesta of [nomina, cargos, permisos, cargoPermisos]) {
			if (respuesta.error) throw new Error(respuesta.error.message);
		}

		const filas = (nomina.data ?? []) as Array<Record<string, unknown>>;

		// Quedó fuera de rango (p. ej. se eliminó el último de la última página).
		if (filas.length === 0 && filtros.pagina > 1) {
			const destino = new URL(url);
			destino.searchParams.delete('pagina');
			redirect(303, destino.pathname + destino.search);
		}

		const nombrePorPermiso = new Map(
			(permisos.data ?? []).map((p) => [p.idPermiso, p.nombrePermiso])
		);
		const permisosPorCargo: Record<number, string[]> = {};
		for (const { idCargo, idPermiso } of cargoPermisos.data ?? []) {
			const nombre = nombrePorPermiso.get(idPermiso);
			if (nombre) (permisosPorCargo[idCargo] ??= []).push(nombre);
		}

		return {
			...vacio,
			staffPage: {
				filas: filas.map((fila) => staffFilaSchema.parse(fila)),
				total: Number(filas[0]?.total ?? 0)
			},
			cargos: cargos.data ?? [],
			permisosPorCargo,
			filtros
		};
	} catch (error) {
		// `redirect` lanza un objeto especial de SvelteKit: se deja pasar.
		if (typeof error === 'object' && error !== null && 'location' in error) throw error;

		console.error('No se pudo cargar la nómina de staff:', error);

		return { ...vacio, filtros, errorCarga: 'No pudimos cargar la nómina en este momento.' };
	}
};

export const actions: Actions = {
	invitar: async ({ request, locals, url }) => {
		if (!puedeGestionar(locals)) return rechazo('invitar', SIN_PERMISO, 403);

		const f = await request.formData();
		const rut = numero(f.get('rutSansano'));
		const rolTexto = texto(f.get('rolSansano'));
		const rol = parsearRol(rolTexto) ?? undefined;
		const quiereAlta = [rut, rolTexto, texto(f.get('nombreSansano'))].some(
			(v) => v !== undefined && v !== ''
		);
		const validacion = invitarStaffSchema.safeParse({
			correoInstitucional: texto(f.get('correoInstitucional')),
			idCargo: numero(f.get('idCargo')),
			datos: quiereAlta
				? {
						rutSansano: rut,
						digitoVerificador: numero(f.get('digitoVerificador')),
						rolSansano: rol,
						nombreSansano: texto(f.get('nombreSansano')),
						telefono: numero(f.get('telefono'))
					}
				: undefined
		});

		if (!validacion.success) {
			return rechazo(
				'invitar',
				'Revisa los campos marcados.',
				400,
				erroresPorCampo(validacion.error)
			);
		}

		const { correoInstitucional: correo, idCargo, datos } = validacion.data;

		// La DB decide (permiso, cuenta activa, alta o asignación de cargo) con la sesión del Directivo.
		const { data: resultado, error } = await locals.supabase.rpc('invitar_staff', {
			p_correo: correo,
			p_id_cargo: idCargo,
			p_rut: datos?.rutSansano ?? null,
			p_digito_verificador: datos?.digitoVerificador ?? null,
			p_rol: datos?.rolSansano ?? null,
			p_nombre: datos?.nombreSansano ?? null,
			p_telefono: datos?.telefono ?? null
		});

		if (error) {
			switch (error.code) {
				case '42501':
					return rechazo('invitar', SIN_PERMISO, 403);
				case 'CS001':
					return rechazo(
						'invitar',
						'Esa persona ya tiene una cuenta activa en el staff. Reasigna su cargo desde su ficha.',
						409,
						{ correoInstitucional: 'El correo ya pertenece a una cuenta activa.' }
					);
				case 'CS002':
					return rechazo(
						'invitar',
						'Ese correo no está registrado: completa los datos del sansano.',
						400,
						{ datos: 'Ingresa RUT, ROL, nombre y teléfono.' }
					);
				case '23505':
					return rechazo('invitar', 'Ya existe un sansano con ese RUT, ROL o teléfono.', 409);
				default:
					console.error('invitar: la DB rechazó la invitación:', error);
					return rechazo('invitar', 'No pudimos registrar la invitación.', 500);
			}
		}

		if (resultado === 'activo') {
			return exito('invitar', 'Cargo asignado. Esa persona ya tiene cuenta y accede de inmediato.');
		}

		const { error: errorEnvio } = await enviarInvitacion(correo, `${url.origin}/auth/confirmar`);

		if (errorEnvio) {
			if (errorEnvio.code === 'email_exists') {
				return exito(
					'invitar',
					'Cargo asignado. El correo ya tiene cuenta y se vinculará en su próximo ingreso.'
				);
			}

			console.error('invitar: falló el envío de la invitación:', errorEnvio);
			return rechazo(
				'invitar',
				'Quedó registrado como pendiente, pero no pudimos enviar el correo. Reintenta la invitación.',
				502
			);
		}

		return exito('invitar', `Invitación enviada a ${correo}.`);
	},

	editar: async ({ request, locals }) => {
		if (!puedeGestionar(locals)) return rechazo('editar', SIN_PERMISO, 403);

		const f = await request.formData();
		const validacion = editarStaffSchema.safeParse({
			rutSansano: numero(f.get('rutSansano')),
			nombreSansano: texto(f.get('nombreSansano')),
			telefono: numero(f.get('telefono')),
			correoInstitucional: texto(f.get('correoInstitucional')),
			idCargo: numero(f.get('idCargo'))
		});

		if (!validacion.success) {
			return rechazo(
				'editar',
				'Revisa los campos marcados.',
				400,
				erroresPorCampo(validacion.error)
			);
		}

		const { rutSansano, ...cambios } = validacion.data;

		const { data, error } = await locals.supabase
			.from('Sansano')
			.update(cambios)
			.eq('rutSansano', rutSansano)
			.select('rutSansano');

		if (error) {
			if (error.code === 'CS004') {
				return rechazo('editar', 'No puedes cambiar tu propio cargo.', 409, {
					idCargo: 'No puedes cambiar tu propio cargo.'
				});
			}
			if (error.code === '23505') {
				const campo = `${error.message} ${error.details ?? ''}`.includes('telefono')
					? 'telefono'
					: 'correoInstitucional';

				return rechazo('editar', 'Ese dato ya está registrado en otro sansano.', 409, {
					[campo]: 'Ya está registrado en otro sansano.'
				});
			}

			console.error('editar: no se pudo actualizar:', error);
			return rechazo('editar', 'No pudimos guardar los cambios.', 500);
		}

		// La RLS filtra en silencio lo que no se puede modificar: 0 filas = sin permiso o inexistente.
		if (!data?.length) return rechazo('editar', SIN_PERMISO, 403);

		return exito('editar', 'Cambios guardados.');
	},

	baja: async ({ request, locals }) => {
		if (!puedeGestionar(locals)) return rechazo('baja', SIN_PERMISO, 403);

		const validacion = rutStaffSchema.safeParse({
			rutSansano: numero((await request.formData()).get('rutSansano'))
		});
		if (!validacion.success) return rechazo('baja', 'Sansano inválido.');

		const { rutSansano } = validacion.data;

		const { data, error } = await locals.supabase
			.from('Sansano')
			.update({ idCargo: null })
			.eq('rutSansano', rutSansano)
			.select('rutSansano');

		if (error) {
			if (error.code === 'CS004') {
				return rechazo('baja', 'No puedes darte de baja a ti mismo.', 409);
			}

			console.error('baja: no se pudo quitar el cargo:', error);
			return rechazo('baja', 'No pudimos dar de baja al staff.', 500);
		}
		if (!data?.length) return rechazo('baja', SIN_PERMISO, 403);

		return exito('baja', 'Staff dado de baja. Su historial se conserva.');
	},

	eliminar: async ({ request, locals }) => {
		if (!puedeGestionar(locals)) return rechazo('eliminar', SIN_PERMISO, 403);

		const validacion = rutStaffSchema.safeParse({
			rutSansano: numero((await request.formData()).get('rutSansano'))
		});
		if (!validacion.success) return rechazo('eliminar', 'Sansano inválido.');

		// La DB valida el permiso y el historial, y borra el Sansano junto a su cuenta de Auth.
		const { error } = await locals.supabase.rpc('eliminar_staff', {
			p_rut: validacion.data.rutSansano
		});

		if (error) {
			switch (error.code) {
				case '42501':
					return rechazo('eliminar', SIN_PERMISO, 403);
				case 'CS003':
				case '23503':
					return rechazo(
						'eliminar',
						'El registro conserva historial. Aplica la baja por cargo en su lugar.',
						409
					);
				case 'CS004':
					return rechazo('eliminar', 'No puedes eliminarte a ti mismo.', 409);
				case 'P0002':
					return rechazo('eliminar', 'El sansano ya no existe.', 404);
				default:
					console.error('eliminar: la DB rechazó la eliminación:', error);
					return rechazo('eliminar', 'No pudimos eliminar el registro.', 500);
			}
		}

		return exito('eliminar', 'Registro eliminado. Su cuenta de acceso también se revocó.');
	}
};
