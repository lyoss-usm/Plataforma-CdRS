import { qrcodegen } from './qrcodegen';

export interface EtiquetaQr {
	idEjemplar: string;
	nombreJuego: string;
}

function escapar(texto: string): string {
	return texto
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function svgQr(texto: string): string {
	const qr = qrcodegen.QrCode.encodeText(texto, qrcodegen.QrCode.Ecc.LOW);
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

	return (
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}">` +
		`<rect width="${n}" height="${n}" fill="#ffffff"/><g fill="#000000">${modulos}</g></svg>`
	);
}

/**
 * Abre una ventana con las etiquetas (QR + idEjemplar + juego) y lanza la impresión, para pegarlas
 * en las cajas. Una etiqueta ocupa la hoja; varias van en grilla de 5 cm, sin cortarse entre
 * páginas. El QR codifica únicamente el idEjemplar, por eso no se almacena: se deriva al imprimir.
 *
 * Retorna false si el navegador bloqueó la ventana emergente.
 */
export function imprimirQrs(etiquetas: EtiquetaQr[]): boolean {
	if (etiquetas.length === 0) return true;

	const ventana = window.open('', '_blank', 'width=760,height=680');

	if (!ventana) {
		return false;
	}

	const una = etiquetas.length === 1;
	const tarjetas = etiquetas
		.map(
			({ idEjemplar, nombreJuego }) =>
				`<figure>${svgQr(idEjemplar)}<figcaption><b>${escapar(idEjemplar)}</b>` +
				`<span>${escapar(nombreJuego)}</span></figcaption></figure>`
		)
		.join('');
	const titulo = una ? `QR ${etiquetas[0].idEjemplar}` : `QR · ${etiquetas.length} ejemplares`;

	ventana.document.write(
		`<!doctype html><html lang="es"><head><meta charset="utf-8">` +
			`<title>${escapar(titulo)}</title>` +
			`<style>body{font-family:sans-serif;margin:16px}` +
			`main{display:grid;grid-template-columns:repeat(auto-fill,${una ? '12cm' : '5cm'});` +
			`gap:4mm;justify-content:center}` +
			`figure{margin:0;padding:3mm;border:1px dashed #999;text-align:center;break-inside:avoid}` +
			`svg{width:100%;height:auto;display:block}figcaption{display:flex;flex-direction:column;gap:1mm}` +
			`b{font-family:monospace;font-size:${una ? '20px' : '12px'}}` +
			`span{font-size:${una ? '18px' : '10px'};overflow-wrap:anywhere}` +
			`button{font-size:16px;padding:10px 24px;cursor:pointer;margin:0 auto 16px;display:block}` +
			`@media print{button{display:none}body{margin:0}}</style></head><body>` +
			`<button onclick="window.print()">Imprimir</button><main>${tarjetas}</main>` +
			`<script>window.onload = function () { window.print(); }; ` +
			'</scr' +
			`ipt></body></html>`
	);
	ventana.document.close();

	return true;
}

export function imprimirQr(idEjemplar: string, nombreJuego: string): boolean {
	return imprimirQrs([{ idEjemplar, nombreJuego }]);
}
