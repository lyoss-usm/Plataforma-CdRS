import { XMLParser } from 'fast-xml-parser';
import { bggFichaSchema, type BggConfig, type BggFicha } from '../schemas/bgg.ts';
import type { Dificultad, Tipo } from '../schemas/enums.ts';

/** El XML de BGG no tiene la forma esperada (juego inexistente, tipo no soportado, datos rotos). */
export class ErrorFormatoBgg extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ErrorFormatoBgg';
	}
}

/** BGG respondió bien pero el juego no existe. */
export class ErrorJuegoInexistente extends ErrorFormatoBgg {
	constructor(idBgg?: string) {
		super(`el juego ${idBgg ?? ''} no existe en BGG`.replace('  ', ' '));
		this.name = 'ErrorJuegoInexistente';
	}
}

type Atributo = { '@_value'?: string };
type Nombre = { '@_type': string; '@_value': string };
type Enlace = { '@_type': string; '@_id': string; '@_inbound'?: string | boolean };
type ItemBgg = {
	'@_id': string;
	'@_type': string;
	name?: Nombre[];
	yearpublished?: Atributo;
	minplayers?: Atributo;
	maxplayers?: Atributo;
	playingtime?: Atributo;
	minage?: Atributo;
	image?: string;
	link?: Enlace[];
	statistics?: {
		ratings?: {
			usersrated?: Atributo;
			average?: Atributo;
			averageweight?: Atributo;
		};
	};
};

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '@_',
	isArray: (nombre) => nombre === 'name' || nombre === 'link' || nombre === 'item'
});

const esperarItems = (xml: string): ItemBgg[] => {
	const items = parser.parse(xml)?.items;
	if (!items || typeof items !== 'object') throw new ErrorFormatoBgg('XML sin <items>');
	return (items.item as ItemBgg[] | undefined) ?? [];
};

const numero = (atributo: Atributo | undefined, config: BggConfig): number | null => {
	const crudo = atributo?.['@_value'];
	if (crudo === undefined || crudo.trim() === '') return null;
	const valor = Number(crudo);
	if (!Number.isFinite(valor) || config.sinDato.includes(valor)) return null;
	return valor;
};

const entero = (atributo: Atributo | undefined, config: BggConfig): number | null => {
	const valor = numero(atributo, config);
	return valor === null ? null : Math.round(valor);
};

const nombrePrincipal = (item: ItemBgg): string | null => {
	const nombre = item.name?.find((n) => n['@_type'] === 'primary') ?? item.name?.[0];
	return nombre?.['@_value']?.trim() || null;
};

export function dificultadDesdePeso(peso: number | null, config: BggConfig): Dificultad | null {
	if (peso === null) return null;
	if (peso < config.dificultad.facilHasta) return 'Fácil';
	if (peso < config.dificultad.intermedioHasta) return 'Intermedio';
	return 'Difícil';
}

export function parseFicha(xml: string, config: BggConfig): BggFicha {
	const item = esperarItems(xml)[0];
	if (!item) throw new ErrorJuegoInexistente();

	const tipo: Tipo | undefined = config.tipos[item['@_type']];
	if (!tipo) throw new ErrorFormatoBgg(`tipo de BGG no soportado: ${item['@_type']}`);

	const stats = item.statistics?.ratings;
	const votos = numero(stats?.usersrated, config) ?? 0;
	const promedio = numero(stats?.average, config);
	const peso = numero(stats?.averageweight, config);

	const idBase = item.link?.find(
		(l) => l['@_type'] === 'boardgameexpansion' && String(l['@_inbound']) === 'true'
	)?.['@_id'];

	const jugadoresMin = entero(item.minplayers, config);
	let jugadoresMax = entero(item.maxplayers, config);
	if (jugadoresMin !== null && jugadoresMax !== null && jugadoresMax < jugadoresMin) {
		jugadoresMax = null;
	}

	const ficha = {
		idBgg: Number(item['@_id']),
		nombreJuego: nombrePrincipal(item),
		tipo,
		idBggBase: tipo === 'Expansión' && idBase ? Number(idBase) : null,
		anio: entero(item.yearpublished, config),
		edadMinima: entero(item.minage, config),
		jugadoresMin,
		jugadoresMax,
		duracion: entero(item.playingtime, config),
		calificacion:
			promedio !== null && votos >= config.calificacion.minimoVotos
				? Number(promedio.toFixed(config.calificacion.decimales))
				: null,
		dificultad: dificultadDesdePeso(peso, config),
		peso,
		urlImagenBgg: typeof item.image === 'string' && item.image.trim() ? item.image.trim() : null
	};

	const resultado = bggFichaSchema.safeParse(ficha);
	if (!resultado.success) {
		throw new ErrorFormatoBgg(`ficha BGG inválida: ${resultado.error.issues[0]?.message}`);
	}
	return resultado.data;
}

export type ResultadoBusquedaBgg = {
	idBgg: number;
	nombre: string;
	anio: number | null;
	tipo: Tipo | null;
};

export function parseBusqueda(xml: string, config: BggConfig): ResultadoBusquedaBgg[] {
	return esperarItems(xml)
		.flatMap((item) => {
			const nombre = nombrePrincipal(item);
			const idBgg = Number(item['@_id']);
			if (!nombre || !Number.isInteger(idBgg) || idBgg <= 0) return [];
			return [
				{
					idBgg,
					nombre,
					anio: entero(item.yearpublished, config),
					tipo: config.tipos[item['@_type']] ?? null
				}
			];
		})
		.slice(0, config.busqueda.maximoResultados);
}
