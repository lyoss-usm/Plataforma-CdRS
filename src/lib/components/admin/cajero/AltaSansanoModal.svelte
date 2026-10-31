<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '../primitives/Modal.svelte';
	import FormField from '../primitives/FormField.svelte';
	import IdentificadorInput from '$lib/components/forms/IdentificadorInput.svelte';
	import TelefonoInput from '$lib/components/forms/TelefonoInput.svelte';
	import { LARGO_ROL, LARGO_RUT, errorRol, parsearRol } from '$lib/schemas';
	import { dominiosCorreoInstitucional } from '$lib/schemas/sansano';
	import { parsearRut } from '$lib/data/junta.svelte';
	import type { DatosAltaSansano } from '$lib/data/junta.svelte';

	interface Props {
		rutInicial?: string;
		/** Rechazo del servidor (p. ej. RUT o correo ya registrado). */
		error?: string | null;
		enviando?: boolean;
		oncerrar: () => void;
		oncrear: (datos: DatosAltaSansano) => void;
	}

	let { rutInicial = '', error = null, enviando = false, oncerrar, oncrear }: Props = $props();

	type Campo = 'nombre' | 'rut' | 'rol' | 'telefono' | 'correo';

	const formatoTelefono = /^\d{8}$/;
	const claseInput =
		'w-full rounded-base border border-glass-border bg-surface-container-lowest px-3 py-2.5 font-mono text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/60 focus:border-primary/50';

	let nombre = $state('');
	let rut = $state('');
	let rol = $state('');
	let telefono = $state('');
	let correo = $state('');

	$effect(() => {
		rut = rutInicial;
	});
	let tocado = $state<Record<Campo, boolean>>({
		nombre: false,
		rut: false,
		rol: false,
		telefono: false,
		correo: false
	});
	let intentoEnvio = $state(false);

	function marcarTocado(campo: Campo) {
		tocado[campo] = true;
	}

	function validarCampo(campo: Campo): string | null {
		switch (campo) {
			case 'nombre':
				return nombre.trim() === '' ? 'Ingresa el nombre del sansano.' : null;
			case 'rut':
				if (rut.trim() === '') {
					return 'Ingresa el RUT.';
				}

				if (!parsearRut(rut)) {
					return 'Formato inválido. Usa el formato 12345678-9.';
				}

				return null;
			case 'rol':
				if (rol.trim() === '') {
					return 'Ingresa el rol.';
				}

				return errorRol(rol);
			case 'telefono':
				if (telefono.trim() === '') {
					return 'Ingresa el teléfono.';
				}

				return formatoTelefono.test(telefono.trim())
					? null
					: 'Ingresa los 8 dígitos posteriores a +56 9.';
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
		}
	}

	function crear() {
		intentoEnvio = true;

		const campos: Campo[] = ['nombre', 'rut', 'rol', 'telefono', 'correo'];
		const invalidos = campos.filter((campo) => validarCampo(campo) !== null);

		if (invalidos.length > 0) {
			return;
		}

		const rutParseado = parsearRut(rut);
		const rolParseado = parsearRol(rol);

		if (!rutParseado || rolParseado === null) {
			return;
		}

		oncrear({
			nombre: nombre.trim(),
			rol: rolParseado,
			telefono: Number(telefono.trim()),
			correo: correo.trim(),
			...rutParseado
		});
	}
</script>

