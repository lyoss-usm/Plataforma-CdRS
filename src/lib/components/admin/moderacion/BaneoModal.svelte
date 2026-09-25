<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '$lib/components/admin/primitives/Modal.svelte';
	import FormField from '$lib/components/admin/primitives/FormField.svelte';
	import { meson, RUT_STAFF, formatearRut } from '$lib/data/junta.svelte';
	import { notificaciones } from '$lib/stores/notificaciones.svelte';
	import type { Sansano } from '$lib/schemas';

	interface Props {
		sansano: Sansano;
		onclose: () => void;
	}

	type TipoBaneo = 'temporal' | 'permanente';

	let { sansano, onclose }: Props = $props();

	let tipo = $state<TipoBaneo>('temporal');
	let fecha = $state(new Date().toISOString().slice(0, 10));
	let razon = $state('');
	let tocadoRazon = $state(false);
	let tocadoFecha = $state(false);
	let intentoEnvio = $state(false);

	const claseInputValido =
		'w-full rounded-base border border-glass-border bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/70 focus:border-primary/50';
	const claseInputInvalido =
		'w-full rounded-base border border-error bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/70 focus:border-primary/50';
	const claseBotonSecundario =
		'cursor-pointer rounded-base border border-glass-border px-4 py-2 text-on-surface-variant transition hover:bg-white/5 hover:text-on-surface';
	const claseBotonBannear =
		'inline-flex cursor-pointer items-center gap-2 rounded-base border border-error/50 bg-error/15 px-4 py-2 font-semibold text-error transition hover:bg-error/25';

	const errorRazon = $derived(
		tocadoRazon || intentoEnvio
			? razon.trim() === ''
				? 'Ingresa una razón del baneo.'
				: null
			: null
	);
	const errorFecha = $derived(
		tipo === 'temporal' && (tocadoFecha || intentoEnvio)
			? fecha === ''
				? 'Selecciona una fecha de término.'
				: fecha < new Date().toISOString().slice(0, 10)
					? 'La fecha debe ser hoy o posterior.'
					: null
			: null
	);
	const hayErrores = $derived(errorRazon !== null || errorFecha !== null);

	function aplicar() {
		intentoEnvio = true;

		if (hayErrores) {
			return;
		}

		meson.crearSuspension({
			rutSansano: sansano.rutSansano,
			fechaTermino: tipo === 'temporal' ? `${fecha}T23:59:59.000Z` : null,
			razon: razon.trim(),
			rutModerador: RUT_STAFF
		});

		notificaciones.mostrar(
			'info',
			tipo === 'permanente' ? 'Baneo permanente aplicado' : 'Baneo temporal aplicado',
			`${sansano.nombreSansano} no podrá realizar nuevas solicitudes${
				tipo === 'permanente' ? '.' : ` hasta el ${fecha}.`
			}`
		);
		onclose();
	}
</script>

<Modal title={`Bannear a ${sansano.nombreSansano}`} size="md" {onclose}>
	<p class="mb-4 font-mono text-xs text-on-surface-variant">
		{formatearRut(sansano.rutSansano, sansano.digitoVerificador)} · {sansano.correoInstitucional}
	</p>

	<form
		onsubmit={(e) => {
			e.preventDefault();
			aplicar();
		}}
		class="flex flex-col gap-4"
		novalidate
	>
		<fieldset>
			<legend
				class="mb-2 font-mono text-[10px] tracking-wider text-on-surface-variant/70 uppercase"
			>
				Tipo de baneo
			</legend>
			<div class="flex flex-col gap-2" role="radiogroup" aria-label="Tipo de baneo">
				<label
					class="flex cursor-pointer items-center gap-2.5 rounded-base border p-3 transition hover:bg-white/5 {tipo ===
					'temporal'
						? 'border-primary/50 bg-primary/5'
						: 'border-glass-border'}"
				>
					<input
						type="radio"
						name="tipo-baneo"
						bind:group={tipo}
						value="temporal"
						class="accent-primary"
					/>
					<span class="min-w-0">
						<span class="block text-body-md font-medium text-on-surface">Temporal</span>
						<span class="text-body-sm block text-on-surface-variant">
							Vence en una fecha: el usuario vuelve a operar normalmente al expirar.
						</span>
					</span>
				</label>
				<label
					class="flex cursor-pointer items-center gap-2.5 rounded-base border p-3 transition hover:bg-white/5 {tipo ===
					'permanente'
						? 'border-primary/50 bg-primary/5'
						: 'border-glass-border'}"
				>
					<input
						type="radio"
						name="tipo-baneo"
						bind:group={tipo}
						value="permanente"
						class="accent-primary"
					/>
					<span class="min-w-0">
						<span class="block text-body-md font-medium text-on-surface">Permanente</span>
						<span class="text-body-sm block text-on-surface-variant">
							Sin fecha de término: solo puede revertirse levantando el baneo manualmente.
						</span>
					</span>
				</label>
			</div>
		</fieldset>

		{#if tipo === 'temporal'}
			<FormField label="Fecha de término" htmlFor="baneo-fecha" error={errorFecha}>
				<input
					id="baneo-fecha"
					type="date"
					min={new Date().toISOString().slice(0, 10)}
					bind:value={fecha}
					onblur={() => (tocadoFecha = true)}
					aria-invalid={errorFecha !== null}
					aria-describedby={errorFecha ? 'baneo-fecha-error' : undefined}
					class={errorFecha ? claseInputInvalido : claseInputValido}
				/>
			</FormField>
		{/if}

		<FormField label="Razón" htmlFor="baneo-razon" error={errorRazon}>
			<textarea
				id="baneo-razon"
				rows="3"
				bind:value={razon}
				onblur={() => (tocadoRazon = true)}
				placeholder="Motivo del baneo para el historial…"
				aria-invalid={errorRazon !== null}
				aria-describedby={errorRazon ? 'baneo-razon-error' : undefined}
				class="w-full resize-none rounded-base border bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/70 focus:border-primary/50 {errorRazon
					? 'border-error'
					: 'border-glass-border'}"
			></textarea>
		</FormField>

		<p
			class="text-body-sm flex items-start gap-2 rounded-base border border-glass-border bg-black/20 p-3 text-on-surface-variant"
		>
			<Icon name="info" class="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
			<span>
				El baneo le impide pedir préstamos nuevos, tanto por la web como en el mesón: no cancela
				préstamos que ya tenga activos ni borra su historial.
			</span>
		</p>

		<div class="flex flex-wrap items-center justify-end gap-3">
			<button type="button" onclick={onclose} class={claseBotonSecundario}>Cancelar</button>
			<button type="submit" class={claseBotonBannear}>
				<Icon name="ban" class="h-4 w-4" strokeWidth={2} />
				Aplicar baneo
			</button>
		</div>
	</form>
</Modal>
