<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '$lib/components/admin/primitives/Modal.svelte';
	import StatusBadge from '$lib/components/admin/primitives/StatusBadge.svelte';
	import Dropdown from '$lib/components/admin/primitives/Dropdown.svelte';
	import FormField from '$lib/components/admin/primitives/FormField.svelte';
	import TelefonoInput from '$lib/components/forms/TelefonoInput.svelte';
	import { formatearRut } from '$lib/data/junta.svelte';
	import { formatearTelefono } from '$lib/schemas';
	import { notificaciones } from '$lib/stores/notificaciones.svelte';
	import { dominiosCorreoInstitucional } from '$lib/schemas/sansano';
	import type { StaffFila } from '$lib/schemas';
	import type { SubmitFunction } from '@sveltejs/kit';

	interface Props {
		ficha: StaffFila;
		cargos: { idCargo: number; nombreCargo: string }[];
		/** Permisos efectivos del cargo actual (`CargoPermiso`). */
		permisos: string[];
		puedeGestionar: boolean;
		onclose: () => void;
	}

	type Modo = 'ver' | 'editar' | 'confirmar';
	type Accion = 'baja' | 'eliminar' | null;
	type CampoValidable = 'nombre' | 'telefono' | 'correo' | 'cargo';

	let { ficha: sansano, cargos, permisos, puedeGestionar: gestiona, onclose }: Props = $props();

	const formatoTelefono = /^\d{8}$/;
	// Campo del formulario del servidor → campo local.
	const campoLocal: Record<string, CampoValidable> = {
		nombreSansano: 'nombre',
		telefono: 'telefono',
		correoInstitucional: 'correo',
		idCargo: 'cargo'
	};

	let modo = $state<Modo>('ver');
	let accion = $state<Accion>(null);
	let errorGestion = $state<string | null>(null);
	let enviando = $state(false);

	let nombre = $state('');
	let telefono = $state('');
	let correo = $state('');
	let cargoSeleccion = $state('');
	let tocado = $state<Record<CampoValidable, boolean>>({
		nombre: false,
		telefono: false,
		correo: false,
		cargo: false
	});
	let intentoGuardado = $state(false);
	let erroresServidor = $state<Partial<Record<CampoValidable, string>>>({});

	const itemsCargo = $derived(
		cargos.map((c) => ({ value: String(c.idCargo), label: c.nombreCargo }))
	);

	const suspension = $derived(sansano.suspendido);
	const historial = $derived({
		solicitudes: sansano.solicitudes,
		prestamos: sansano.prestamos,
		suspensiones: sansano.suspensiones
	});
	const totalHistorial = $derived(
		historial.solicitudes + historial.prestamos + historial.suspensiones
	);

	const claseBotonSecundario =
		'cursor-pointer rounded-base border border-glass-border px-4 py-2 text-on-surface-variant transition hover:bg-white/5 hover:text-on-surface';
	const claseBotonPrimario =
		'inline-flex cursor-pointer items-center gap-2 rounded-base border border-primary/50 bg-primary/10 px-4 py-2 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow disabled:cursor-not-allowed disabled:opacity-40';
	const claseBotonPeligro =
		'inline-flex cursor-pointer items-center gap-2 rounded-base border border-error/50 bg-error/15 px-4 py-2 font-semibold text-error transition hover:bg-error/25 disabled:cursor-not-allowed disabled:opacity-40';
	const claseBotonBaja =
		'inline-flex cursor-pointer items-center gap-2 rounded-base border border-tertiary/50 bg-tertiary/10 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-tertiary transition hover:bg-tertiary/20';
	const claseInput =
		'w-full rounded-base border bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/70 focus:border-primary/50';
	const claseInputValido = `${claseInput} border-glass-border`;
	const claseInputInvalido = `${claseInput} border-error`;

	function toneCargo(nombreCargo: string): 'error' | 'info' | 'neutral' {
		if (nombreCargo === 'Directivo') return 'error';
		if (nombreCargo === 'Senior') return 'info';

		return 'neutral';
	}

	function iniciarEdicion() {
		nombre = sansano.nombreSansano;
		telefono = String(sansano.telefono);
		correo = sansano.correoInstitucional;
		cargoSeleccion = sansano.idCargo === null ? '' : String(sansano.idCargo);
		tocado = { nombre: false, telefono: false, correo: false, cargo: false };
		intentoGuardado = false;
		erroresServidor = {};
		errorGestion = null;
		modo = 'editar';
	}

	function marcarTocado(campo: CampoValidable) {
		tocado[campo] = true;
	}

	function validarCampo(campo: CampoValidable): string | null {
		switch (campo) {
			case 'nombre':
				return nombre.trim() === '' ? 'Ingresa el nombre del staff.' : null;
			case 'telefono':
				return telefono.trim() === ''
					? 'Ingresa el teléfono.'
					: !formatoTelefono.test(telefono.trim())
						? 'Ingresa los 8 dígitos posteriores a +56 9.'
						: null;
			case 'correo': {
				if (correo.trim() === '') {
					return 'Ingresa el correo institucional.';
				}

				const dominio = correo.split('@').at(-1)?.toLowerCase();

				if (!dominio || !dominiosCorreoInstitucional.some((permitido) => permitido === dominio)) {
					return 'Usa un correo institucional USM (…@usm.cl).';
				}

				return null;
			}
			case 'cargo':
				return cargoSeleccion === '' ? 'Selecciona un cargo.' : null;
		}
	}

	function mostrarError(campo: CampoValidable, mensaje: string | null): string | null {
		return (tocado[campo] || intentoGuardado ? mensaje : null) ?? erroresServidor[campo] ?? null;
	}

	const errores = $derived({
		nombre: mostrarError('nombre', validarCampo('nombre')),
		telefono: mostrarError('telefono', validarCampo('telefono')),
		correo: mostrarError('correo', validarCampo('correo')),
		cargo: mostrarError('cargo', validarCampo('cargo'))
	});
	const hayErrores = $derived(Object.values(errores).some(Boolean));

	function pedirBaja() {
		accion = 'baja';
		errorGestion = null;
		modo = 'confirmar';
	}

	function pedirEliminacion() {
		accion = 'eliminar';
		errorGestion = null;
		modo = 'confirmar';
	}

	type Resultado = { ok: boolean; mensaje: string; errores: Record<string, string> };

	// Los tres formularios (editar, baja, eliminar) comparten el manejo del resultado del servidor.
	const alEditar: SubmitFunction = ({ formData, cancel }) => {
		intentoGuardado = true;
		erroresServidor = {};

		if (hayErrores) {
			cancel();
			return;
		}

		formData.set('telefono', telefono.replace(/\D/g, ''));
		enviando = true;

		return async ({ result, update }) => {
			enviando = false;

			if (result.type === 'success') {
				notificaciones.mostrar('success', 'Staff actualizado', (result.data as Resultado).mensaje);
				modo = 'ver';
				await update({ reset: false });
			} else if (result.type === 'failure') {
				const datos = result.data as Resultado;
				erroresServidor = {};
				for (const [campo, mensaje] of Object.entries(datos.errores)) {
					const local = campoLocal[campo];
					if (local) erroresServidor[local] = mensaje;
				}
				errorGestion = Object.keys(datos.errores).length ? null : datos.mensaje;
			} else {
				await update({ reset: false });
			}
		};
	};

	const alGestionar: SubmitFunction = () => {
		enviando = true;

		return async ({ result, update }) => {
			enviando = false;

			if (result.type === 'success') {
				const datos = result.data as Resultado;
				notificaciones.mostrar(
					accion === 'baja' ? 'info' : 'success',
					accion === 'baja' ? 'Staff dado de baja' : 'Registro eliminado',
					datos.mensaje
				);
				await update({ reset: false });
				onclose();
			} else if (result.type === 'failure') {
				errorGestion = (result.data as Resultado).mensaje;
				modo = 'ver';
			} else {
				await update({ reset: false });
			}
		};
	};
