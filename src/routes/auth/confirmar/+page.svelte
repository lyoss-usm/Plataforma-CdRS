<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	type Campo = 'password' | 'confirmacion';

	let { data, form }: PageProps = $props();

	let password = $state('');
	let confirmacion = $state('');
	let tocado = $state<Record<Campo, boolean>>({ password: false, confirmacion: false });
	let intentoEnvio = $state(false);
	let enviando = $state(false);

	function marcarTocado(campo: Campo) {
		tocado[campo] = true;
	}

	function validarCampo(campo: Campo): string | null {
		switch (campo) {
			case 'password':
				return password.length >= 8 ? null : 'Usa al menos 8 caracteres.';
			case 'confirmacion':
				return confirmacion === password ? null : 'Las contraseñas no coinciden.';
		}
	}

	function mostrarError(campo: Campo, mensaje: string | null): string | null {
		return tocado[campo] || intentoEnvio ? mensaje : null;
	}

	const errores = $derived({
		password: mostrarError('password', validarCampo('password')) ?? form?.errores?.password ?? null,
		confirmacion:
			mostrarError('confirmacion', validarCampo('confirmacion')) ??
			form?.errores?.confirmacion ??
			null
	});

	const claseInput =
		'w-full rounded-base border bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/70 focus:border-primary/50';
	const claseInputValido = `${claseInput} border-glass-border`;
	const claseInputInvalido = `${claseInput} border-error`;
	const claseLabel = 'font-mono text-label-md tracking-wider text-on-surface-variant uppercase';
</script>

<svelte:head>
	<title>Aceptar invitación · CdRS</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main
	class="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-on-background"
>
	<div
		class="flex w-full max-w-sm flex-col gap-6 rounded-base surface-level-2 border border-glass-border p-6 sm:p-8"
	>
		<div class="flex flex-col items-center gap-3 text-center">
			<h1 class="font-display text-headline-md font-semibold tracking-tight text-on-surface">
				Bienvenido al staff
			</h1>
			<p class="text-body-md text-on-surface-variant">
				Crea tu contraseña para ingresar al panel del Club de Rol Sansano.
			</p>
		</div>

		{#if data.enlaceInvalido}
			<p
				role="alert"
				class="rounded-base border border-error/40 bg-error/10 px-4 py-2.5 text-sm font-medium text-error"
			>
				El enlace de invitación no es válido o expiró. Pide a un directivo que te invite de nuevo.
			</p>

			<a
				href={resolve('/login')}
				class="text-center text-sm text-on-surface-variant transition hover:text-on-surface"
			>
				Ir al ingreso
			</a>
		{:else}
			<form
				method="POST"
				novalidate
				class="flex flex-col gap-4"
				use:enhance={({ cancel }) => {
					intentoEnvio = true;

					if (validarCampo('password') || validarCampo('confirmacion')) {
						cancel();
						return;
					}

					enviando = true;

					return async ({ update }) => {
						await update({ reset: false });
						enviando = false;
					};
				}}
			>
				{#if form?.mensaje}
					<p
						role="alert"
						class="rounded-base border border-error/40 bg-error/10 px-4 py-2.5 text-sm font-medium text-error"
					>
						{form.mensaje}
					</p>
				{/if}

				<div class="flex flex-col gap-1.5">
					<label for="confirmar-password" class={claseLabel}>Contraseña</label>
					<input
						id="confirmar-password"
						name="password"
						type="password"
						autocomplete="new-password"
						bind:value={password}
						onblur={() => marcarTocado('password')}
						aria-invalid={errores.password !== null}
						aria-describedby={errores.password ? 'confirmar-password-error' : undefined}
						class={errores.password ? claseInputInvalido : claseInputValido}
					/>
					{#if errores.password}
						<p class="mt-0.5 text-sm font-medium text-error" id="confirmar-password-error">
							{errores.password}
						</p>
					{/if}
				</div>

				<div class="flex flex-col gap-1.5">
					<label for="confirmar-repetir" class={claseLabel}>Repite la contraseña</label>
					<input
						id="confirmar-repetir"
						name="confirmacion"
						type="password"
						autocomplete="new-password"
						bind:value={confirmacion}
						onblur={() => marcarTocado('confirmacion')}
						aria-invalid={errores.confirmacion !== null}
						aria-describedby={errores.confirmacion ? 'confirmar-repetir-error' : undefined}
						class={errores.confirmacion ? claseInputInvalido : claseInputValido}
					/>
					{#if errores.confirmacion}
						<p class="mt-0.5 text-sm font-medium text-error" id="confirmar-repetir-error">
							{errores.confirmacion}
						</p>
					{/if}
				</div>

				<button
					type="submit"
					disabled={enviando}
					aria-busy={enviando}
					class="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-base border border-primary/50 bg-primary/10 px-6 py-2.5 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-primary/10"
				>
					{enviando ? 'Guardando…' : 'Crear contraseña e ingresar'}
				</button>
			</form>
		{/if}
	</div>
</main>
