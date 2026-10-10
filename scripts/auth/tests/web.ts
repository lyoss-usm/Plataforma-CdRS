// Pruebas de autorización del servidor web: build real servido con `vite preview` y HTTP real.
// Cubre el guard de /admin/*, el 403 por rol, el login/logout y la vigencia de la sesión.
import {
	bottomSlotsByRole,
	quickActions,
	sidebarSections,
	type SidebarLink
} from '../../../src/lib/data/admin.ts';
import { asegurarEntornoLocal, cuentasDev, type RolStaff } from '../config.ts';
import {
	Resultados,
	Sesion,
	conectarDb,
	crearCuenta,
	detenerPreview,
	iniciarPreview,
	limpiarFixtures,
	sesionDe
} from '../helpers.ts';

asegurarEntornoLocal();

const r = new Resultados();
const sql = conectarDb();
const roles: RolStaff[] = ['junior', 'senior', 'directivo'];

// ---------------------------------------------------------------------------------------------
// Rutas de /admin y quién debe verlas, derivadas de la navegación real (src/lib/data/admin.ts):
// si la UI muestra un enlace a un rol, el servidor tiene que dejarlo entrar, y viceversa.
// ---------------------------------------------------------------------------------------------
const rutasAdmin = new Map<string, Set<RolStaff>>();

function registrar(href: string, permitidos: readonly RolStaff[]): void {
	const actuales = rutasAdmin.get(href) ?? new Set<RolStaff>();
	for (const rol of permitidos) actuales.add(rol);
	rutasAdmin.set(href, actuales);
}

function registrarEnlace(enlace: SidebarLink): void {
	registrar(enlace.href, enlace.roles);
	for (const hijo of enlace.children ?? []) registrarEnlace(hijo);
}

for (const seccion of sidebarSections) seccion.links.forEach(registrarEnlace);
for (const accion of quickActions) registrar(accion.href, accion.roles);

const esperadoRuta = (ruta: string, rol: RolStaff) => (rutasAdmin.get(ruta)?.has(rol) ? 200 : 403);

const textoDe = async (respuesta: Response) => (await respuesta.text()).replace(/<!--.*?-->/gs, '');

let preview: Awaited<ReturnType<typeof iniciarPreview>> | undefined;