</script>

<Modal title={`Ficha de ${sansano.nombreSansano}`} size="lg" {onclose}>
	{#if modo === 'confirmar'}
		<form
			id="ficha-gestion"
			method="POST"
			action={accion === 'baja' ? '?/baja' : '?/eliminar'}
			use:enhance={alGestionar}
			class="flex items-start gap-3"
		>
			<input type="hidden" name="rutSansano" value={sansano.rutSansano} />
			<span
				class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-error/50 bg-error/15"
			>
				<Icon name="trash-2" class="h-4 w-4 text-error" strokeWidth={2} />
			</span>
			<div class="flex flex-col gap-1">
				<p class="text-body-md font-medium text-on-surface">
					{accion === 'baja' ? '¿Dar de baja al staff?' : '¿Eliminar el registro?'}
				</p>
				<p class="text-body-md text-on-surface-variant">
					{#if accion === 'baja'}
						Se quitará el cargo a
						<span class="font-semibold text-on-surface">{sansano.nombreSansano}</span>. Deja de
						operar los paneles pero su historial se conserva.
					{:else}
						El registro de
						<span class="font-semibold text-on-surface">{sansano.nombreSansano}</span>
						se eliminará de forma permanente. Solo es posible si no tiene historial.
					{/if}
				</p>
			</div>
		</form>
	{:else if modo === 'editar'}
		<form
			id="ficha-editar"
			method="POST"
			action="?/editar"
			novalidate
			use:enhance={alEditar}
			class="flex flex-col gap-4"
		>
			<input type="hidden" name="rutSansano" value={sansano.rutSansano} />
			<input type="hidden" name="idCargo" value={cargoSeleccion} />
			<div class="rounded-base border border-glass-border p-4">
				<p class="font-mono text-[10px] tracking-wider text-on-surface-variant/70 uppercase">
					Identidad (no se edita)
				</p>
				<p class="mt-1 font-mono text-body-md text-on-surface">
					{formatearRut(sansano.rutSansano, sansano.digitoVerificador)} · Rol
					{sansano.rolSansano}
				</p>
			</div>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<FormField label="Nombre" htmlFor="staff-nombre" error={errores.nombre}>
					<input
						id="staff-nombre"
						name="nombreSansano"
						type="text"
						bind:value={nombre}
						onblur={() => marcarTocado('nombre')}
						aria-invalid={errores.nombre !== null}
						aria-describedby={errores.nombre ? 'staff-nombre-error' : undefined}
						class={errores.nombre ? claseInputInvalido : claseInputValido}
					/>
				</FormField>

				<FormField label="Teléfono" htmlFor="staff-telefono" error={errores.telefono}>
					<TelefonoInput
						id="staff-telefono"
						bind:value={telefono}
						inputClass={errores.telefono ? claseInputInvalido : claseInputValido}
						onblur={() => marcarTocado('telefono')}
						invalid={errores.telefono !== null}
						describedby={errores.telefono ? 'staff-telefono-error' : undefined}
					/>
				</FormField>
			</div>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<FormField label="Correo institucional" htmlFor="staff-correo" error={errores.correo}>
					<input
						id="staff-correo"
						name="correoInstitucional"
						type="email"
						bind:value={correo}
						onblur={() => marcarTocado('correo')}
						aria-invalid={errores.correo !== null}
						aria-describedby={errores.correo ? 'staff-correo-error' : undefined}
						class={errores.correo ? claseInputInvalido : claseInputValido}
					/>
				</FormField>

				<FormField label="Cargo" htmlFor="staff-cargo" error={errores.cargo}>
					<div class="[&>div]:w-full">
						<Dropdown
							items={itemsCargo}
							value={cargoSeleccion}
							onchange={(valor) => {
								cargoSeleccion = valor;
								marcarTocado('cargo');
							}}
							placeholder="Seleccionar cargo"
						/>
					</div>
				</FormField>
			</div>

			{#if errorGestion}
				<p
					class="text-body-sm flex items-start gap-2 rounded-base border border-error/40 bg-error/15 p-3 text-error"
					role="alert"
				>
					<Icon name="circle-alert" class="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
					<span>{errorGestion}</span>
				</p>
			{/if}
		</form>
	{:else}
		<div class="flex flex-col gap-4">
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div class="rounded-base border border-glass-border p-4">
					<p class="font-mono text-[10px] tracking-wider text-on-surface-variant/70 uppercase">
						Datos
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
					<p class="font-mono text-sm text-on-surface-variant">
						{formatearTelefono(sansano.telefono)}
					</p>
					<div class="mt-2 flex flex-wrap items-center gap-2">
						<StatusBadge tone={toneCargo(sansano.nombreCargo)}>
							{sansano.nombreCargo}
						</StatusBadge>
						<StatusBadge tone={sansano.authUserId ? 'success' : 'warning'}>
							{sansano.authUserId ? 'Acceso activo' : 'Invitación pendiente'}
						</StatusBadge>
					</div>
					{#if !sansano.authUserId}
						<p class="mt-2 text-xs text-on-surface-variant/70">
							Aún no acepta el enlace de Supabase Auth: mientras su acceso esté pendiente no puede
							operar los paneles.
						</p>
					{/if}
				</div>

				<div class="rounded-base border border-glass-border p-4">
					<p class="font-mono text-[10px] tracking-wider text-on-surface-variant/70 uppercase">
						Historial resumido
					</p>
					{#if totalHistorial > 0}
						<ul class="mt-2 flex flex-col gap-1.5 text-body-md text-on-surface-variant">
							<li>
								<span class="font-mono font-semibold text-on-surface">{historial.solicitudes}</span>
								solicitud{historial.solicitudes === 1 ? '' : 'es'}
							</li>
							<li>
								<span class="font-mono font-semibold text-on-surface">{historial.prestamos}</span>
								préstamo{historial.prestamos === 1 ? '' : 's'}
							</li>
							<li>
								<span class="font-mono font-semibold text-on-surface">{historial.suspensiones}</span
								>
								suspensione{historial.suspensiones === 1 ? '' : 's'}
							</li>
						</ul>
						<p class="mt-2 text-xs text-on-surface-variant/70">
							Con historial no puede eliminarse el registro físico: se usa la baja por cargo.
						</p>
					{:else}
						<p class="mt-2 text-body-md text-on-surface-variant">
							Sin solicitudes, préstamos ni suspensiones registradas.
						</p>
					{/if}

					<div class="mt-3">
						{#if suspension}
							<StatusBadge tone="error">
								<Icon name="ban" class="h-3 w-3" strokeWidth={2} /> Suspendido
							</StatusBadge>
						{:else}
							<StatusBadge tone="success">Sin suspensiones activas</StatusBadge>
						{/if}
					</div>
				</div>
			</div>

			<div class="rounded-base border border-glass-border p-4">
				<p class="font-mono text-[10px] tracking-wider text-on-surface-variant/70 uppercase">
					Permisos efectivos
				</p>
				{#if permisos.length}
					<ul class="mt-2 flex flex-wrap gap-1.5">
						{#each permisos as permiso (permiso)}
							<li
								class="rounded-base border border-glass-border bg-surface-container-lowest px-2 py-1 font-mono text-xs text-on-surface-variant"
							>
								{permiso}
							</li>
						{/each}
					</ul>
				{:else}
					<p class="mt-2 text-body-md text-on-surface-variant">Este cargo no tiene permisos.</p>
				{/if}
			</div>

			{#if gestiona}
				<div class="flex flex-wrap items-center gap-2 border-t border-glass-border pt-4">
					<button type="button" onclick={pedirBaja} class={claseBotonBaja}>
						<Icon name="user-plus" class="h-3.5 w-3.5" strokeWidth={2} />
						Dar de baja
					</button>
					<button
						type="button"
						onclick={pedirEliminacion}
						class="inline-flex cursor-pointer items-center gap-2 rounded-base border border-error/50 bg-error/15 px-3 py-1.5 font-mono text-xs tracking-wider text-error uppercase transition hover:bg-error/25"
					>
						<Icon name="trash-2" class="h-3.5 w-3.5" strokeWidth={2} />
						Eliminar
					</button>
				</div>
			{/if}

			{#if errorGestion}
				<p
					class="text-body-sm flex items-start gap-2 rounded-base border border-error/40 bg-error/15 p-3 text-error"
					role="alert"
				>
					<Icon name="circle-alert" class="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
					<span>{errorGestion}</span>
				</p>
			{/if}
		</div>
	{/if}

	{#snippet footer()}
		{#if modo === 'ver'}
			<button type="button" onclick={onclose} class={claseBotonSecundario}>Cerrar</button>
			{#if gestiona}
				<button type="button" onclick={iniciarEdicion} class={claseBotonPrimario}>
					<Icon name="pencil" class="h-4 w-4" strokeWidth={2} />
					Editar datos y cargo
				</button>
			{/if}
		{:else if modo === 'editar'}
			<button
				type="button"
				onclick={() => {
					modo = 'ver';
					errorGestion = null;
				}}
				class={claseBotonSecundario}
			>
				Cancelar
			</button>
			<button type="submit" form="ficha-editar" disabled={enviando} class={claseBotonPrimario}>
				<Icon name="check" class="h-4 w-4" strokeWidth={2} />
				{enviando ? 'Guardando…' : 'Guardar cambios'}
			</button>
		{:else}
			<button
				type="button"
				onclick={() => {
					modo = 'ver';
					accion = null;
				}}
				class={claseBotonSecundario}
			>
				Cancelar
			</button>
			<button type="submit" form="ficha-gestion" disabled={enviando} class={claseBotonPeligro}>
				<Icon name="check" class="h-4 w-4" strokeWidth={2} />
				{enviando ? 'Procesando…' : 'Confirmar'}
			</button>
		{/if}
	{/snippet}
</Modal>
