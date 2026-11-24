import { getContext, setContext } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import {
	ejemplarSchema,
	juegoSchema,
	type AltaEjemplarDto,
	type CreateJuegoDto,
	type EdicionEjemplarDto,
	type Ejemplar,
	type Juego,
	type UpdateJuegoDto
} from '$lib/schemas';

export interface Resultado<T = null> {
	ok: boolean;
	dato: T | null;
	motivo: string;
}

async function pedir(
	url: string,
	method: 'POST' | 'PATCH' | 'DELETE',
	cuerpo?: unknown
): Promise<Resultado<Record<string, unknown>>> {
	try {
		const respuesta = await fetch(url, {
			method,
			headers: cuerpo === undefined ? undefined : { 'content-type': 'application/json' },
			body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
		});
		const datos = (await respuesta.json().catch(() => ({}))) as Record<string, unknown>;

		if (!respuesta.ok) {
			const motivo = typeof datos.error === 'string' ? datos.error : 'No se pudo guardar.';
			return { ok: false, dato: null, motivo };
		}

		return { ok: true, dato: datos, motivo: '' };
	} catch {
		return { ok: false, dato: null, motivo: 'Sin conexión con el servidor. Inténtalo de nuevo.' };
	}
}

/**
 * Inventario real (#19): parte de los datos del load de /admin/inventario y aplica cada cambio
 * confirmado por el servidor (endpoints de /admin/inventario/*), sin recargar la página. Vive en el
 * panel (contexto), no como singleton de módulo, para no compartir estado entre peticiones en SSR.
 */
export class Inventario {
	juegos = $state<Juego[]>([]);
	ejemplares = $state<Ejemplar[]>([]);

	constructor(datos: { juegos: Juego[]; ejemplares: Ejemplar[] }) {
		this.juegos = datos.juegos;
		this.ejemplares = datos.ejemplares;
	}

	#porJuego = $derived.by(() => {
		const mapa = new SvelteMap<number, Ejemplar[]>();
		for (const ejemplar of this.ejemplares) {
			mapa.set(ejemplar.idJuego, [...(mapa.get(ejemplar.idJuego) ?? []), ejemplar]);
		}
		return mapa;
	});

	juegoDe(idJuego: number): Juego | null {
		return this.juegos.find((j) => j.idJuego === idJuego) ?? null;
	}

	ejemplaresDeJuego(idJuego: number): Ejemplar[] {
		return this.#porJuego.get(idJuego) ?? [];
	}

	disponibleDe(idJuego: number): boolean {
		return this.ejemplaresDeJuego(idJuego).some((e) => e.estadoEjemplar === 'En bodega');
	}

	async crearJuego(datos: CreateJuegoDto): Promise<Resultado<Juego>> {
		const r = await pedir('/admin/inventario/juegos', 'POST', datos);
		if (!r.ok) return { ...r, dato: null };

		const juego = juegoSchema.parse(r.dato?.juego);
		this.juegos.push(juego);
		this.juegos.sort((a, b) => a.nombreJuego.localeCompare(b.nombreJuego, 'es'));

		return { ok: true, dato: juego, motivo: '' };
	}

	async actualizarJuego(idJuego: number, cambios: UpdateJuegoDto): Promise<Resultado<Juego>> {
		const r = await pedir(`/admin/inventario/juegos/${idJuego}`, 'PATCH', cambios);
		if (!r.ok) return { ...r, dato: null };

		const actualizado = juegoSchema.parse(r.dato?.juego);
		const juego = this.juegoDe(idJuego);
		// En el lugar: la ficha abierta guarda la referencia y se actualiza sola.
		if (juego) Object.assign(juego, actualizado);

		return { ok: true, dato: juego ?? actualizado, motivo: '' };
	}

	async eliminarJuego(idJuego: number): Promise<Resultado> {
		const r = await pedir(`/admin/inventario/juegos/${idJuego}`, 'DELETE');
		if (!r.ok) return { ...r, dato: null };

		this.juegos = this.juegos.filter((j) => j.idJuego !== idJuego);

		return { ok: true, dato: null, motivo: '' };
	}

	async crearEjemplar(datos: AltaEjemplarDto): Promise<Resultado<Ejemplar>> {
		const r = await pedir('/admin/inventario/ejemplares', 'POST', datos);
		if (!r.ok) return { ...r, dato: null };

		const ejemplar = ejemplarSchema.parse(r.dato?.ejemplar);
		this.ejemplares.push(ejemplar);

		return { ok: true, dato: ejemplar, motivo: '' };
	}

	async actualizarEjemplar(
		idEjemplar: string,
		cambios: EdicionEjemplarDto
	): Promise<Resultado<Ejemplar>> {
		const r = await pedir(
			`/admin/inventario/ejemplares/${encodeURIComponent(idEjemplar)}`,
			'PATCH',
			cambios
		);
		if (!r.ok) return { ...r, dato: null };

		const actualizado = ejemplarSchema.parse(r.dato?.ejemplar);
		const ejemplar = this.ejemplares.find((e) => e.idEjemplar === idEjemplar);
		if (ejemplar) Object.assign(ejemplar, actualizado);

		return { ok: true, dato: ejemplar ?? actualizado, motivo: '' };
	}

	async eliminarEjemplar(idEjemplar: string): Promise<Resultado> {
		const r = await pedir(
			`/admin/inventario/ejemplares/${encodeURIComponent(idEjemplar)}`,
			'DELETE'
		);
		if (!r.ok) return { ...r, dato: null };

		this.ejemplares = this.ejemplares.filter((e) => e.idEjemplar !== idEjemplar);

		return { ok: true, dato: null, motivo: '' };
	}
}

const CLAVE = Symbol('inventario');

export function proveerInventario(inventario: Inventario): Inventario {
	return setContext(CLAVE, inventario);
}

export function usarInventario(): Inventario {
	return getContext<Inventario>(CLAVE);
}
