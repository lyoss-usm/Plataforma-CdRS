<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '$lib/components/admin/primitives/Modal.svelte';
	import StatusBadge from '$lib/components/admin/primitives/StatusBadge.svelte';
	import { meson, RUT_STAFF, formatearRut, type SolicitudContexto } from '$lib/data/junta.svelte';
	import { notificaciones } from '$lib/stores/notificaciones.svelte';

	interface Props {
		contexto: SolicitudContexto;
		onclose: () => void;
	}

	let { contexto, onclose }: Props = $props();

	const opciones = $derived(
		(contexto.ejemplar.estadoEjemplar === 'En bodega' ? [contexto.ejemplar] : []).concat(
			contexto.copiasDisponibles.filter((c) => c.idEjemplar !== contexto.ejemplar.idEjemplar)
		)
	);
	const suspension = $derived(meson.suspensionActiva(contexto.sansano.rutSansano));

	function seleccionInicial(): string | null {
		if (contexto.ejemplar.estadoEjemplar === 'En bodega') {
			return contexto.solicitud.idEjemplar;
		}

		return (
			contexto.copiasDisponibles.find((c) => c.idEjemplar !== contexto.ejemplar.idEjemplar)
				?.idEjemplar ?? null
		);
	}

	let seleccion = $state<string | null>(seleccionInicial());
	let error = $state<string | null>(null);

	const copiaSeleccionada = $derived(
		opciones.find((opcion) => opcion.idEjemplar === seleccion) ?? null
	);

	const claseBotonPrimario =
		'inline-flex cursor-pointer items-center gap-2 rounded-base border border-primary/50 bg-primary/10 px-4 py-2 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow';
	const claseBotonSecundario =
		'cursor-pointer rounded-base border border-glass-border px-4 py-2 text-on-surface-variant transition hover:bg-white/5 hover:text-on-surface';

	function confirmar() {
		const resultado = meson.atenderSolicitud({
			idSolicitud: contexto.solicitud.idSolicitud,
			idEjemplar: seleccion ?? undefined,
			rutPrestador: RUT_STAFF
		});

		if (!resultado.ok) {
			error = resultado.motivo;
			return;
		}

		notificaciones.mostrar(
			'success',
			`Solicitud #${contexto.solicitud.idSolicitud} atendida`,
			`Préstamo #${resultado.prestamo.idPrestamo} iniciado · ${contexto.ejemplar.idEjemplar} ${contexto.juego.nombreJuego} con ${contexto.sansano.nombreSansano}.`
		);
		onclose();
	}
</script>

