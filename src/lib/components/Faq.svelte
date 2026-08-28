<script lang="ts">
	const faqs = [
		{
			q: '¿Necesito experiencia previa?',
			a: 'Nada. Aprendemos jugando: cada mesa recibe con partidas introductorias y explica las reglas sobre la marcha.'
		},
		{
			q: '¿Cómo me sumo a una partida?',
			a: 'Por Discord o nuestro correo: coordinas tu primera sesión con el director o directora de la mesa que te interese.'
		},
		{
			q: '¿Hay que pagar algo?',
			a: 'El club es gratuito. Solo cubres tus propios traslados o consumo cuando la sesión es presencial.'
		},
		{
			q: '¿Juegan online o presencial?',
			a: 'Ambos. Presencial cerca del campus y online por Discord, con voz y vídeo.'
		},
		{
			q: '¿Puedo dirigir una mesa?',
			a: 'Por supuesto. Tenemos tutores que acompañan a nuevos directores y un repositorio de materiales compartidos.'
		},
		{
			q: '¿Qué sistemas de rol se juegan?',
			a: 'Dungeons & Dragons, Vampiro: La Mascarada, Call of Cthulhu y otros según el interés de cada mesa.'
		}
	];
</script>

<section
	id="faq"
	class="flex scroll-mt-16 flex-col items-center justify-center gap-6 glass-border p-12 px-6 py-24"
>
	<h2 class="font-display text-headline-lg font-semibold text-on-surface">Preguntas frecuentes</h2>

	<div class="mt-2 flex w-full max-w-2xl flex-col gap-3">
		{#each faqs as faq (faq.q)}
			<details
				class="group rounded-base border border-glass-border bg-surface-container-lowest transition hover:border-primary/40"
			>
				<summary
					class="flex cursor-pointer list-none items-center justify-between gap-4 rounded-base px-5 py-4 font-display text-body-lg font-semibold text-on-surface select-none [&::-webkit-details-marker]:hidden"
				>
					<span>{faq.q}</span>
					<svg
						viewBox="0 0 24 24"
						class="h-5 w-5 shrink-0 text-primary transition-transform group-open:rotate-45"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						aria-hidden="true"
					>
						<path d="M12 5v14 M5 12h14" stroke-linecap="round" />
					</svg>
				</summary>
				<p class="px-5 pb-5 text-body-md text-on-surface-variant">{faq.a}</p>
			</details>
		{/each}
	</div>
</section>
