<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '../primitives/Modal.svelte';
	import { QR_DEMO_IDS } from '$lib/data/junta.svelte';

	interface Props {
		oncerrar: () => void;
		onresultado: (idEjemplar: string) => void;
	}

	let { oncerrar, onresultado }: Props = $props();

	let escaneos = $state(0);

	function simularEscaneo() {
		const id = QR_DEMO_IDS[escaneos % QR_DEMO_IDS.length];
		escaneos += 1;
		onresultado(id);
	}
</script>

<Modal title="Escanear QR del ejemplar" size="md" onclose={oncerrar}>
	<p class="text-body-md text-on-surface-variant">
		Apunta la cámara al QR del ejemplar que está en el mesón para cargar su ficha al instante.
	</p>

	<div class="relative mx-auto mt-6 h-52 w-52 rounded-base border border-primary/30">
		<span
			class="absolute -top-px -left-px h-8 w-8 rounded-tl-lg border-t-2 border-l-2 border-primary"
		></span>
		<span
			class="absolute -top-px -right-px h-8 w-8 rounded-tr-lg border-t-2 border-r-2 border-primary"
		></span>
		<span
			class="absolute -bottom-px -left-px h-8 w-8 rounded-bl-lg border-b-2 border-l-2 border-primary"
		></span>
		<span
			class="absolute -right-px -bottom-px h-8 w-8 rounded-br-lg border-r-2 border-b-2 border-primary"
		></span>

		<div
			class="absolute inset-6 flex items-center justify-center overflow-hidden rounded-sm"
			aria-hidden="true"
		>
			<div class="h-px w-full animate-pulse bg-primary/40"></div>
		</div>

		<div class="absolute inset-0 flex flex-col items-center justify-center gap-2">
			<Icon name="scan-line" class="h-10 w-10 text-primary" strokeWidth={1.6} />
			<span class="font-mono text-xs tracking-wider text-on-surface-variant uppercase">
				Cámara simulada
			</span>
		</div>
	</div>

	<p class="text-body-sm mt-4 text-on-surface-variant/70">
		En la maqueta no hay acceso a cámara real: usa «Simular escaneo» para cargar un ejemplar de
		prueba.
	</p>

	{#snippet footer()}
		<button
			type="button"
			onclick={simularEscaneo}
			class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-base border border-primary/50 bg-primary/10 px-6 py-2 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow"
		>
			<Icon name="scan-line" class="h-4 w-4" /> Simular escaneo
		</button>
	{/snippet}
</Modal>
