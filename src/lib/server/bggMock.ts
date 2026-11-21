import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const DIR_IMG = join(process.cwd(), 'fixtures', 'bgg', 'img');
const EXTENSIONES = ['jpg', 'jpeg', 'png'];

/**
 * Original de carátula en modo mock: `fixtures/bgg/img/<id>.<ext>` (generado por
 * `pnpm bgg:imagenes-mock`, no versionado). Si falta, genera una imagen plana al vuelo.
 */
export async function leerImagenMock(idBgg: number): Promise<Buffer> {
	for (const ext of EXTENSIONES) {
		try {
			return await readFile(join(DIR_IMG, `${idBgg}.${ext}`));
		} catch (e) {
			if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
		}
	}

	console.warn(
		`[bgg] sin fixtures/bgg/img/${idBgg}.*: imagen plana (corre pnpm bgg:imagenes-mock)`
	);
	return sharp({
		create: { width: 600, height: 800, channels: 3, background: { r: idBgg % 256, g: 90, b: 150 } }
	})
		.jpeg()
		.toBuffer();
}
