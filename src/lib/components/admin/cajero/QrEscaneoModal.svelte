<script lang="ts">
    import Icon from '$lib/components/Icon.svelte';
    import Modal from '../primitives/Modal.svelte';
    import { QR_DEMO_IDS } from '$lib/data/junta.svelte';
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
                {
                    fps: 10,
                    qrbox: { width: 200, height: 200 }
                },
                (decodedText) => {
                    detenerCamara();
                    onresultado(decodedText.trim().toUpperCase());
                },
                () => {}
            );
            cameraActive = true;
        } catch (err) {
            console.error('Error al iniciar la cámara:', err);
            cameraError = 'No se pudo acceder a la cámara. Puedes usar la simulación.';
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

    onMount(() => {
        iniciarCamara();
    });

    onDestroy(() => {
        detenerCamara();
    });
</script>

<Modal title="Escanear QR del ejemplar" size="md" onclose={() => { detenerCamara(); oncerrar(); }}>
    <p class="text-body-md text-on-surface-variant">
        Apunta la cámara al QR del ejemplar que está en el mesón para cargar su ficha al instante.
    </p>

    <div class="relative mx-auto mt-6 h-52 w-52 overflow-hidden rounded-base border border-primary/30 bg-black/40 flex items-center justify-center">
        <div id={elementId} class="absolute inset-0 h-full w-full"></div>

        <span class="absolute -top-px -left-px h-8 w-8 rounded-tl-lg border-t-2 border-l-2 border-primary z-10 pointer-events-none"></span>
        <span class="absolute -top-px -right-px h-8 w-8 rounded-tr-lg border-t-2 border-r-2 border-primary z-10 pointer-events-none"></span>
        <span class="absolute -bottom-px -left-px h-8 w-8 rounded-bl-lg border-b-2 border-l-2 border-primary z-10 pointer-events-none"></span>
        <span class="absolute -right-px -bottom-px h-8 w-8 rounded-br-lg border-r-2 border-b-2 border-primary z-10 pointer-events-none"></span>

        {#if !cameraActive && !cameraError}
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 z-20 bg-surface-container-low">
                <Icon name="loader-2" class="h-8 w-8 animate-spin text-primary" />
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

    <p class="text-body-sm mt-4 text-on-surface-variant/70">
        Si no dispones de cámara web o estás en un entorno de pruebas, usa la opción de simulación.
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