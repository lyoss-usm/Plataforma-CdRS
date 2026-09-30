<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '$lib/components/admin/primitives/Modal.svelte';
	import { meson, type SolicitudContexto } from '$lib/data/junta.svelte';
	import { notificaciones } from '$lib/stores/notificaciones.svelte';

	interface Props {
		contexto: SolicitudContexto;
		onclose: () => void;
	}

	let { contexto, onclose }: Props = $props();

	const claseBotonSecundario =
		'cursor-pointer rounded-base border border-glass-border px-4 py-2 text-on-surface-variant transition hover:bg-white/5 hover:text-on-surface';
	const claseBotonDescartar =
		'inline-flex cursor-pointer items-center gap-2 rounded-base border border-error/50 bg-error/15 px-4 py-2 font-semibold text-error transition hover:bg-error/25';

	function descartar() {
		const ok = meson.descartarSolicitud(contexto.solicitud.idSolicitud);

		if (!ok) {
			notificaciones.mostrar(
				'error',
				'No se pudo descartar',
				'La solicitud ya no está «Pendiente».'
			);
			onclose();
			return;
		}

		notificaciones.mostrar(
			'info',
			`Solicitud #${contexto.solicitud.idSolicitud} descartada`,
			`Se marcó como «Rechazada»: ${contexto.juego.nombreJuego} solicitado por ${contexto.sansano.nombreSansano}.`
		);
		onclose();
	}
</script>

<Modal title="Descartar solicitud" size="sm" {onclose}>
	<div class="flex items-start gap-3">
		<span
			class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-error/50 bg-error/15"
		>
			<Icon name="ban" class="h-4 w-4 text-error" strokeWidth={2} />
		</span>
		<p class="text-body-md text-on-surface-variant">
			La solicitud
			<span class="font-mono font-semibold text-on-surface">#{contexto.solicitud.idSolicitud}</span>
			de
			<span class="font-semibold text-on-surface">{contexto.sansano.nombreSansano}</span>
			({contexto.juego.nombreJuego}) quedará marcada como «Rechazada» y no podrá atenderse después.
		</p>
	</div>

	{#snippet footer()}
		<button type="button" onclick={onclose} class={claseBotonSecundario}>Cancelar</button>
		<button type="button" onclick={descartar} class={claseBotonDescartar}>
			<Icon name="ban" class="h-4 w-4" strokeWidth={2} />
			Descartar
		</button>
	{/snippet}
</Modal>
