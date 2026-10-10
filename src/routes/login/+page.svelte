<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	type CampoValidable = 'correo' | 'password';

	let { form }: PageProps = $props();

	const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	// form solo cambia tras un envío; el valor inicial evita perder el correo tras un rechazo.
	// svelte-ignore state_referenced_locally
	let correo = $state(form?.correo ?? '');
	let password = $state('');
	let tocado = $state<Record<CampoValidable, boolean>>({ correo: false, password: false });
	let intentoEnvio = $state(false);
	let enviando = $state(false);

	function marcarTocado(campo: CampoValidable) {
		tocado[campo] = true;
	}

	function validarCampo(campo: CampoValidable): string | null {
		switch (campo) {
			case 'correo':
				if (correo.trim() === '') {
					return 'Ingresa tu correo institucional.';
				}

				return formatoCorreo.test(correo.trim()) ? null : 'Ingresa un correo válido.';
			case 'password':
				return password === '' ? 'Ingresa tu contraseña.' : null;
		}
	}

	function mostrarError(campo: CampoValidable, mensaje: string | null): string | null {
		return tocado[campo] || intentoEnvio ? mensaje : null;
	}

	const errores = $derived({
		correo: mostrarError('correo', validarCampo('correo')),
		password: mostrarError('password', validarCampo('password'))
	});

	const claseInput =
		'w-full rounded-base border bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/70 focus:border-primary/50';

	const claseInputValido = `${claseInput} border-glass-border`;
	const claseInputInvalido = `${claseInput} border-error`;
</script>

<svelte:head>
	<title>Ingreso staff · CdRS</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main
	class="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-on-background"
>
	<div
		class="flex w-full max-w-sm flex-col gap-6 rounded-base surface-level-2 border border-glass-border p-6 sm:p-8"
	>
		<div class="flex flex-col items-center gap-3 text-center">
			<img
				src="/logos/logo.webp"
				alt="Logo del Club de Rol Sansano"
				class="h-14 w-14 rounded-full object-cover"
				width="56"
				height="56"
			/>
			<h1 class="font-display text-headline-md font-semibold tracking-tight text-on-surface">
				Panel CdRS
			</h1>
			<p class="text-body-md text-on-surface-variant">
				Acceso exclusivo para el staff del Club de Rol Sansano.
			</p>
		</div>

		<form
			method="POST"
			novalidate
			class="flex flex-col gap-4"
			use:enhance={({ cancel }) => {
				intentoEnvio = true;

				if (validarCampo('correo') || validarCampo('password')) {
					cancel();
					return;
				}

				enviando = true;

				return async ({ update }) => {
					await update({ reset: false });
					password = '';
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
				<label
					for="login-correo"
					class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
				>
					Correo institucional
				</label>

				<input
					id="login-correo"
					name="correo"
					type="email"
					autocomplete="email"
					bind:value={correo}
					onblur={() => marcarTocado('correo')}
					placeholder="correo@usm.cl"
					aria-invalid={errores.correo !== null}
					aria-describedby={errores.correo ? 'login-correo-error' : undefined}
					class={errores.correo ? claseInputInvalido : claseInputValido}
				/>

				{#if errores.correo}
					<p class="mt-0.5 text-sm font-medium text-error" id="login-correo-error">
						{errores.correo}
					</p>
				{/if}
			</div>

			<div class="flex flex-col gap-1.5">
				<label
					for="login-password"
					class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
				>
					Contraseña
				</label>

				<input
					id="login-password"
					name="password"
					type="password"
					autocomplete="current-password"
					bind:value={password}
					onblur={() => marcarTocado('password')}
					aria-invalid={errores.password !== null}
					aria-describedby={errores.password ? 'login-password-error' : undefined}
					class={errores.password ? claseInputInvalido : claseInputValido}
				/>

				{#if errores.password}
					<p class="mt-0.5 text-sm font-medium text-error" id="login-password-error">
						{errores.password}
					</p>
				{/if}
			</div>

			<button
				type="submit"
				disabled={enviando}
				aria-busy={enviando}
				class="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-base border border-primary/50 bg-primary/10 px-6 py-2.5 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-primary/10"
			>
				{enviando ? 'Ingresando…' : 'Ingresar'}
			</button>

			<p class="text-center text-sm text-on-surface-variant">
				El acceso es solo por invitación. Si eres staff y no tienes cuenta, pídela a un directivo.
			</p>
		</form>

		<a
			href={resolve('/')}
			class="text-center text-sm text-on-surface-variant transition hover:text-on-surface"
		>
			Volver al sitio
		</a>
	</div>
</main>
