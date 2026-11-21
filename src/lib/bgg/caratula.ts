import sharp from 'sharp';
import type { BggConfig } from '../schemas/bgg.ts';

type ConfigCaratula = BggConfig['caratula'];

export type CaratulaProcesada = { buffer: Buffer; bytes: number };

/**
 * Reduce la carátula al lado máximo y la recodifica a JPEG (transparencias sobre blanco). Si aún
 * excede el peso máximo, baja la calidad de a poco; si no alcanza, falla.
 */
export async function procesarCaratula(
	original: Buffer,
	config: ConfigCaratula
): Promise<CaratulaProcesada> {
	const calidades = [config.calidad, config.calidad - 10, config.calidad - 20, config.calidad - 30];

	for (const calidad of calidades.filter((c) => c >= 30)) {
		const buffer = await sharp(original)
			.rotate()
			.resize({
				width: config.ladoMaximo,
				height: config.ladoMaximo,
				fit: 'inside',
				withoutEnlargement: true
			})
			.flatten({ background: '#ffffff' })
			.jpeg({ quality: calidad, mozjpeg: true })
			.toBuffer();

		if (buffer.length <= config.pesoMaximoBytes) return { buffer, bytes: buffer.length };
	}

	throw new Error(`la carátula excede ${config.pesoMaximoBytes} bytes tras comprimirla`);
}
