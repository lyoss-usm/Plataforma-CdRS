// Captura respuestas reales de BGG como fixtures XML (requiere BGG_API_TOKEN).
// Uso: BGG_API_TOKEN=... pnpm bgg:capturar 13 174430 ...
// El diff de git muestra los cambios de formato de la API. Las imágenes no se capturan.
import { mkdir, writeFile } from 'node:fs/promises';

const token = process.env.BGG_API_TOKEN;
const ids = process.argv.slice(2);

if (!token) {
	console.error('Falta BGG_API_TOKEN');
	process.exit(1);
}
if (ids.length === 0 || ids.some((id) => !/^[1-9]\d*$/.test(id))) {
	console.error('Uso: pnpm bgg:capturar <idBgg> [<idBgg> ...]');
	process.exit(1);
}

const destino = new URL('../../fixtures/bgg/thing/', import.meta.url);
await mkdir(destino, { recursive: true });

for (const id of ids) {
	const res = await fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${id}&stats=1`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!res.ok) {
		console.error(`${id}: BGG respondió ${res.status}`);
		process.exitCode = 1;
		continue;
	}
	await writeFile(new URL(`${id}.xml`, destino), await res.text());
	console.log(`${id}: fixtures/bgg/thing/${id}.xml`);
	await new Promise((r) => setTimeout(r, 1500)); // respeta el rate limit de BGG
}
