<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '../primitives/Modal.svelte';
	import { Html5Qrcode } from 'html5-qrcode';
	import { onDestroy, onMount } from 'svelte';

	interface Props {
		oncerrar: () => void;
		onresultado: (idEjemplar: string) => void;
	}

	let { oncerrar, onresultado }: Props = $props();

	let escaneos = $state(0);
	let html5QrCode: Html5Qrcode | null = null;
	let cameraActive = $state(false);
	let cameraError = $state<string | null>(null);
	const elementId = 'reader-container';
	const simulacion = import.meta.env.DEV;

	// Solo en desarrollo: ejemplares que crea el seed (`make seed-*`).
	const QR_DEMO_IDS = [
		'SEED-BASE-000001',
		'SEED-BASE-000002',
		'SEED-BASE-000003',
		'SEED-EXP-000001'
	];

	function simularEscaneo() {
		const id = QR_DEMO_IDS[escaneos % QR_DEMO_IDS.length];
		escaneos += 1;
		detenerCamara();
		onresultado(id);
	}

	async function iniciarCamara() {
		cameraError = null;
		try {
			html5QrCode = new Html5Qrcode(elementId);
			await html5QrCode.start(
				{ facingMode: 'environment' },
				// Sin qrbox: se escanea el cuadro completo y el marco del visor es solo una guía.
				{ fps: 10 },
				(decodedText) => {
					detenerCamara();
					onresultado(decodedText.trim().toUpperCase());
				},
				() => {}
			);
			cameraActive = true;
		} catch (err) {
			console.error('Error al iniciar la cámara:', err);
			cameraError = simulacion
				? 'No se pudo acceder a la cámara. Puedes usar la simulación.'
				: 'No se pudo acceder a la cámara. Cierra y escribe el código a mano.';
			cameraActive = false;
		}
	}

	async function detenerCamara() {
		if (html5QrCode && cameraActive) {
			try {
				await html5QrCode.stop();
				await html5QrCode.clear();
			} catch (e) {
				console.error('Error al detener la cámara', e);
			}
			cameraActive = false;
			html5QrCode = null;
		}
	}

	// El lector se monta con este ancho de layout (resolución del canvas que se decodifica) y se
	// escala visualmente para cubrir el visor. `transform` no altera clientWidth/clientHeight, que la
	// librería usa para copiar cada cuadro al canvas: así el QR no llega deformado.
	const ANCHO_LECTOR = 720;
	let visor = $state<HTMLDivElement>();
	let escala = $state(1);

	function ajustarVisor() {
		const lector = document.getElementById(elementId);

		if (!visor || !lector || lector.offsetHeight === 0) {
			return;
		}

		escala = Math.max(
			visor.clientWidth / lector.offsetWidth,
			visor.clientHeight / lector.offsetHeight
		);
	}

	onMount(() => {
		iniciarCamara();

		// Recalcula al cargar el video (cambia el alto del lector) y al redimensionar el visor.
		const observador = new ResizeObserver(ajustarVisor);
		const lector = document.getElementById(elementId);

		if (visor) observador.observe(visor);
		if (lector) observador.observe(lector);

		return () => observador.disconnect();
	});

	onDestroy(() => {
		detenerCamara();
	});
</script>

<Modal
	title="Escanear QR del ejemplar"
	size="md"
	onclose={() => {
		detenerCamara();
		oncerrar();
	}}
>
	<p class="text-body-md text-on-surface-variant">
		Apunta la cámara al QR del ejemplar que está en el mesón para cargar su ficha al instante.
	</p>

	<!-- Visor: el video cubre todo el recuadro (cover) y el marco centrado indica dónde poner el QR. -->
	<div
		bind:this={visor}
		class="relative mx-auto mt-6 aspect-3/4 w-full max-w-sm overflow-hidden rounded-base border border-primary/30 bg-black"
	>
		<div
			class="absolute top-1/2 left-1/2 w-max"
			style:transform="translate(-50%, -50%) scale({escala})"
		>
			<div id={elementId} style:width="{ANCHO_LECTOR}px"></div>
		</div>

		<div
			class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
			aria-hidden="true"
		>
			<!-- La sombra extendida oscurece levemente lo que queda fuera del marco sin ocultarlo. -->
			<div class="relative aspect-square w-3/5 rounded-lg shadow-[0_0_0_100vmax_rgb(0_0_0/0.35)]">
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
			</div>
		</div>

		{#if !cameraActive && !cameraError}
			<div
				class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-surface-container-low"
			>
				<Icon name="loader-circle" class="h-8 w-8 animate-spin text-primary" />
				<span class="font-mono text-xs tracking-wider text-on-surface-variant uppercase">
					Iniciando cámara...
				</span>
			</div>
		{/if}
	</div>

	{#if cameraError}
		<p class="text-body-sm mt-4 text-error" role="alert">
			{cameraError}
		</p>
	{/if}

	{#if simulacion}
		<p class="text-body-sm mt-4 text-on-surface-variant/70">
			Desarrollo: sin cámara, usa «Simular escaneo» para cargar un ejemplar del seed.
		</p>
	{/if}

	{#snippet footer()}
		{#if simulacion}
			<button
				type="button"
				onclick={simularEscaneo}
				class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-base border border-primary/50 bg-primary/10 px-6 py-2 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow"
			>
				<Icon name="scan-line" class="h-4 w-4" /> Simular escaneo
			</button>
		{/if}
	{/snippet}
</Modal>
