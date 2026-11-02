// Genera las carátulas del modo mock (BGG_MOCK=1) en fixtures/bgg/img/ (ignorado por git).
// Uso: pnpm bgg:imagenes-mock
import { mkdir, writeFile } from 'node:fs/promises';
import { generarImagenGrande } from './imagenes-sinteticas.ts';

const DESTINO = new URL('../../fixtures/bgg/img/', import.meta.url);

const imagenes: { archivo: string; generar: () => Promise<Buffer> }[] = [
	// Gloomhaven: original grande (> 1 MiB) para ejercitar el procesamiento.
	{ archivo: '174430.jpg', generar: () => generarImagenGrande(4000, 'jpeg', 95) },
	{ archivo: '13.jpg', generar: () => generarImagenGrande(1200, 'jpeg', 85) },
	{ archivo: '325.png', generar: () => generarImagenGrande(800, 'png') }
];

await mkdir(DESTINO, { recursive: true });
for (const { archivo, generar } of imagenes) {
	const buffer = await generar();
	await writeFile(new URL(archivo, DESTINO), buffer);
	console.log(`${archivo}: ${(buffer.length / 1024 / 1024).toFixed(2)} MiB`);
}
