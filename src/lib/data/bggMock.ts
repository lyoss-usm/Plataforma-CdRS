// Mock local DEV del proxy BGG (tracer bullet).
// El proxy real (/api/bgg/*, issue #8) se trabaja en paralelo: esta maqueta solo
// simula la búsqueda y el autocompletado para validar el flujo de ficha editable.
// No hablar con BGG desde el navegador; todo lo real pasa por el proxy.

export interface BggSugerencia {
	idBgg: number;
	nombre: string;
	anio: number;
	jugadoresMin: number | null;
	jugadoresMax: number | null;
	duracion: number | null;
	edadMinima: number | null;
	calificacion: number | null;
	dificultad: 'Fácil' | 'Intermedio' | 'Difícil' | null;
	imagen: string | null;
}

const SUGERENCIAS: BggSugerencia[] = [
	{
		idBgg: 13,
		nombre: 'Catan',
		anio: 1995,
		jugadoresMin: 3,
		jugadoresMax: 4,
		duracion: 90,
		edadMinima: 10,
		calificacion: 8.2,
		dificultad: 'Intermedio',
		imagen: '/ludoteca/catan.jpg'
	},
	{
		idBgg: 822,
		nombre: 'Carcassonne',
		anio: 2000,
		jugadoresMin: 2,
		jugadoresMax: 5,
		duracion: 45,
		edadMinima: 7,
		calificacion: 7.9,
		dificultad: 'Fácil',
		imagen: null
	},
	{
		idBgg: 39856,
		nombre: 'Dixit',
		anio: 2008,
		jugadoresMin: 3,
		jugadoresMax: 6,
		duracion: 30,
		edadMinima: 8,
		calificacion: 7.9,
		dificultad: 'Fácil',
		imagen: '/ludoteca/dixit.jpg'
	},
	{
		idBgg: 178900,
		nombre: 'Codenames',
		anio: 2015,
		jugadoresMin: 4,
		jugadoresMax: 8,
		duracion: 15,
		edadMinima: 14,
		calificacion: 7.5,
		dificultad: 'Fácil',
		imagen: '/ludoteca/codenames.jpg'
	},
	{
		idBgg: 169786,
		nombre: 'Scythe',
		anio: 2016,
		jugadoresMin: 1,
		jugadoresMax: 5,
		duracion: 115,
		edadMinima: 14,
		calificacion: 9.1,
		dificultad: 'Difícil',
		imagen: '/ludoteca/scythe.png'
	},
	{
		idBgg: 9209,
		nombre: 'Ticket to Ride',
		anio: 2004,
		jugadoresMin: 2,
		jugadoresMax: 5,
		duracion: 60,
		edadMinima: 8,
		calificacion: 7.4,
		dificultad: 'Fácil',
		imagen: '/ludoteca/ticket-to-ride.jpg'
	}
];

function normalizar(texto: string): string {
	return texto
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '');
}

export function buscarBggSimulado(termino: string): BggSugerencia[] {
	const consulta = normalizar(termino.trim());

	if (consulta === '') {
		return [];
	}

	return SUGERENCIAS.filter((s) => normalizar(s.nombre).includes(consulta)).slice(0, 5);
}
