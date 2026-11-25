import assert from 'node:assert/strict';
import { validatePayload } from '../validar.ts';
import {
	createEjemplarSchema,
	ejemplarSchema,
	updateEjemplarSchema
} from '../../../src/lib/schemas/ejemplar.ts';

const juego = {
	idJuego: 1,
	nombreJuego: '  Catan  ',
	tipo: 'Juego base',
	idJuegoBase: null,
	edadMinima: null,
	jugadoresMin: 2,
	jugadoresMax: 4,
	duracion: 60,
	calificacion: 9.1,
	dificultad: null,
	pathImagen: null,
	idBgg: null,
	manual: null,
	video: null
};
const ejemplar = {
	idEjemplar: '  0001_CATAN  ',
	idJuego: 1,
	esExterno: false,
	estadoCompletitud: 'Completo',
	situacion: null,
	comentarios: null,
	componentes: null,
	estadoEjemplar: 'En bodega'
};

const valid = validatePayload({ juegos: [juego], ejemplares: [ejemplar] });
assert.equal(valid.ok, true);
assert.equal(valid.juegos[0].nombreJuego, 'Catan');
assert.equal(valid.ejemplares[0].idEjemplar, '0001_CATAN');

assert.equal(valid.ejemplares[0].situacion, null);
for (const estadoCompletitud of [null, '', 'Desconocido']) {
	const invalidCopy = { ...ejemplar, estadoCompletitud, comentarios: 'Falta una pieza.' };
	assert.equal(validatePayload({ juegos: [juego], ejemplares: [invalidCopy] }).ok, false);
	assert.equal(ejemplarSchema.safeParse(invalidCopy).success, false);
	assert.equal(createEjemplarSchema.safeParse(invalidCopy).success, false);
	assert.equal(updateEjemplarSchema.safeParse({ estadoCompletitud }).success, false);
}

const invalid = validatePayload({
	juegos: [
		juego,
		{ ...juego, jugadoresMax: 1 },
		{ ...juego, tipo: 'Expansión', idJuegoBase: 1 },
		{ ...juego, duracion: 32_768, calificacion: 8.75 },
		{ ...juego, idBgg: 2_147_483_648 }
	],
	ejemplares: [{ ...ejemplar, estadoEjemplar: 'Estado inventado' }]
});
assert.equal(invalid.ok, false);
assert.equal(invalid.juegos.length, 1);
assert.deepEqual(
	invalid.errores.map(({ entidad, indice }) => [entidad, indice]),
	[
		['Juego', 1],
		['Juego', 2],
		['Juego', 3],
		['Juego', 4],
		['Ejemplar', 0]
	]
);
assert.deepEqual(
	invalid.errores[2].issues.map(({ path }) => path),
	[['duracion'], ['calificacion']]
);
assert.throws(() => validatePayload({ juegos: [] }));
console.log('Puente Zod: normalización, dominio y almacenamiento verificados.');
