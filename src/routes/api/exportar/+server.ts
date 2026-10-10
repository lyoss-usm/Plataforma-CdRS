import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { strToU8, zipSync } from 'fflate';
import { z } from 'zod';
import { exportDatasetSchema } from '$lib/schemas';
import { generarCSV } from '$lib/server/exportar';

const datasetsSchema = z.array(exportDatasetSchema).min(1);

export const GET: RequestHandler = async ({ url, fetch }) => {
	// To Do: Verificar que el usuario sea directivo

	const parsed = datasetsSchema.safeParse([...new Set(url.searchParams.getAll('dataset'))]);
	if (!parsed.success) throw error(400, 'Dataset inválido.');

	try {
		const fecha = new Date().toISOString().slice(0, 10);
		const resultados = await Promise.all(parsed.data.map((d) => generarCSV(d, fetch)));

		if (resultados.length === 1) {
			const { csv, dataset } = resultados[0];

			return new Response(csv, {
				headers: {
					'Content-Type': 'text/csv; charset=utf-8',
					'Content-Disposition': `attachment; filename="${dataset}_${fecha}.csv"`,
					'Cache-Control': 'no-store'
				}
			});
		}

		const archivos = Object.fromEntries(
			resultados.map(({ dataset, csv }) => [`${dataset}_${fecha}.csv`, strToU8(csv)])
		);
		const zip = zipSync(archivos);

		return new Response(new Uint8Array(zip), {
			headers: {
				'Content-Type': 'application/zip',
				'Content-Disposition': `attachment; filename="exportacion_${fecha}.zip"`,
				'Cache-Control': 'no-store'
			}
		});
	} catch (e) {
		console.error('[exportar]', e);
		throw error(500, dev && e instanceof Error ? e.message : 'No se pudo generar la exportación.');
	}
};