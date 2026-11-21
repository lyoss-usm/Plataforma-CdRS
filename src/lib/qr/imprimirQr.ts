import { qrcodegen } from './qrcodegen';

function escapar(texto: string): string {
	return texto
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * Abre una ventana solo con la tarjeta del QR (idEjemplar + juego) y lanza la
 * impresión, para pegar el código en la caja física. El QR codifica únicamente
 * el idEjemplar, por eso no se almacena: se deriva al mostrar.
 *
 * Retorna false si el navegador bloqueó la ventana emergente.
 */
export function imprimirQr(idEjemplar: string, nombreJuego: string): boolean {
	const qr = qrcodegen.QrCode.encodeText(idEjemplar, qrcodegen.QrCode.Ecc.LOW);
	const borde = 2;
	const n = qr.size + borde * 2;

	let modulos = '';

	for (let y = 0; y < n; y += 1) {
		for (let x = 0; x < n; x += 1) {
			const dentro = x >= borde && y >= borde && x - borde < qr.size && y - borde < qr.size;

			if (dentro && qr.getModule(x - borde, y - borde)) {
				modulos += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
			}
		}
	}

	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="480" height="480">` +
		`<rect width="${n}" height="${n}" fill="#ffffff"/><g fill="#000000">${modulos}</g></svg>`;

	const ventana = window.open('', '_blank', 'width=560,height=680');

	if (!ventana) {
		return false;
	}

	ventana.document.write(
		`<!doctype html><html lang="es"><head><meta charset="utf-8">` +
			`<title>QR ${escapar(idEjemplar)}</title>` +
			`<style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;` +
			`gap:8px;padding:32px;text-align:center}h1{font-size:22px;margin:0}p{font-family:monospace;` +
			`font-size:18px;margin:0 0 12px}button{font-size:16px;padding:10px 24px;cursor:pointer}` +
			`@media print{button{display:none}}</style></head><body>` +
			`<h1>${escapar(nombreJuego)}</h1><p>${escapar(idEjemplar)}</p>${svg}` +
			`<button onclick="window.print()">Imprimir</button>` +
			`<script>window.onload = function () { window.print(); }; ` +
			'</scr' +
			`ipt></body></html>`
	);
	ventana.document.close();

	return true;
}
