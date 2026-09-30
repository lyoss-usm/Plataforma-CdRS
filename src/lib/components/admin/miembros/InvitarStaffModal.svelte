<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '$lib/components/admin/primitives/Modal.svelte';
	import Dropdown from '$lib/components/admin/primitives/Dropdown.svelte';
	import FormField from '$lib/components/admin/primitives/FormField.svelte';
	import { meson, parsearRut } from '$lib/data/junta.svelte';
	import { notificaciones } from '$lib/stores/notificaciones.svelte';
	import { dominiosCorreoInstitucional } from '$lib/schemas/sansano';

	interface Props {
		onclose: () => void;
	}

	type CampoValidable = 'nombre' | 'rut' | 'rol' | 'telefono' | 'correo' | 'cargo';

	let { onclose }: Props = $props();

	const formatoRut = /^\d{1,8}-[0-9kK]$/;
	const formatoRol = /^\d{5,9}$/;
	const formatoTelefono = /^[0-9 +-]{8,20}$/;

	const itemsCargo = $derived(
		meson.cargos.map((c) => ({ value: String(c.idCargo), label: c.nombreCargo }))
	);

	let nombre = $state('');
	let rut = $state('');
	let rol = $state('');
	let telefono = $state('');
	let correo = $state('');
	let cargoSeleccion = $state('');
	let tocado = $state<Record<CampoValidable, boolean>>({
		nombre: false,
		rut: false,
		rol: false,
		telefono: false,
		correo: false,
		cargo: false
	});
	let intentoEnvio = $state(false);
	let error = $state<string | null>(null);

	const claseInput =
		'w-full rounded-base border bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/70 focus:border-primary/50';
	const claseInputValido = `${claseInput} border-glass-border`;
	const claseInputInvalido = `${claseInput} border-error`;
	const claseBotonSecundario =
		'cursor-pointer rounded-base border border-glass-border px-4 py-2 text-on-surface-variant transition hover:bg-white/5 hover:text-on-surface';
	const claseBotonPrimario =
		'inline-flex cursor-pointer items-center gap-2 rounded-base border border-primary/50 bg-primary/10 px-4 py-2 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow';

	function marcarTocado(campo: CampoValidable) {
		tocado[campo] = true;
	}

	function validarCampo(campo: CampoValidable): string | null {
		switch (campo) {
			case 'nombre':
				return nombre.trim() === '' ? 'Ingresa el nombre completo.' : null;
			case 'rut':
				if (rut.trim() === '') {
					return 'Ingresa el RUT.';
				}

				if (!formatoRut.test(rut.trim())) {
					return 'Formato inválido. Usa el formato 12345678-9.';
				}

				return null;
			case 'rol':
				if (rol.trim() === '') {
					return 'Ingresa el ROL USM.';
				}

				if (!formatoRol.test(rol.trim())) {
					return 'ROL inválido.';
				}

				return null;
			case 'telefono':
				if (telefono.trim() === '') {
					return 'Ingresa el teléfono.';
				}

				if (!formatoTelefono.test(telefono.trim())) {
					return 'Ingresa un teléfono válido.';
				}

				return null;
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
				return cargoSeleccion === '' ? 'Selecciona un cargo inicial.' : null;
		}
	}

	function mostrarError(campo: CampoValidable, mensaje: string | null): string | null {
		return tocado[campo] || intentoEnvio ? mensaje : null;
	}

	const errores = $derived({
		nombre: mostrarError('nombre', validarCampo('nombre')),
		rut: mostrarError('rut', validarCampo('rut')),
		rol: mostrarError('rol', validarCampo('rol')),
		telefono: mostrarError('telefono', validarCampo('telefono')),
		correo: mostrarError('correo', validarCampo('correo')),
		cargo: mostrarError('cargo', validarCampo('cargo'))
	});
	const hayErrores = $derived(Object.values(errores).some(Boolean));

	const cargoNombre = $derived(meson.cargoDe(Number(cargoSeleccion))?.nombreCargo ?? 'sin cargo');

	function invitar() {
		intentoEnvio = true;

		if (hayErrores) {
			return;
		}

		const parseRut = parsearRut(rut.trim());

		if (!parseRut) {
			return;
		}

		const resultado = meson.invitarSansano(
			{
				nombre: nombre.trim(),
				rut: parseRut.rut,
				digitoVerificador: parseRut.digitoVerificador,
				rol: Number(rol.trim()),
				telefono: Number(telefono.replace(/[^0-9]/g, '')),
				correo: correo.trim()
			},
			Number(cargoSeleccion)
		);

		if (!resultado.ok) {
			error = resultado.motivo;
			return;
		}

		notificaciones.mostrar(
			'success',
			'Invitación enviada',
			`${resultado.sansano?.nombreSansano ?? nombre.trim()} fue invitado como ${cargoNombre} (${correo.trim()}). El enlace de acceso llega por correo.`
		);
		onclose();
	}
