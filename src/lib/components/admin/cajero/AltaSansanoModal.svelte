<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '../primitives/Modal.svelte';
	import FormField from '../primitives/FormField.svelte';
	import { dominiosCorreoInstitucional } from '$lib/schemas/sansano';
	import { parsearRut } from '$lib/data/junta.svelte';
	import type { DatosAltaSansano } from '$lib/data/junta.svelte';

	interface Props {
		rutInicial?: string;
		oncerrar: () => void;
		oncrear: (datos: DatosAltaSansano) => void;
	}

	let { rutInicial = '', oncerrar, oncrear }: Props = $props();

	type Campo = 'nombre' | 'rut' | 'rol' | 'telefono' | 'correo';

	const formatoTelefono = /^9\d{8}$/;

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
				return /^\d{1,8}$/.test(rol.trim()) ? null : 'Ingresa un rol válido (matrícula).';
			case 'telefono':
				if (telefono.trim() === '') {
					return 'Ingresa el teléfono.';
				}

				return formatoTelefono.test(telefono.trim())
					? null
					: 'Ingresa un teléfono válido (9 dígitos).';
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

		if (!rutParseado) {
			return;
		}

		oncrear({
			nombre: nombre.trim(),
			rol: Number(rol.trim()),
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
			<input
				id="alta-rut"
				type="text"
				inputmode="numeric"
				bind:value={rut}
				onblur={() => marcarTocado('rut')}
				placeholder="12345678-9"
				aria-invalid={tocado.rut || intentoEnvio ? validarCampo('rut') !== null : undefined}
				aria-describedby={tocado.rut || intentoEnvio ? 'alta-rut-error' : undefined}
				class="w-full rounded-base border border-glass-border bg-surface-container-lowest px-3 py-2.5 font-mono text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/60 focus:border-primary/50"
			/>
		</FormField>

		<div class="grid gap-4 sm:grid-cols-2">
			<FormField
				label="Rol (matrícula)"
				htmlFor="alta-rol"
				error={tocado.rol || intentoEnvio ? validarCampo('rol') : null}
			>
				<input
					id="alta-rol"
					type="text"
					inputmode="numeric"
					bind:value={rol}
					onblur={() => marcarTocado('rol')}
					placeholder="1234567"
					aria-invalid={tocado.rol || intentoEnvio ? validarCampo('rol') !== null : undefined}
					aria-describedby={tocado.rol || intentoEnvio ? 'alta-rol-error' : undefined}
					class="w-full rounded-base border border-glass-border bg-surface-container-lowest px-3 py-2.5 font-mono text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/60 focus:border-primary/50"
				/>
			</FormField>

			<FormField
				label="Teléfono"
				htmlFor="alta-telefono"
				error={tocado.telefono || intentoEnvio ? validarCampo('telefono') : null}
			>
				<input
					id="alta-telefono"
					type="tel"
					inputmode="numeric"
					bind:value={telefono}
					onblur={() => marcarTocado('telefono')}
					placeholder="912345678"
					aria-invalid={tocado.telefono || intentoEnvio
						? validarCampo('telefono') !== null
						: undefined}
					aria-describedby={tocado.telefono || intentoEnvio ? 'alta-telefono-error' : undefined}
					class="w-full rounded-base border border-glass-border bg-surface-container-lowest px-3 py-2.5 font-mono text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/60 focus:border-primary/50"
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
			class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-base border border-primary/50 bg-primary/10 px-6 py-2 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow"
		>
			<Icon name="user-plus" class="h-4 w-4" /> Crear y seleccionar
		</button>
	{/snippet}
</Modal>
