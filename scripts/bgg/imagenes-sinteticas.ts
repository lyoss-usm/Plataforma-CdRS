import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

export const DIR_LUDOTECA = fileURLToPath(new URL('../../static/ludoteca/', import.meta.url));
const IMAGEN_BASE = 'wingspan.jpg';

/**
 * Carátula sintética grande: una imagen real de la ludoteca ampliada con ruido, que es el peor
 * caso de compresión (simula un original de BGG de varios MB). No se versiona.
 */
export async function generarImagenGrande(
	lado: number,
	formato: 'jpeg' | 'png',
	calidad = 90
): Promise<Buffer> {
	const { data, info } = await sharp(DIR_LUDOTECA + IMAGEN_BASE)
		.resize(lado, Math.round(lado * 0.75), { fit: 'fill', kernel: 'lanczos3' })
		.raw()
		.toBuffer({ resolveWithObject: true });

	for (let i = 0; i < data.length; i++) {
		data[i] = Math.max(0, Math.min(255, data[i] + Math.floor(Math.random() * 40 - 20)));
	}

	const imagen = sharp(data, { raw: info });
	return formato === 'png' ? imagen.png().toBuffer() : imagen.jpeg({ quality: calidad }).toBuffer();
}
