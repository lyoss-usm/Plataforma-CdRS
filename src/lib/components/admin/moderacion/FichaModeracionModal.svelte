<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '$lib/components/admin/primitives/Modal.svelte';
	import StatusBadge from '$lib/components/admin/primitives/StatusBadge.svelte';
	import BaneoModal from './BaneoModal.svelte';
	import { meson, formatearRut } from '$lib/data/junta.svelte';
	import { notificaciones } from '$lib/stores/notificaciones.svelte';
	import type { Sansano, Suspension } from '$lib/schemas';

	interface Props {
		sansano: Sansano;
		onclose: () => void;
	}

	let { sansano, onclose }: Props = $props();

	let baneando = $state(false);
	let confirmando = $state(false);
	let error = $state<string | null>(null);

	const cargo = $derived(sansano.idCargo === null ? null : meson.cargoDe(sansano.idCargo));
	const activa = $derived(meson.suspensionActiva(sansano.rutSansano));
	const historial = $derived(meson.suspensionesDe(sansano.rutSansano));
	const moderadorNombre = $derived(
		activa ? (meson.sansanoPorRut(activa.rutModerador)?.nombreSansano ?? null) : null
	);

	const claseBotonSecundario =
		'cursor-pointer rounded-base border border-glass-border px-4 py-2 text-on-surface-variant transition hover:bg-white/5 hover:text-on-surface';
	const claseBotonLevantar =
		'inline-flex cursor-pointer items-center gap-2 rounded-base border border-tertiary/50 bg-tertiary/10 px-4 py-2 font-semibold text-tertiary transition hover:bg-tertiary/20';

	function fechaCorta(iso: string): string {
		return new Date(iso).toLocaleDateString('es-CL', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function esVigente(suspension: Suspension): boolean {
		return activa !== null && suspension.idSuspencion === activa.idSuspencion;
	}

	function levantar() {
		if (!activa) {
			return;
		}

		const ok = meson.levantarSuspension(activa.idSuspencion);

		if (!ok) {
			error = 'La suspensión ya no está vigente.';
			return;
		}

		notificaciones.mostrar(
			'success',
			'Baneo levantado',
			`${sansano.nombreSansano} vuelve a poder solicitar préstamos. El registro queda como historial.`
		);
		confirmando = false;
		error = null;
	}
</script>

<Modal title={`Historial de ${sansano.nombreSansano}`} size="lg" {onclose}>
	{#if confirmando && activa}
		<div class="flex flex-col gap-4">
			<div class="flex items-start gap-3">
				<span
					class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-tertiary/50 bg-tertiary/15"
				>
					<Icon name="refresh-cw" class="h-4 w-4 text-tertiary" strokeWidth={2} />
				</span>
				<div class="flex flex-col gap-1">
					<p class="text-body-md font-medium text-on-surface">¿Levantar el baneo?</p>
					<p class="text-body-md text-on-surface-variant">
						Se pondrá fecha de término hoy al registro:
						<span class="font-semibold text-on-surface">{sansano.nombreSansano}</span> podrá volver a
						solicitar préstamos de inmediato.
					</p>
				</div>
			</div>

			{#if error}
				<p
					class="text-body-sm flex items-start gap-2 rounded-base border border-error/40 bg-error/15 p-3 text-error"
					role="alert"
				>
					<Icon name="circle-alert" class="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
					<span>{error}</span>
				</p>
			{/if}

			<div class="flex flex-wrap items-center justify-end gap-3">
				<button
					type="button"
					onclick={() => {
						confirmando = false;
						error = null;
					}}
					class={claseBotonSecundario}
				>
					Cancelar
				</button>
				<button type="button" onclick={levantar} class={claseBotonLevantar}>
					<Icon name="check" class="h-4 w-4" strokeWidth={2} />
					Levantar baneo
				</button>
			</div>
		</div>
	{:else}
		<div class="flex flex-col gap-4">
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div class="rounded-base border border-glass-border p-4">
					<p class="font-mono text-[10px] tracking-wider text-on-surface-variant/70 uppercase">
						Usuario
					</p>
					<p class="mt-1 font-display text-body-lg font-semibold text-on-surface">
						{sansano.nombreSansano}
					</p>
					<p class="font-mono text-xs text-on-surface-variant">
						{formatearRut(sansano.rutSansano, sansano.digitoVerificador)} · Rol
						{sansano.rolSansano}
					</p>
					<p class="text-body-sm break-all text-on-surface-variant">
						{sansano.correoInstitucional}
					</p>
					<p class="font-mono text-sm text-on-surface-variant">+56 {sansano.telefono}</p>
					{#if cargo}
						<span class="mt-2 inline-block">
							<StatusBadge tone="neutral">{cargo.nombreCargo}</StatusBadge>
						</span>
					{/if}
				</div>

				<div class="rounded-base border border-glass-border p-4">
					<p class="font-mono text-[10px] tracking-wider text-on-surface-variant/70 uppercase">
						Suspensión vigente
					</p>
					{#if activa}
						<div class="mt-2">
							<StatusBadge tone={activa.fechaTermino === null ? 'error' : 'warning'}>
								<Icon name="ban" class="h-3 w-3" strokeWidth={2} />
								{activa.fechaTermino === null ? 'Permanente' : 'Temporal'}
							</StatusBadge>
						</div>
						<p class="mt-2 text-body-md text-on-surface-variant">{activa.razon}</p>
						<p class="mt-1 text-xs text-on-surface-variant/70">
							Desde el {fechaCorta(activa.fechaInicio)}
							{#if activa.fechaTermino === null}
								· sin fecha de término
							{:else}
								· hasta el {fechaCorta(activa.fechaTermino)}
							{/if}
							{#if moderadorNombre}
								· moderado por {moderadorNombre}
							{/if}
						</p>
						<button
							type="button"
							onclick={() => (confirmando = true)}
							class={`${claseBotonLevantar} mt-3`}
						>
							<Icon name="refresh-cw" class="h-4 w-4" strokeWidth={2} />
							Levantar baneo
						</button>
					{:else}
						<p class="mt-2 text-body-md text-on-surface-variant">
							Este usuario no tiene suspensiones activas.
						</p>
						<button
							type="button"
							onclick={() => (baneando = true)}
							class="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-base border border-error/50 bg-error/15 px-3 py-1.5 font-mono text-xs tracking-wider text-error uppercase transition hover:bg-error/25"
						>
							<Icon name="ban" class="h-3.5 w-3.5" strokeWidth={2} />
							Bannear
						</button>
					{/if}
				</div>
			</div>

			<section>
				<p class="font-mono text-[10px] tracking-wider text-on-surface-variant/70 uppercase">
					Historial de suspensiones
				</p>
				{#if historial.length > 0}
					<ul class="mt-2 flex flex-col gap-2">
						{#each historial as suspension (suspension.idSuspencion)}
							<li
								class="flex flex-wrap items-start justify-between gap-3 rounded-base border border-glass-border bg-surface-container-lowest p-3"
							>
								<div class="min-w-0">
									<div class="flex flex-wrap items-center gap-2">
										<StatusBadge tone={esVigente(suspension) ? 'warning' : 'neutral'}>
											{esVigente(suspension) ? 'Vigente' : 'Historial'}
										</StatusBadge>
										<span class="font-mono text-xs text-on-surface-variant/70">
											{suspension.fechaTermino === null ? 'Permanente' : 'Temporal'}
										</span>
									</div>
									<p class="mt-1.5 text-body-md text-on-surface-variant">{suspension.razon}</p>
									<p class="mt-1 font-mono text-xs text-on-surface-variant/70">
										Desde {fechaCorta(suspension.fechaInicio)} · hasta
										{suspension.fechaTermino === null
											? 'sin fecha'
											: fechaCorta(suspension.fechaTermino)}
										· moderado por RUT {formatearRut(suspension.rutModerador, 0)}
									</p>
								</div>
								<span class="shrink-0 text-xs text-on-surface-variant/70">
									#{suspension.idSuspencion}
								</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-body-sm mt-2 text-on-surface-variant">
						Sin suspensiones registradas en el historial del usuario.
					</p>
				{/if}
			</section>

			<button type="button" onclick={onclose} class={`${claseBotonSecundario} w-fit`}>
				Cerrar
			</button>
		</div>
	{/if}
</Modal>

{#if baneando}
	<BaneoModal {sansano} onclose={() => (baneando = false)} />
{/if}