</script>

<Modal title="Invitar staff" size="lg" {onclose}>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			invitar();
		}}
		class="flex flex-col gap-4"
		novalidate
	>
		<p class="text-body-md text-on-surface-variant">
			Se envía un enlace de acceso de Supabase Auth al correo institucional y se asigna el cargo
			inicial. Mientras el invitado no lo acepte, su acceso queda «Pendiente».
		</p>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<FormField label="Correo institucional" htmlFor="invite-correo" error={errores.correo}>
				<input
					id="invite-correo"
					type="email"
					bind:value={correo}
					onblur={() => marcarTocado('correo')}
					placeholder="correo@usm.cl"
					aria-invalid={errores.correo !== null}
					aria-describedby={errores.correo ? 'invite-correo-error' : undefined}
					class={errores.correo ? claseInputInvalido : claseInputValido}
				/>
			</FormField>

			<FormField label="Cargo inicial" htmlFor="invite-cargo" error={errores.cargo}>
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

		<fieldset class="rounded-base border border-glass-border p-4">
			<legend
				class="px-1 font-mono text-[10px] tracking-wider text-on-surface-variant/70 uppercase"
			>
				Ficha básica del sansano
			</legend>
			<p class="text-body-sm mb-3 text-on-surface-variant">
				Solo se usa si el correo no corresponde a un sansano existente; si ya existe, se le reasigna
				el cargo directamente.
			</p>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<FormField label="Nombre" htmlFor="invite-nombre" error={errores.nombre}>
					<input
						id="invite-nombre"
						type="text"
						bind:value={nombre}
						onblur={() => marcarTocado('nombre')}
						placeholder="Nombre completo"
						aria-invalid={errores.nombre !== null}
						aria-describedby={errores.nombre ? 'invite-nombre-error' : undefined}
						class={errores.nombre ? claseInputInvalido : claseInputValido}
					/>
				</FormField>

				<FormField label="RUT" htmlFor="invite-rut" error={errores.rut}>
					<input
						id="invite-rut"
						type="text"
						inputmode="numeric"
						bind:value={rut}
						onblur={() => marcarTocado('rut')}
						placeholder="12345678-9"
						aria-invalid={errores.rut !== null}
						aria-describedby={errores.rut ? 'invite-rut-error' : undefined}
						class={errores.rut ? claseInputInvalido : claseInputValido}
					/>
				</FormField>

				<FormField label="ROL USM" htmlFor="invite-rol" error={errores.rol}>
					<input
						id="invite-rol"
						type="text"
						inputmode="numeric"
						bind:value={rol}
						onblur={() => marcarTocado('rol')}
						placeholder="1234567"
						aria-invalid={errores.rol !== null}
						aria-describedby={errores.rol ? 'invite-rol-error' : undefined}
						class={errores.rol ? claseInputInvalido : claseInputValido}
					/>
				</FormField>

				<FormField label="Teléfono" htmlFor="invite-telefono" error={errores.telefono}>
					<input
						id="invite-telefono"
						type="tel"
						bind:value={telefono}
						onblur={() => marcarTocado('telefono')}
						placeholder="9 1234 5678"
						aria-invalid={errores.telefono !== null}
						aria-describedby={errores.telefono ? 'invite-telefono-error' : undefined}
						class={errores.telefono ? claseInputInvalido : claseInputValido}
					/>
				</FormField>
			</div>
		</fieldset>

		{#if error}
			<p
				class="text-body-sm flex items-start gap-2 rounded-base border border-error/40 bg-error/15 p-3 text-error"
				role="alert"
			>
				<Icon name="circle-alert" class="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
				<span>{error}</span>
			</p>
		{/if}

		<div class="mt-2 flex flex-wrap items-center justify-end gap-3">
			<button type="button" onclick={onclose} class={claseBotonSecundario}>Cancelar</button>
			<button type="submit" class={claseBotonPrimario}>
				<Icon name="user-plus" class="h-4 w-4" strokeWidth={2} />
				Enviar invitación
			</button>
		</div>
	</form>
</Modal>
