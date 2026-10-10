import { spawn, type ChildProcess } from 'node:child_process';
import postgres from 'postgres';
import {
	DATABASE_URL,
	PASSWORD_DEV,
	PREVIEW_PORT,
	PREVIEW_URL,
	SUPABASE_ANON_KEY,
	SUPABASE_URL
} from './config.ts';

// ---------------------------------------------------------------------------------------------
// Resultados (formato TAP, sigue ejecutando tras un fallo para listar todos)
// ---------------------------------------------------------------------------------------------
export class Resultados {
	#total = 0;
	#fallos = 0;

	igual(nombre: string, actual: unknown, esperado: unknown): void {
		this.ok(
			nombre,
			Object.is(actual, esperado),
			`tiene: ${JSON.stringify(actual)} · esperado: ${JSON.stringify(esperado)}`
		);
	}

	ok(nombre: string, condicion: boolean, detalle = ''): void {
		this.#total += 1;
		if (condicion) {
			console.log(`ok ${this.#total} - ${nombre}`);
			return;
		}

		this.#fallos += 1;
		console.log(`not ok ${this.#total} - ${nombre}`);
		if (detalle) console.log(`#   ${detalle}`);
	}

	finalizar(): void {
		console.log(`1..${this.#total}`);
		if (this.#fallos > 0) {
			console.log(`# Fallaron ${this.#fallos} de ${this.#total} pruebas`);
			process.exitCode = 1;
		}
	}
}

// ---------------------------------------------------------------------------------------------
// Base de datos (fixtures). Solo local: ver asegurarEntornoLocal().
// ---------------------------------------------------------------------------------------------
export function conectarDb() {
	return postgres(DATABASE_URL, { max: 1, connect_timeout: 5, onnotice: () => {} });
}

export type Db = ReturnType<typeof conectarDb>;

export interface CuentaFixture {
	id: string;
	rut: number;
	correo: string;
}

/** Crea usuario de Auth (con contraseña) y su Sansano. `cargo` null = sin cargo. */
export async function crearCuenta(
	sql: Db,
	opciones: { indice: number; cargo: string | null; vinculada: boolean }
): Promise<CuentaFixture> {
	const { indice, cargo, vinculada } = opciones;
	const id = `b0000000-0000-4000-8000-${String(indice).padStart(12, '0')}`;
	const correo = `test.auth.${indice}@usm.cl`;
	const rut = 61_000_000 + indice;

	await sql`
		INSERT INTO auth.users (
			instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
			raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
			confirmation_token, email_change, email_change_token_new, recovery_token
		)
		VALUES (
			'00000000-0000-0000-0000-000000000000', ${id}, 'authenticated', 'authenticated', ${correo},
			extensions.crypt(${PASSWORD_DEV}, extensions.gen_salt('bf')), now(),
			'{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
		)
	`;
	await sql`
		INSERT INTO auth.identities (
			id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
		)
		VALUES (
			${id}, ${id}, ${id},
			${sql.json({ sub: id, email: correo, email_verified: true })},
			'email', now(), now(), now()
		)
	`;
	await sql`
		INSERT INTO "Sansano" (
			"rutSansano", "rolSansano", "digitoVerificador", "idCargo", "nombreSansano", "telefono",
			"correoInstitucional", "authUserId"
		)
		VALUES (
			${rut}, ${201_700_000 + indice}, 1,
			(SELECT "idCargo" FROM "Cargo" WHERE "nombreCargo" = ${cargo}),
			${`Test auth ${indice}`}, ${71_000_000 + indice}, ${correo}, ${vinculada ? id : null}
		)
	`;

	return { id, rut, correo };
}

/** Elimina todo lo creado por estos tests (idempotente; también limpia restos de una corrida caída). */
export async function limpiarFixtures(sql: Db): Promise<void> {
	await sql`DELETE FROM "Solicitud" WHERE "rutSansano" BETWEEN 61000000 AND 61999999`;
	await sql`DELETE FROM "Suspension" WHERE "rutSansano" BETWEEN 61000000 AND 61999999`;
	await sql`DELETE FROM "Ejemplar" WHERE "idEjemplar" LIKE 'TEST-AUTH-%'`;
	await sql`DELETE FROM "Juego" WHERE "nombreJuego" LIKE '[TEST AUTH]%'`;
	await sql`DELETE FROM "Cargo" WHERE "nombreCargo" LIKE '[TEST AUTH]%'`;
	await sql`DELETE FROM "Sansano" WHERE "rutSansano" BETWEEN 61000000 AND 61999999`;
	await sql`DELETE FROM auth.users WHERE email LIKE 'test.auth.%@usm.cl'`;
}

// ---------------------------------------------------------------------------------------------
// API de Supabase
// ---------------------------------------------------------------------------------------------
export async function tokenDe(correo: string, password = PASSWORD_DEV): Promise<string> {
	const respuesta = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
		method: 'POST',
		headers: { apikey: SUPABASE_ANON_KEY, 'content-type': 'application/json' },
		body: JSON.stringify({ email: correo, password })
	});

	if (!respuesta.ok) {
		throw new Error(`No se pudo iniciar sesión como ${correo}: HTTP ${respuesta.status}`);
	}

	const cuerpo = (await respuesta.json()) as { access_token: string };
	return cuerpo.access_token;
}

