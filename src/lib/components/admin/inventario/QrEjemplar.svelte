<script lang="ts">
	import { qrcodegen } from '$lib/qr/qrcodegen';

	interface Props {
		/** idEjemplar codificado (el QR se deriva, no se almacena). */
		texto: string;
		tamano?: number;
		borde?: number;
	}

	let { texto, tamano = 96, borde = 2 }: Props = $props();

	const qr = $derived(qrcodegen.QrCode.encodeText(texto, qrcodegen.QrCode.Ecc.LOW));
	const lado = $derived(qr.size + borde * 2);

	const celdas = $derived.by(() => {
		const oscuras: Array<[number, number]> = [];

		for (let y = 0; y < lado; y += 1) {
			for (let x = 0; x < lado; x += 1) {
				const dentro = x >= borde && y >= borde && x - borde < qr.size && y - borde < qr.size;

				if (dentro && qr.getModule(x - borde, y - borde)) {
					oscuras.push([x, y]);
				}
			}
		}

		return oscuras;
	});
</script>

<svg
	viewBox="0 0 {lado} {lado}"
	width={tamano}
	height={tamano}
	role="img"
	aria-label={`Código QR de ${texto}`}
	class="shrink-0 rounded-base border border-glass-border bg-white p-1"
>
	<rect width={lado} height={lado} fill="#ffffff" />
	{#each celdas as [x, y] (`${x}-${y}`)}
		<rect {x} {y} width="1" height="1" fill="#000000" />
	{/each}
</svg>