try {
	await limpiarFixtures(sql);
	preview = await iniciarPreview();

	// -----------------------------------------------------------------------------------------
	// Anónimo
	// -----------------------------------------------------------------------------------------
	const anonimo = new Sesion();

	for (const ruta of ['/', '/catalogo', '/api/catalogo', '/login']) {
		const res = await anonimo.pedir(ruta);
		r.igual(`anon: ${ruta} es público`, res.status, 200);
	}

	for (const ruta of ['/admin', ...rutasAdmin.keys()]) {
		const res = await anonimo.pedir(ruta);
		r.igual(`anon: ${ruta} redirige (303)`, res.status, 303);
		r.igual(
			`anon: ${ruta} redirige a /login conservando el destino`,
			res.headers.get('location'),
			`/login?redirectTo=${encodeURIComponent(ruta)}`
		);
	}

	const dataAnon = await anonimo.pedir('/admin/__data.json');
	const cuerpoDataAnon = await dataAnon.text();
	r.ok(
		'anon: la petición de datos de /admin no entrega datos',
		!cuerpoDataAnon.includes('"staff"') && /redirect/.test(cuerpoDataAnon + dataAnon.status),
		`HTTP ${dataAnon.status} ${cuerpoDataAnon.slice(0, 100)}`
	);

	const logoutAnonimo = await anonimo.pedir('/logout', { metodo: 'POST' });
	r.igual('anon: POST /logout no falla', logoutAnonimo.status, 303);

	// -----------------------------------------------------------------------------------------
	// Login: mensajes uniformes y redirecciones seguras
	// -----------------------------------------------------------------------------------------
	const passwordMala = await new Sesion().iniciarSesion(cuentasDev.senior.correo, 'incorrecta');
	const correoInexistente = await new Sesion().iniciarSesion('nadie.existe@usm.cl', 'incorrecta');
	const textoPasswordMala = await textoDe(passwordMala);
	const textoInexistente = await textoDe(correoInexistente);
	r.igual('login: contraseña incorrecta → 400', passwordMala.status, 400);
	r.igual('login: correo inexistente → 400', correoInexistente.status, 400);
	r.ok(
		'login: mismo mensaje para contraseña incorrecta y correo inexistente',
		textoPasswordMala.includes('Correo o contraseña incorrectos') &&
			textoInexistente.includes('Correo o contraseña incorrectos')
	);

	const camposVacios = await new Sesion().iniciarSesion('', '');
	r.igual('login: campos vacíos → 400', camposVacios.status, 400);

	for (const destino of ['//evil.com', 'https://evil.com', '/\\evil.com', 'javascript:alert(1)']) {
		const sesion = new Sesion();
		const res = await sesion.iniciarSesion(cuentasDev.senior.correo, undefined, destino);
		r.igual(`login: redirectTo=${destino} cae en /admin`, res.headers.get('location'), '/admin');
	}

	const destinoInterno = await new Sesion().iniciarSesion(
		cuentasDev.senior.correo,
		undefined,
		'/admin/inventario'
	);
	r.igual(
		'login: redirectTo interno se respeta',
		destinoInterno.headers.get('location'),
		'/admin/inventario'
	);

	const exitoso = await new Sesion().iniciarSesion(cuentasDev.senior.correo);
	r.ok(
		'login: la respuesta que fija la sesión no es cacheable',
		/no-store|private/.test(exitoso.headers.get('cache-control') ?? ''),
		`cache-control: ${exitoso.headers.get('cache-control')}`
	);

	// -----------------------------------------------------------------------------------------
	// Staff por rol
	// -----------------------------------------------------------------------------------------
	const sesiones = {
		junior: await sesionDe(cuentasDev.junior.correo),
		senior: await sesionDe(cuentasDev.senior.correo),
		directivo: await sesionDe(cuentasDev.directivo.correo)
	};

	for (const rol of roles) {
		const sesion = sesiones[rol];

		const inicio = await sesion.pedir('/admin');
		r.igual(`${rol}: /admin → 200`, inicio.status, 200);

		for (const ruta of rutasAdmin.keys()) {
			const res = await sesion.pedir(ruta);
			r.igual(`${rol}: ${ruta} → ${esperadoRuta(ruta, rol)}`, res.status, esperadoRuta(ruta, rol));
		}

		for (const slot of bottomSlotsByRole[rol]) {
			const res = await sesion.pedir(slot.href);
			r.igual(`${rol}: el acceso inferior "${slot.label}" (${slot.href}) → 200`, res.status, 200);
		}

		const datos = await (await sesion.pedir('/admin/__data.json')).text();
		r.ok(
			`${rol}: los datos de /admin traen su propio perfil`,
			datos.includes(cuentasDev[rol].correo)
		);
		r.ok(
			`${rol}: los datos de /admin no mezclan el perfil de otro rol`,
			roles.every((otro) => otro === rol || !datos.includes(cuentasDev[otro].correo))
		);

		const login = await sesion.pedir('/login');
		r.igual(`${rol}: /login con sesión redirige`, login.status, 303);
	}

	// Una ruta prohibida no entrega datos ni por la petición interna de SvelteKit.
	const prohibida = await sesiones.junior.pedir('/admin/inventario/__data.json');
	const cuerpoProhibida = await prohibida.text();
	r.ok(
		'junior: la petición de datos de una ruta prohibida es un error 403',
		/"status":403/.test(cuerpoProhibida) || prohibida.status === 403,
		`HTTP ${prohibida.status} ${cuerpoProhibida.slice(0, 120)}`
	);

	const paginaProhibida = await sesiones.junior.pedir('/admin/inventario');
	const htmlProhibida = await textoDe(paginaProhibida);
	r.ok(
		'junior: el 403 es la página amigable',
		paginaProhibida.status === 403 &&
			htmlProhibida.includes('No tienes acceso') &&
			htmlProhibida.includes('Volver al panel'),
		`HTTP ${paginaProhibida.status}`
	);
	r.ok(
		'junior: el 403 no filtra contenido del panel',
		!htmlProhibida.includes('Inventario físico') && !htmlProhibida.includes('Agregar juego')
	);

	// -----------------------------------------------------------------------------------------
	// Autenticado sin cargo
	// -----------------------------------------------------------------------------------------
	const sinCargo = await sesionDe(cuentasDev.comun.correo);
	for (const ruta of ['/admin', ...rutasAdmin.keys()]) {
		const res = await sinCargo.pedir(ruta);
		r.igual(`sin cargo: ${ruta} → 403`, res.status, 403);
	}
	const htmlSinCargo = await textoDe(await sinCargo.pedir('/admin'));
	r.ok(
		'sin cargo: ve la página amigable con opción de cambiar de cuenta',
		htmlSinCargo.includes('No tienes acceso') && htmlSinCargo.includes('Cambiar de cuenta')
	);
	const datosSinCargo = await (await sinCargo.pedir('/admin/__data.json')).text();
	r.ok(
		'sin cargo: la petición de datos no entrega perfil de staff',
		!datosSinCargo.includes('"staff"') && !datosSinCargo.includes(cuentasDev.comun.correo),
		datosSinCargo.slice(0, 120)
	);
	for (const publica of ['/', '/catalogo']) {
		r.igual(
			`sin cargo: ${publica} sigue siendo público`,
			(await sinCargo.pedir(publica)).status,
			200
		);
	}

	// -----------------------------------------------------------------------------------------
	// Invitado: primer ingreso vincula la cuenta
	// -----------------------------------------------------------------------------------------
	const invitado = await crearCuenta(sql, { indice: 10, cargo: 'Junior', vinculada: false });
	const sesionInvitado = await sesionDe(invitado.correo);
	r.igual(
		'invitado: primer ingreso a /admin → 200',
		(await sesionInvitado.pedir('/admin')).status,
		200
	);
	const [vinculo] =
		await sql`SELECT "authUserId" FROM "Sansano" WHERE "rutSansano" = ${invitado.rut}`;
	r.igual('invitado: la cuenta queda vinculada a su Sansano', vinculo.authUserId, invitado.id);
	r.igual(
		'invitado: opera con su cargo Junior (sin acceso a inventario)',
		(await sesionInvitado.pedir('/admin/inventario')).status,
		403
	);

	// -----------------------------------------------------------------------------------------
	// Baja con la sesión abierta: efecto inmediato
	// -----------------------------------------------------------------------------------------
	const staffBaja = await crearCuenta(sql, { indice: 11, cargo: 'Senior', vinculada: true });
	const sesionBaja = await sesionDe(staffBaja.correo);
	r.igual(
		'baja: antes de la baja entra a inventario',
		(await sesionBaja.pedir('/admin/inventario')).status,
		200
	);
	await sql`UPDATE "Sansano" SET "idCargo" = NULL WHERE "rutSansano" = ${staffBaja.rut}`;
	r.igual(
		'baja: tras la baja /admin/inventario → 403',
		(await sesionBaja.pedir('/admin/inventario')).status,
		403
	);
	r.igual('baja: tras la baja /admin → 403', (await sesionBaja.pedir('/admin')).status, 403);

	// Ascenso con la sesión abierta.
	await sql`
		UPDATE "Sansano"
		SET "idCargo" = (SELECT "idCargo" FROM "Cargo" WHERE "nombreCargo" = 'Directivo')
		WHERE "rutSansano" = ${staffBaja.rut}
	`;
	r.igual(
		'ascenso: el nuevo cargo aplica sin volver a iniciar sesión',
		(await sesionBaja.pedir('/admin/miembros?tab=moderacion')).status,
		200
	);

	// -----------------------------------------------------------------------------------------
	// Sesión: cookie adulterada, logout, CSRF y reutilización de cookie revocada
	// -----------------------------------------------------------------------------------------
	const adulterada = await sesionDe(cuentasDev.directivo.correo);
	const nombresAuth = [...adulterada.cookies.keys()]
		.filter((n) => /auth-token(\.\d+)?$/.test(n))
		.sort();
	const base = nombresAuth[0].replace(/\.\d+$/, '');
	const sesionJson = JSON.parse(
		Buffer.from(
			nombresAuth
				.map((n) => adulterada.cookies.get(n))
				.join('')
				.replace(/^base64-/, ''),
			'base64url'
		).toString()
	);
	sesionJson.access_token = `${sesionJson.access_token.slice(0, -4)}AAAA`;
	for (const nombre of nombresAuth) adulterada.cookies.delete(nombre);
	adulterada.cookies.set(
		base,
		`base64-${Buffer.from(JSON.stringify(sesionJson)).toString('base64url')}`
	);
	const resAdulterada = await adulterada.pedir('/admin');
	r.ok(
		'sesión: un token con la firma alterada no da acceso',
		resAdulterada.status === 303 &&
			resAdulterada.headers.get('location')?.startsWith('/login') === true,
		`HTTP ${resAdulterada.status}`
	);

	const basura = new Sesion();
	basura.cookies.set(base, 'base64-esto-no-es-una-sesion');
	r.igual(
		'sesión: una cookie corrupta redirige a /login',
		(await basura.pedir('/admin')).status,
		303
	);

	const salida = await sesionDe(cuentasDev.directivo.correo);
	const copiaAntesDeSalir = new Sesion();
	copiaAntesDeSalir.cookies = new Map(salida.cookies);

	const sinOrigen = await salida.pedir('/logout', { metodo: 'POST', origen: null });
	r.igual('logout: POST sin Origin es rechazado (CSRF)', sinOrigen.status, 403);
	r.igual(
		'logout: tras el rechazo la sesión sigue activa',
		(await salida.pedir('/admin')).status,
		200
	);

	const origenAjeno = await salida.pedir('/logout', { metodo: 'POST', origen: 'https://evil.com' });
	r.igual('logout: POST con Origin ajeno es rechazado (CSRF)', origenAjeno.status, 403);

	const logout = await salida.pedir('/logout', { metodo: 'POST' });
	r.igual('logout: redirige a /login', logout.headers.get('location'), '/login');
	r.igual('logout: borra las cookies de sesión', salida.cookies.size, 0);
	r.igual('logout: /admin vuelve a pedir login', (await salida.pedir('/admin')).status, 303);
	r.igual(
		'logout: la cookie anterior queda revocada en Auth (no se puede reutilizar)',
		(await copiaAntesDeSalir.pedir('/admin')).status,
		303
	);
} finally {
	detenerPreview(preview);
	await limpiarFixtures(sql);
	await sql.end({ timeout: 5 });
	r.finalizar();
}