export interface RespuestaRest {
	status: number;
	// JSON arbitrario de PostgREST; cada prueba lo inspecciona a su manera.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	cuerpo: any;
}

/** Llamada a PostgREST. `token` null = anon (con la anon key como bearer). */
export async function rest(
	token: string | null,
	ruta: string,
	init: { method?: string; body?: unknown; prefer?: string } = {}
): Promise<RespuestaRest> {
	const respuesta = await fetch(`${SUPABASE_URL}/rest/v1/${ruta}`, {
		method: init.method ?? 'GET',
		headers: {
			apikey: SUPABASE_ANON_KEY,
			authorization: `Bearer ${token ?? SUPABASE_ANON_KEY}`,
			'content-type': 'application/json',
			...(init.prefer ? { prefer: init.prefer } : {})
		},
		body: init.body === undefined ? undefined : JSON.stringify(init.body)
	});

	const texto = await respuesta.text();
	let cuerpo: unknown = texto;
	try {
		cuerpo = texto === '' ? null : JSON.parse(texto);
	} catch {
		// Respuesta no JSON: se deja el texto.
	}

	return { status: respuesta.status, cuerpo };
}

// ---------------------------------------------------------------------------------------------
// Servidor web (build real servido con `vite preview`)
// ---------------------------------------------------------------------------------------------
export async function iniciarPreview(): Promise<ChildProcess> {
	// Se invoca el binario de vite directamente (no `pnpm exec`) para que kill() termine el servidor
	// y no deje un proceso huérfano escuchando el puerto.
	const proceso = spawn(
		'./node_modules/.bin/vite',
		['preview', '--host', '127.0.0.1', '--port', String(PREVIEW_PORT), '--strictPort'],
		{ stdio: ['ignore', 'pipe', 'pipe'], env: process.env }
	);

	let salida = '';
	proceso.stdout?.on('data', (parte) => (salida += parte));
	proceso.stderr?.on('data', (parte) => (salida += parte));

	for (let intento = 0; intento < 60; intento += 1) {
		if (proceso.exitCode !== null) {
			throw new Error(`vite preview terminó antes de responder:\n${salida}`);
		}

		try {
			const respuesta = await fetch(`${PREVIEW_URL}/login`, { redirect: 'manual' });
			if (respuesta.status > 0) return proceso;
		} catch {
			// Aún no escucha.
		}

		await new Promise((resolver) => setTimeout(resolver, 500));
	}

	proceso.kill();
	throw new Error(`vite preview no respondió en 30 s:\n${salida}`);
}

export function detenerPreview(proceso: ChildProcess | undefined): void {
	if (proceso && proceso.exitCode === null) proceso.kill('SIGTERM');
}

/** Cliente HTTP con cookies, sin seguir redirecciones. */
export class Sesion {
	cookies = new Map<string, string>();

	cabeceraCookie(): string {
		return [...this.cookies].map(([nombre, valor]) => `${nombre}=${valor}`).join('; ');
	}

	#absorber(respuesta: Response): void {
		for (const linea of respuesta.headers.getSetCookie()) {
			const [par, ...atributos] = linea.split(';').map((parte) => parte.trim());
			const separador = par.indexOf('=');
			const nombre = par.slice(0, separador);
			const valor = par.slice(separador + 1);
			const expirada = atributos.some(
				(atributo) => /^max-age=0$/i.test(atributo) || /^expires=.*1970/i.test(atributo)
			);

			if (expirada || valor === '') this.cookies.delete(nombre);
			else this.cookies.set(nombre, valor);
		}
	}

	async pedir(
		ruta: string,
		init: { metodo?: string; cuerpo?: Record<string, string>; origen?: string | null } = {}
	): Promise<Response> {
		const metodo = init.metodo ?? 'GET';
		// Como un navegador: sin esto SvelteKit responde a los formularios con JSON.
		const headers: Record<string, string> = { accept: 'text/html' };
		const cookie = this.cabeceraCookie();
		if (cookie) headers.cookie = cookie;

		let body: string | undefined;
		if (metodo !== 'GET') {
			headers['content-type'] = 'application/x-www-form-urlencoded';
			body = new URLSearchParams(init.cuerpo ?? {}).toString();
			// SvelteKit rechaza formularios cuyo Origin no coincide (CSRF).
			if (init.origen !== null) headers.origin = init.origen ?? PREVIEW_URL;
		}

		const respuesta = await fetch(`${PREVIEW_URL}${ruta}`, {
			method: metodo,
			headers,
			body,
			redirect: 'manual'
		});
		this.#absorber(respuesta);

		return respuesta;
	}

	async iniciarSesion(
		correo: string,
		password = PASSWORD_DEV,
		destino?: string
	): Promise<Response> {
		const query = destino ? `?redirectTo=${encodeURIComponent(destino)}` : '';

		return this.pedir(`/login${query}`, { metodo: 'POST', cuerpo: { correo, password } });
	}
}

export async function sesionDe(correo: string): Promise<Sesion> {
	const sesion = new Sesion();
	const respuesta = await sesion.iniciarSesion(correo);

	if (respuesta.status !== 303) {
		throw new Error(`Login de ${correo} falló: HTTP ${respuesta.status}`);
	}

	return sesion;
}