<Modal title={`Atender solicitud #${contexto.solicitud.idSolicitud}`} {onclose}>
	<div class="flex flex-col gap-4">
		<div class="flex flex-col gap-4">
			<div class="rounded-base border border-glass-border p-4">
				<p class="font-mono text-[10px] tracking-wider text-on-surface-variant/70 uppercase">
					Solicitante
				</p>
				<p class="mt-1 font-display text-body-lg font-semibold text-on-surface">
					{contexto.sansano.nombreSansano}
				</p>
				<p class="font-mono text-xs text-on-surface-variant">
					{formatearRut(contexto.sansano.rutSansano, contexto.sansano.digitoVerificador)} · Rol
					{contexto.sansano.rolSansano}
				</p>
				<p class="text-body-sm text-on-surface-variant">{contexto.sansano.correoInstitucional}</p>
				<span class="mt-2 inline-block">
					{#if suspension}
						<StatusBadge tone="error">
							<Icon name="ban" class="h-3 w-3" strokeWidth={2} /> Suspendido
						</StatusBadge>
					{:else}
						<StatusBadge tone="success">Sin suspensiones</StatusBadge>
					{/if}
				</span>
			</div>

			<div class="rounded-base border border-glass-border p-4">
				<div class="flex gap-4">
					<div
						class="relative h-28 w-24 shrink-0 overflow-hidden rounded-base bg-surface-container-lowest"
					>
						{#if contexto.juego.pathImagen}
							<img
								src={contexto.juego.pathImagen}
								alt={`Portada de ${contexto.juego.nombreJuego}`}
								class="h-full w-full object-cover"
							/>
						{:else}
							<div
								class="flex h-full items-center justify-center px-2 text-center font-mono text-xs text-on-surface-variant"
								role="img"
								aria-label={`Sin imagen para ${contexto.juego.nombreJuego}`}
							>
								Sin imagen
							</div>
						{/if}
					</div>

					<div class="min-w-0">
						<p class="font-mono text-[10px] tracking-wider text-on-surface-variant/70 uppercase">
							Juego solicitado
						</p>
						<p class="mt-1 font-display text-body-lg font-semibold text-on-surface">
							{contexto.juego.nombreJuego}
						</p>
						<p class="flex flex-wrap gap-1.5 font-mono text-xs text-on-surface-variant">
							<span class="rounded-full border border-glass-border bg-on-surface/10 px-2 py-0.5">
								{contexto.ejemplar.idEjemplar}
							</span>
							{#if contexto.solicitud.idExpansion}
								<span
									class="rounded-full border border-secondary/40 bg-secondary/10 px-2 py-0.5 text-secondary"
								>
									+ {contexto.solicitud.idExpansion}
								</span>
							{/if}
						</p>
						<p class="mt-1 text-xs text-on-surface-variant">
							Retiro agendado:
							{new Date(contexto.solicitud.fechaSeleccionada).toLocaleDateString('es-CL', {
								weekday: 'short',
								day: '2-digit',
								month: 'short',
								year: 'numeric'
							})}
						</p>
					</div>
				</div>
			</div>
		</div>

		{#if suspension}
			<p
				class="text-body-sm flex items-start gap-2 rounded-base border border-error/40 bg-error/15 p-3 text-error"
				role="alert"
			>
				<Icon name="ban" class="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
				<span>
					El sansano tiene una suspensión activa y no puede recibir préstamos.
					<span class="text-on-surface/80">{suspension.razon}</span>
				</span>
			</p>
		{/if}

		<section>
			{#if opciones.length > 1}
				<fieldset>
					<legend
						class="mb-2 font-mono text-[10px] tracking-wider text-on-surface-variant/70 uppercase"
					>
						Elegir copia a prestar
					</legend>
					<div class="flex flex-col gap-2">
						{#each opciones as opcion (opcion.idEjemplar)}
							<label
								class="flex cursor-pointer items-center gap-2.5 rounded-base border p-3 transition hover:bg-white/5 {seleccion ===
								opcion.idEjemplar
									? 'border-primary/50 bg-primary/5'
									: 'border-glass-border'}"
							>
								<input
									type="radio"
									name="solicitud-ejemplar"
									bind:group={seleccion}
									value={opcion.idEjemplar}
									class="accent-primary"
								/>
								<span class="min-w-0">
									<span class="font-mono text-sm font-semibold text-on-surface">
										{opcion.idEjemplar}
									</span>
									{#if opcion.idEjemplar === contexto.solicitud.idEjemplar}
										<span class="ml-2 text-xs text-on-surface-variant/70">asignada</span>
									{/if}
								</span>
								<span class="ml-auto">
									{#if opcion.estadoCompletitud === 'Incompleto'}
										<StatusBadge tone="warning">Incompleto</StatusBadge>
									{:else}
										<StatusBadge tone="neutral">Completo</StatusBadge>
									{/if}
								</span>
							</label>
						{/each}
					</div>
					<p class="mt-2 text-xs text-on-surface-variant/70">
						La reasignación es un respaldo: se usa solo si la copia original dejó de estar
						disponible.
					</p>
				</fieldset>
			{/if}

			{#if copiaSeleccionada?.comentarios}
				<p
					class="text-body-sm mt-3 flex items-start gap-2 rounded-base border border-glass-border bg-black/20 p-3 text-on-surface-variant"
				>
					<Icon name="info" class="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
					<span>
						<span class="font-mono font-semibold text-on-surface"
							>{copiaSeleccionada.idEjemplar}</span
						>
						<span> · {copiaSeleccionada.comentarios}</span>
					</span>
				</p>
			{/if}
		</section>

		{#if error}
			<p
				class="text-body-sm flex items-start gap-2 rounded-base border border-error/40 bg-error/15 p-3 text-error"
				role="alert"
			>
				<Icon name="circle-alert" class="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
				<span>{error}</span>
			</p>
		{/if}
	</div>

	{#snippet footer()}
		<button type="button" onclick={onclose} class={claseBotonSecundario}>Cancelar</button>
		<button
			type="button"
			onclick={confirmar}
			disabled={seleccion === null || suspension !== null}
			class="{claseBotonPrimario} disabled:cursor-not-allowed disabled:opacity-40"
		>
			<Icon name="check" class="h-4 w-4" strokeWidth={2} />
			Confirmar préstamo
		</button>
	{/snippet}
</Modal>
