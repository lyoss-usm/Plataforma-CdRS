// Pruebas de autorización contra la API real de Supabase local (GoTrue + PostgREST) con JWT reales.
// Complementan a pgTAP: validan grants de PostgREST, exposición de RPC y la config de Auth.
import { SUPABASE_ANON_KEY, SUPABASE_URL, asegurarEntornoLocal, cuentasDev } from '../config.ts';
import {
	Resultados,
	conectarDb,
	crearCuenta,
	limpiarFixtures,
	rest,
	tokenDe,
	type RespuestaRest
} from '../helpers.ts';

asegurarEntornoLocal();

const r = new Resultados();
const sql = conectarDb();

const esPermisoDenegado = (res: RespuestaRest) =>
	(res.status === 401 || res.status === 403) && res.cuerpo?.code === '42501';

try {
	await limpiarFixtures(sql);

	// Fixtures: un sansano suspendido y un ejemplar de un juego base para solicitar.
	const [juego] = await sql`
		INSERT INTO "Juego" ("nombreJuego", "tipo") VALUES ('[TEST AUTH] Juego', 'Juego base')
		RETURNING "idJuego"
	`;
	await sql`
		INSERT INTO "Ejemplar" ("idEjemplar", "idJuego", "esExterno", "estadoCompletitud", "estadoEjemplar")
		VALUES ('TEST-AUTH-1', ${juego.idJuego}, false, 'Completo', 'En bodega')
	`;
	const suspendido = await crearCuenta(sql, { indice: 1, cargo: null, vinculada: false });
	const libre = await crearCuenta(sql, { indice: 2, cargo: null, vinculada: false });
	await sql`
		INSERT INTO "Suspension" ("rutSansano", "rutModerador", "fechaInicio", "razon")
		VALUES (
			${suspendido.rut},
			(SELECT "rutSansano" FROM "Sansano" WHERE "correoInstitucional" = ${cuentasDev.directivo.correo}),
			now(), 'Fixture'
		)
	`;

	const tokens = {
		junior: await tokenDe(cuentasDev.junior.correo),
		senior: await tokenDe(cuentasDev.senior.correo),
		directivo: await tokenDe(cuentasDev.directivo.correo),
		comun: await tokenDe(cuentasDev.comun.correo)
	};

	// -----------------------------------------------------------------------------------------
	// Invite-only: nadie se registra solo
	// -----------------------------------------------------------------------------------------
	const signup = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
		method: 'POST',
		headers: { apikey: SUPABASE_ANON_KEY, 'content-type': 'application/json' },
		body: JSON.stringify({ email: 'test.auth.signup@usm.cl', password: 'cdrs-signup-1' })
	});
	r.ok(
		'el registro público está deshabilitado (si falla: `make stop` y volver a iniciar Supabase para aplicar config.toml)',
		signup.status >= 400,
		`HTTP ${signup.status}`
	);
	await sql`DELETE FROM auth.users WHERE email = 'test.auth.signup@usm.cl'`;

	// -----------------------------------------------------------------------------------------
	// Anónimo
	// -----------------------------------------------------------------------------------------
	const juegos = await rest(null, 'Juego?select=idJuego&limit=1');
	r.ok('anon lee Juego', juegos.status === 200 && juegos.cuerpo.length === 1);

	for (const tabla of [
		'Ejemplar',
		'Sansano',
		'Suspension',
		'Prestamo',
		'Solicitud',
		'Cargo',
		'Permiso',
		'CargoPermiso'
	]) {
		const res = await rest(null, `${tabla}?select=*&limit=1`);
		r.ok(
			`anon no ve filas de ${tabla}`,
			res.status === 200 && Array.isArray(res.cuerpo) && res.cuerpo.length === 0,
			`HTTP ${res.status} ${JSON.stringify(res.cuerpo).slice(0, 80)}`
		);
	}

	for (const rpc of ['perfil_staff', 'es_staff', 'cargo_actual', 'vincular_cuenta_staff']) {
		const res = await rest(null, `rpc/${rpc}`, { method: 'POST', body: {} });
		r.ok(`anon no ejecuta rpc/${rpc}`, esPermisoDenegado(res), `HTTP ${res.status}`);
	}
	for (const [rpc, cuerpo] of [
		['suspension_activa', { p_rut: suspendido.rut }],
		['tiene_permiso', { p_permiso: 'prestamos:junta' }]
	] as const) {
		const res = await rest(null, `rpc/${rpc}`, { method: 'POST', body: cuerpo });
		r.ok(`anon no ejecuta rpc/${rpc}`, esPermisoDenegado(res), `HTTP ${res.status}`);
	}

	const catalogo = await rest(null, 'rpc/buscar_catalogo', { method: 'POST', body: {} });
	r.ok(
		'anon sí puede usar rpc/buscar_catalogo',
		catalogo.status === 200 && Array.isArray(catalogo.cuerpo)
	);

	const solicitud = (rut: number, estado = 'Pendiente') => ({
		rutSansano: rut,
		idEjemplar: 'TEST-AUTH-1',
		fechaSolicitud: new Date().toISOString(),
		fechaSeleccionada: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
		estadoSolicitud: estado
	});

	const bloqueada = await rest(null, 'Solicitud', {
		method: 'POST',
		body: solicitud(suspendido.rut),
		prefer: 'return=minimal'
	});
	r.ok(
		'anon: solicitud de un RUT suspendido rechazada con sansano_suspendido',
		bloqueada.status === 400 && bloqueada.cuerpo?.hint === 'sansano_suspendido',
		`HTTP ${bloqueada.status} ${JSON.stringify(bloqueada.cuerpo).slice(0, 120)}`
	);

	const aprobada = await rest(null, 'Solicitud', {
		method: 'POST',
		body: solicitud(libre.rut, 'Aprobada'),
		prefer: 'return=minimal'
	});
	r.ok(
		'anon no puede crear solicitudes Aprobadas',
		esPermisoDenegado(aprobada),
		`HTTP ${aprobada.status}`
	);

	const pendiente = await rest(null, 'Solicitud', {
		method: 'POST',
		body: solicitud(libre.rut),
		prefer: 'return=minimal'
	});
	r.igual('anon crea una solicitud Pendiente', pendiente.status, 201);

	const lecturaSolicitud = await rest(null, `Solicitud?rutSansano=eq.${libre.rut}`);
	r.ok(
		'anon no puede leer de vuelta su solicitud',
		lecturaSolicitud.status === 200 && lecturaSolicitud.cuerpo.length === 0
	);

	// -----------------------------------------------------------------------------------------
	// Autenticado sin cargo: no es staff
	// -----------------------------------------------------------------------------------------
	for (const tabla of ['Ejemplar', 'Sansano', 'Suspension', 'Prestamo', 'Solicitud', 'Cargo']) {
		const res = await rest(tokens.comun, `${tabla}?select=*&limit=1`);
		r.ok(
			`sin cargo no ve filas de ${tabla}`,
			res.status === 200 && res.cuerpo.length === 0,
			`HTTP ${res.status}`
		);
	}
	const perfilComun = await rest(tokens.comun, 'rpc/perfil_staff', { method: 'POST', body: {} });
	r.ok(
		'sin cargo no tiene perfil de staff',
		perfilComun.status === 200 && perfilComun.cuerpo.length === 0
	);
	const suspensionComun = await rest(tokens.comun, 'rpc/suspension_activa', {
		method: 'POST',
		body: { p_rut: suspendido.rut }
	});
	r.ok(
		'sin cargo no puede averiguar quién está suspendido',
		suspensionComun.status >= 400,
		`HTTP ${suspensionComun.status} cuerpo: ${JSON.stringify(suspensionComun.cuerpo)}`
	);
	const juegoComun = await rest(tokens.comun, 'Juego', {
		method: 'POST',
		body: { nombreJuego: '[TEST AUTH] sin cargo', tipo: 'Juego base' },
		prefer: 'return=minimal'
	});
	r.ok('sin cargo no escribe Juego', esPermisoDenegado(juegoComun), `HTTP ${juegoComun.status}`);

	// -----------------------------------------------------------------------------------------
	// Staff por rol
	// -----------------------------------------------------------------------------------------
	for (const rol of ['junior', 'senior', 'directivo'] as const) {
		const cargo = await rest(tokens[rol], 'rpc/cargo_actual', { method: 'POST', body: {} });
		r.igual(`${rol}: rpc/cargo_actual devuelve su cargo`, cargo.cuerpo, cuentasDev[rol].cargo);

		const propio = await rest(tokens[rol], 'rpc/perfil_staff', { method: 'POST', body: {} });
		r.igual(`${rol}: perfil_staff devuelve solo su propio perfil`, propio.cuerpo?.length, 1);
		r.igual(
			`${rol}: perfil_staff es el suyo`,
			propio.cuerpo?.[0]?.correoInstitucional,
			cuentasDev[rol].correo
		);
	}

	const escrituras: Array<{
		nombre: string;
		tabla: string;
		cuerpo: Record<string, unknown>;
		permitidos: Array<'junior' | 'senior' | 'directivo'>;
	}> = [
		{
			nombre: 'crear Juego',
			tabla: 'Juego',
			cuerpo: { nombreJuego: '[TEST AUTH] por rol', tipo: 'Juego base' },
			permitidos: ['senior', 'directivo']
		},
		{
			nombre: 'crear Suspension',
			tabla: 'Suspension',
			cuerpo: {
				rutSansano: libre.rut,
				rutModerador: 61_000_002,
				fechaInicio: new Date().toISOString(),
				razon: 'Prueba'
			},
			permitidos: ['directivo']
		},
		{
			nombre: 'crear Cargo',
			tabla: 'Cargo',
			cuerpo: { nombreCargo: '[TEST AUTH] cargo' },
			permitidos: ['directivo']
		}
	];

	// Moderador válido para la FK de Suspension.
	const [moderador] = await sql`
		SELECT "rutSansano" FROM "Sansano" WHERE "correoInstitucional" = ${cuentasDev.directivo.correo}
	`;
	escrituras[1].cuerpo.rutModerador = moderador.rutSansano;

	for (const escritura of escrituras) {
		for (const rol of ['junior', 'senior', 'directivo'] as const) {
			const permitido = escritura.permitidos.includes(rol);
			const res = await rest(tokens[rol], escritura.tabla, {
				method: 'POST',
				body: escritura.cuerpo,
				prefer: 'return=minimal'
			});

			if (permitido) r.igual(`${rol} puede ${escritura.nombre}`, res.status, 201);
			else
				r.ok(`${rol} no puede ${escritura.nombre}`, esPermisoDenegado(res), `HTTP ${res.status}`);

			// Limpia lo creado para que la siguiente persona parta del mismo estado.
			if (permitido) {
				await sql`DELETE FROM "Suspension" WHERE "razon" = 'Prueba'`;
				await sql`DELETE FROM "Juego" WHERE "nombreJuego" = '[TEST AUTH] por rol'`;
				await sql`DELETE FROM "Cargo" WHERE "nombreCargo" = '[TEST AUTH] cargo'`;
			}
		}
	}

	// Un Junior no puede subirse el cargo editando su propia fila.
	const autoAscenso = await rest(
		tokens.junior,
		`Sansano?correoInstitucional=eq.${encodeURIComponent(cuentasDev.junior.correo)}`,
		{ method: 'PATCH', body: { idCargo: 1 }, prefer: 'return=representation' }
	);
	r.ok(
		'junior no puede cambiar su propio cargo',
		(autoAscenso.status === 200 && autoAscenso.cuerpo.length === 0) ||
			esPermisoDenegado(autoAscenso),
		`HTTP ${autoAscenso.status} ${JSON.stringify(autoAscenso.cuerpo).slice(0, 80)}`
	);
	const [verificado] = await sql`
		SELECT c."nombreCargo" FROM "Sansano" s JOIN "Cargo" c USING ("idCargo")
		WHERE s."correoInstitucional" = ${cuentasDev.junior.correo}
	`;
	r.igual('el cargo del junior sigue siendo Junior', verificado.nombreCargo, 'Junior');

	// JWT inválido: PostgREST lo rechaza (no cae a anon).
	const tokenFalso = `${tokens.junior.slice(0, -4)}AAAA`;
	const jwtFalso = await rest(tokenFalso, 'rpc/cargo_actual', { method: 'POST', body: {} });
	r.ok(
		'un JWT con la firma alterada es rechazado',
		jwtFalso.status === 401,
		`HTTP ${jwtFalso.status}`
	);
} finally {
	await limpiarFixtures(sql);
	await sql.end({ timeout: 5 });
	r.finalizar();
}