<Modal title="Alta de sansano" size="md" onclose={oncerrar}>
	{#snippet header()}
		<p class="text-body-sm text-on-surface-variant">
			No está registrado. Se crea al instante para no frenar la fila del mesón.
		</p>
	{/snippet}

	<div class="flex flex-col gap-4">
		<FormField
			label="Nombre"
			htmlFor="alta-nombre"
			error={tocado.nombre || intentoEnvio ? validarCampo('nombre') : null}
		>
			<input
				id="alta-nombre"
				type="text"
				bind:value={nombre}
				onblur={() => marcarTocado('nombre')}
				placeholder="Nombre y apellido"
				aria-invalid={tocado.nombre || intentoEnvio ? validarCampo('nombre') !== null : undefined}
				aria-describedby={tocado.nombre || intentoEnvio ? 'alta-nombre-error' : undefined}
				class="w-full rounded-base border border-glass-border bg-surface-container-lowest px-3 py-2.5 text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/60 focus:border-primary/50"
			/>
		</FormField>

		<FormField
			label="RUT"
			htmlFor="alta-rut"
			hint="Formato 12345678-9"
			error={tocado.rut || intentoEnvio ? validarCampo('rut') : null}
		>
			<IdentificadorInput
				id="alta-rut"
				bind:value={rut}
				largoMaximo={LARGO_RUT}
				onblur={() => marcarTocado('rut')}
				placeholder="12345678-9"
				aria-invalid={tocado.rut || intentoEnvio ? validarCampo('rut') !== null : undefined}
				aria-describedby={tocado.rut || intentoEnvio ? 'alta-rut-error' : undefined}
				class={claseInput}
			/>
		</FormField>

		<div class="grid gap-4 sm:grid-cols-2">
			<FormField
				label="Rol (matrícula)"
				htmlFor="alta-rol"
				hint="Formato 202012345-4"
				error={tocado.rol || intentoEnvio ? validarCampo('rol') : null}
			>
				<IdentificadorInput
					id="alta-rol"
					bind:value={rol}
					largoMaximo={LARGO_ROL}
					onblur={() => marcarTocado('rol')}
					placeholder="202012345-4"
					aria-invalid={tocado.rol || intentoEnvio ? validarCampo('rol') !== null : undefined}
					aria-describedby={tocado.rol || intentoEnvio ? 'alta-rol-error' : undefined}
					class={claseInput}
				/>
			</FormField>

			<FormField
				label="Teléfono"
				htmlFor="alta-telefono"
				error={tocado.telefono || intentoEnvio ? validarCampo('telefono') : null}
			>
				<TelefonoInput
					id="alta-telefono"
					name="telefono"
					bind:value={telefono}
					inputClass={claseInput}
					onblur={() => marcarTocado('telefono')}
					invalid={tocado.telefono || intentoEnvio ? validarCampo('telefono') !== null : false}
					describedby={tocado.telefono || intentoEnvio ? 'alta-telefono-error' : undefined}
				/>
			</FormField>
		</div>

		<FormField
			label="Correo institucional"
			htmlFor="alta-correo"
			error={tocado.correo || intentoEnvio ? validarCampo('correo') : null}
		>
			<input
				id="alta-correo"
				type="email"
				bind:value={correo}
				onblur={() => marcarTocado('correo')}
				placeholder="nombre@alumnos.usm.cl"
				aria-invalid={tocado.correo || intentoEnvio ? validarCampo('correo') !== null : undefined}
				aria-describedby={tocado.correo || intentoEnvio ? 'alta-correo-error' : undefined}
				class="w-full rounded-base border border-glass-border bg-surface-container-lowest px-3 py-2.5 text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/60 focus:border-primary/50"
			/>
		</FormField>

		{#if error}
			<p
				class="text-body-sm rounded-base border border-error/40 bg-error/15 p-2.5 text-error"
				role="alert"
			>
				{error}
			</p>
		{/if}
	</div>

	{#snippet footer()}
		<button
			type="button"
			onclick={oncerrar}
			class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-base border border-glass-border bg-surface-container-lowest px-4 py-2 font-medium text-on-surface transition hover:bg-white/5"
		>
			Cancelar
		</button>
		<button
			type="button"
			onclick={crear}
			disabled={enviando}
			class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-base border border-primary/50 bg-primary/10 px-6 py-2 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow disabled:cursor-not-allowed disabled:opacity-40"
		>
			{#if enviando}
				<Icon name="loader-circle" class="h-4 w-4 animate-spin" /> Creando...
			{:else}
				<Icon name="user-plus" class="h-4 w-4" /> Crear y seleccionar
			{/if}
		</button>
	{/snippet}
</Modal>
