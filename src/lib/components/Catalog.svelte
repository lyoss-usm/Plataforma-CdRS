<script lang="ts">
	import { catalog, type CatalogGame } from '$lib/data/catalog';

	const CATALOG_PAGE_SIZE = 10;

	let query = $state('');
	let players = $state('cualquiera');
	let duration = $state('cualquiera');
	let statusFilter = $state('cualquiera');
	let minRating = $state('cualquiera');
	let selected: CatalogGame | null = $state(null);

	let termsAccepted = $state(false);
	let submitting = $state(false);
	let submitted = $state(false);
	let nameValue = $state('');
	let rolValue = $state('');
	let emailValue = $state('');
	let commentValue = $state('');

	let visibleCount = $state(CATALOG_PAGE_SIZE);

	const playerOptions = $derived(
		Array.from({ length: Math.max(...catalog.map((game) => game.maxPlayers)) }, (_, i) => ({
			value: String(i + 1),
			label: String(i + 1)
		}))
	);

	const durationOptions = [
		{ value: 'corta', label: '≤ 30 min' },
		{ value: 'media', label: '30–60' },
		{ value: 'larga', label: '60–120' },
		{ value: 'epica', label: '> 120' }
	];

	const statusOptions = [
		{ value: 'available', label: 'Disponible' },
		{ value: 'loaned', label: 'Prestado' }
	];

	function getRatingOptions() {
		const ratings = catalog.map((game) => game.rating);
		const max = Math.max(...ratings);
		const min = Math.min(...ratings);
		const span = max - min || 0.5;
		return [1, 2, 3].map((i) => {
			const v = Math.round((max - (span * i) / 4) * 10) / 10;
			return { value: String(v), label: `${v.toFixed(1)}+` };
		});
	}

	const ratingOptions = $derived(getRatingOptions());

	const optionLabels = $derived({
		players: playerOptions.find((opt) => opt.value === players)?.label ?? 'Cualquiera',
		duration: durationOptions.find((opt) => opt.value === duration)?.label ?? 'Cualquiera',
		status: statusOptions.find((opt) => opt.value === statusFilter)?.label ?? 'Cualquiera',
		rating: ratingOptions.find((opt) => opt.value === minRating)?.label ?? 'Cualquiera'
	});

	const playerMenu = $derived([{ value: 'cualquiera', label: 'Cualquiera' }, ...playerOptions]);
	const durationMenu = $derived([{ value: 'cualquiera', label: 'Cualquiera' }, ...durationOptions]);
	const statusMenu = $derived([{ value: 'cualquiera', label: 'Cualquiera' }, ...statusOptions]);
	const ratingMenu = $derived([{ value: 'cualquiera', label: 'Cualquiera' }, ...ratingOptions]);

	const hasActiveFilters = $derived(
		query.trim() !== '' ||
			players !== 'cualquiera' ||
			duration !== 'cualquiera' ||
			statusFilter !== 'cualquiera' ||
			minRating !== 'cualquiera'
	);

	const resetFilters = () => {
		query = '';
		players = 'cualquiera';
		duration = 'cualquiera';
		statusFilter = 'cualquiera';
		minRating = 'cualquiera';
	};

	let openDropdown: 'none' | 'players' | 'duration' | 'status' | 'rating' = $state('none');

	const toggleDropdown = (which: 'players' | 'duration' | 'status' | 'rating') =>
		(openDropdown = openDropdown === which ? 'none' : which);

	const pickOption = (setter: (value: string) => void, value: string) => {
		setter(value);
		openDropdown = 'none';
	};

	const chipBase =
		'cursor-pointer rounded-full border px-3 py-1 font-mono text-sm tracking-wide transition';

	const filteredGames = $derived(
		catalog.filter((game) => {
			const q = query.trim().toLowerCase();
			const matchQ = !q || game.name.toLowerCase().includes(q);

			const n = players === 'cualquiera' ? null : Number(players);
			const matchPlayers = n === null || (game.minPlayers <= n && n <= game.maxPlayers);

			const matchDuration =
				duration === 'cualquiera' ||
				(duration === 'corta' && game.minTime <= 30) ||
				(duration === 'media' && game.minTime > 30 && game.minTime <= 60) ||
				(duration === 'larga' && game.minTime > 60 && game.minTime <= 120) ||
				(duration === 'epica' && game.minTime > 120);

			const matchStatus = statusFilter === 'cualquiera' || game.status === statusFilter;

			const matchRating = minRating === 'cualquiera' || game.rating >= Number(minRating);

			return matchQ && matchPlayers && matchDuration && matchStatus && matchRating;
		})
	);

	const visibleGames = $derived(filteredGames.slice(0, visibleCount));

	$effect(() => {
		query;
		players;
		duration;
		statusFilter;
		minRating;
		visibleCount = CATALOG_PAGE_SIZE;
	});

	const openReservation = (game: CatalogGame) => {
		selected = game;
		termsAccepted = false;
		submitting = false;
		submitted = false;
		nameValue = '';
		rolValue = '';
		emailValue = '';
		commentValue = '';
	};

	const closeModal = () => (selected = null);

	const handleSubmit = (event: SubmitEvent) => {
		event.preventDefault();
		if (submitting) return;
		submitting = true;
		setTimeout(() => {
			submitting = false;
			submitted = true;
		}, 800);
	};
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') {
			closeModal();
			openDropdown = 'none';
		}
	}}
/>

<section
	id="catalogo"
	class="flex scroll-mt-16 flex-col items-center gap-8 glass-border px-6 py-24"
>
	<div class="flex w-full max-w-6xl flex-col gap-8">
		<div class="flex gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div class="flex flex-col gap-2">
				<h2 class="font-display text-headline-lg font-semibold text-on-surface">Catálogo</h2>
				<p class="max-w-xl text-body-md text-on-surface-variant">
					Préstamo gratuito entre estudiantes. Cada caja viene completa, con sus instrucciones y
					piezas.
				</p>
			</div>
			<img
				src="/rolo/rolo_cargando_cajas_fix.png"
				alt="Rolo cargando cajas de juegos del catálogo"
				class="w-28 shrink-0 self-start drop-shadow-lg sm:w-32 lg:w-36"
				loading="lazy"
				width="200"
				height="200"
			/>
		</div>
	</div>

	<div class="flex w-full max-w-6xl flex-col gap-3">
		<div
			class="flex items-center gap-3 rounded-base border border-glass-border bg-surface-container-lowest px-4 py-2.5 text-on-surface-variant transition focus-within:border-primary/40"
		>
			<svg
				viewBox="0 0 24 24"
				class="h-5 w-5 shrink-0"
				fill="none"
				stroke="currentColor"
				aria-hidden="true"
			>
				<path
					d="M21 21l-4.35-4.35M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z"
					stroke-linecap="round"
					stroke-width="1.8"
				/>
			</svg>
			<input
				type="search"
				bind:value={query}
				placeholder="Buscar por nombre…"
				class="w-full bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/70"
			/>
		</div>

		<div class="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
			<div class="relative">
				<button
					type="button"
					aria-haspopup="listbox"
					aria-expanded={openDropdown === 'players'}
					onclick={() => toggleDropdown('players')}
					class={chipBase +
						' inline-flex w-full items-center justify-between gap-2 px-4 py-2 sm:w-auto sm:justify-start ' +
						(players !== 'cualquiera'
							? ' border-primary/50 bg-primary/15 text-primary'
							: ' border-glass-border bg-white/5 text-on-surface-variant hover:border-primary/30 hover:text-on-surface')}
				>
					<span class="sm:hidden"
						>{players !== 'cualquiera' ? optionLabels.players : 'Jugadores'}</span
					>
					<span class="hidden sm:inline">Jugadores</span>
					{#if players !== 'cualquiera'}
						<span class="hidden sm:inline">· {optionLabels.players}</span>
					{/if}
					<svg
						viewBox="0 0 24 24"
						class="h-4 w-4"
						fill="none"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-width="2" />
					</svg>
				</button>

				{#if openDropdown === 'players'}
					<div
						class="absolute top-full left-0 z-20 mt-2 w-max min-w-40 rounded-base surface-level-3 border border-glass-border p-1.5"
						role="listbox"
						aria-label="Jugadores"
					>
						{#each playerMenu as opt (opt.value)}
							<button
								type="button"
								role="option"
								aria-selected={players === opt.value}
								onclick={() => pickOption((v) => (players = v), opt.value)}
								class="flex w-full cursor-pointer items-center justify-between gap-8 rounded-base px-3 py-1.5 font-mono text-sm whitespace-nowrap transition hover:bg-white/5"
							>
								<span class={players === opt.value ? 'text-primary' : 'text-on-surface'}>
									{opt.label}
								</span>
								{#if players === opt.value}
									<svg
										viewBox="0 0 24 24"
										class="h-4 w-4 text-primary"
										fill="none"
										stroke="currentColor"
										aria-hidden="true"
									>
										<path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-width="2.2" />
									</svg>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<div class="relative">
				<button
					type="button"
					aria-haspopup="listbox"
					aria-expanded={openDropdown === 'duration'}
					onclick={() => toggleDropdown('duration')}
					class={chipBase +
						' inline-flex w-full items-center justify-between gap-2 px-4 py-2 sm:w-auto sm:justify-start ' +
						(duration !== 'cualquiera'
							? ' border-primary/50 bg-primary/15 text-primary'
							: ' border-glass-border bg-white/5 text-on-surface-variant hover:border-primary/30 hover:text-on-surface')}
				>
					<span class="sm:hidden"
						>{duration !== 'cualquiera' ? optionLabels.duration : 'Duración'}</span
					>
					<span class="hidden sm:inline">Duración</span>
					{#if duration !== 'cualquiera'}
						<span class="hidden sm:inline">· {optionLabels.duration}</span>
					{/if}
					<svg
						viewBox="0 0 24 24"
						class="h-4 w-4"
						fill="none"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-width="2" />
					</svg>
				</button>

				{#if openDropdown === 'duration'}
					<div
						class="absolute top-full left-0 z-20 mt-2 w-max min-w-40 rounded-base surface-level-3 border border-glass-border p-1.5"
						role="listbox"
						aria-label="Duración"
					>
						{#each durationMenu as opt (opt.value)}
							<button
								type="button"
								role="option"
								aria-selected={duration === opt.value}
								onclick={() => pickOption((v) => (duration = v), opt.value)}
								class="flex w-full cursor-pointer items-center justify-between gap-8 rounded-base px-3 py-1.5 font-mono text-sm whitespace-nowrap transition hover:bg-white/5"
							>
								<span class={duration === opt.value ? 'text-primary' : 'text-on-surface'}>
									{opt.label}
								</span>
								{#if duration === opt.value}
									<svg
										viewBox="0 0 24 24"
										class="h-4 w-4 text-primary"
										fill="none"
										stroke="currentColor"
										aria-hidden="true"
									>
										<path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-width="2.2" />
									</svg>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<div class="relative">
				<button
					type="button"
					aria-haspopup="listbox"
					aria-expanded={openDropdown === 'status'}
					onclick={() => toggleDropdown('status')}
					class={chipBase +
						' inline-flex w-full items-center justify-between gap-2 px-4 py-2 sm:w-auto sm:justify-start ' +
						(statusFilter !== 'cualquiera'
							? ' border-primary/50 bg-primary/15 text-primary'
							: ' border-glass-border bg-white/5 text-on-surface-variant hover:border-primary/30 hover:text-on-surface')}
				>
					<span class="sm:hidden"
						>{statusFilter !== 'cualquiera' ? optionLabels.status : 'Estado'}</span
					>
					<span class="hidden sm:inline">Estado</span>
					{#if statusFilter !== 'cualquiera'}
						<span class="hidden sm:inline">· {optionLabels.status}</span>
					{/if}
					<svg
						viewBox="0 0 24 24"
						class="h-4 w-4"
						fill="none"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-width="2" />
					</svg>
				</button>

				{#if openDropdown === 'status'}
					<div
						class="absolute top-full left-0 z-20 mt-2 w-max min-w-40 rounded-base surface-level-3 border border-glass-border p-1.5"
						role="listbox"
						aria-label="Estado"
					>
						{#each statusMenu as opt (opt.value)}
							<button
								type="button"
								role="option"
								aria-selected={statusFilter === opt.value}
								onclick={() => pickOption((v) => (statusFilter = v), opt.value)}
								class="flex w-full cursor-pointer items-center justify-between gap-8 rounded-base px-3 py-1.5 font-mono text-sm whitespace-nowrap transition hover:bg-white/5"
							>
								<span class={statusFilter === opt.value ? 'text-primary' : 'text-on-surface'}>
									{opt.label}
								</span>
								{#if statusFilter === opt.value}
									<svg
										viewBox="0 0 24 24"
										class="h-4 w-4 text-primary"
										fill="none"
										stroke="currentColor"
										aria-hidden="true"
									>
										<path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-width="2.2" />
									</svg>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<div class="relative">
				<button
					type="button"
					aria-haspopup="listbox"
					aria-expanded={openDropdown === 'rating'}
					onclick={() => toggleDropdown('rating')}
					class={chipBase +
						' inline-flex w-full items-center justify-between gap-2 px-4 py-2 sm:w-auto sm:justify-start ' +
						(minRating !== 'cualquiera'
							? ' border-primary/50 bg-primary/15 text-primary'
							: ' border-glass-border bg-white/5 text-on-surface-variant hover:border-primary/30 hover:text-on-surface')}
				>
					<span class="sm:hidden"
						>{minRating !== 'cualquiera' ? optionLabels.rating : 'Calificación'}</span
					>
					<span class="hidden sm:inline">Calificación</span>
					{#if minRating !== 'cualquiera'}
						<span class="hidden sm:inline">· {optionLabels.rating}</span>
					{/if}
					<svg
						viewBox="0 0 24 24"
						class="h-4 w-4"
						fill="none"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-width="2" />
					</svg>
				</button>

				{#if openDropdown === 'rating'}
					<div
						class="absolute top-full left-0 z-20 mt-2 w-max min-w-40 rounded-base surface-level-3 border border-glass-border p-1.5"
						role="listbox"
						aria-label="Calificación"
					>
						{#each ratingMenu as opt (opt.value)}
							<button
								type="button"
								role="option"
								aria-selected={minRating === opt.value}
								onclick={() => pickOption((v) => (minRating = v), opt.value)}
								class="flex w-full cursor-pointer items-center justify-between gap-8 rounded-base px-3 py-1.5 font-mono text-sm whitespace-nowrap transition hover:bg-white/5"
							>
								<span class={minRating === opt.value ? 'text-primary' : 'text-on-surface'}>
									{opt.label}
								</span>
								{#if minRating === opt.value}
									<svg
										viewBox="0 0 24 24"
										class="h-4 w-4 text-primary"
										fill="none"
										stroke="currentColor"
										aria-hidden="true"
									>
										<path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-width="2.2" />
									</svg>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			{#if hasActiveFilters}
				<button
					type="button"
					onclick={resetFilters}
					class="col-span-2 cursor-pointer px-2 text-center font-mono text-sm tracking-wide text-on-surface-variant underline decoration-primary/50 underline-offset-4 transition hover:text-on-surface sm:col-auto sm:text-left"
				>
					Limpiar
				</button>
			{/if}
		</div>

		{#if openDropdown !== 'none'}
			<button
				type="button"
				class="fixed inset-0 z-10 cursor-default"
				aria-label="Cerrar filtros"
				onclick={() => (openDropdown = 'none')}
			></button>
		{/if}
	</div>

	<p
		class="w-full max-w-6xl font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
	>
		{filteredGames.length} de {catalog.length} juegos en la ludoteca
	</p>

	<div
		class="grid w-full max-w-6xl grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
	>
		{#each visibleGames as game (game.id)}
			<button
				type="button"
				onclick={() => game.status === 'available' && openReservation(game)}
				class="group flex cursor-pointer flex-col text-left"
				aria-label={game.status === 'available'
					? `Reservar ${game.name}`
					: `${game.name}, prestado`}
			>
				<div class="relative aspect-[3/4] overflow-hidden rounded-base bg-surface-container-lowest">
					<img
						src={game.cover}
						alt={`Caja de ${game.name}`}
						loading="lazy"
						class={game.status === 'available'
							? 'h-full w-full object-cover transition duration-500 group-hover:scale-105'
							: 'h-full w-full object-cover opacity-70 grayscale transition duration-500 group-hover:opacity-80'}
						width="400"
						height="533"
					/>
					{#if game.status === 'loaned'}
						<div class="absolute inset-0 bg-primary/20">
							<span
								class="absolute bottom-2 left-2 rounded-base bg-black/50 px-2 py-0.5 font-mono text-xs tracking-wider text-on-surface uppercase backdrop-blur-sm"
							>
								Prestado
							</span>
						</div>
					{/if}
				</div>

				<div class="flex flex-col gap-0.5 px-1 pt-2">
					<h3
						class="line-clamp-2 font-display text-body-lg leading-snug font-semibold text-on-surface transition group-hover:text-primary"
					>
						{game.name}
					</h3>
					<p class="font-mono text-xs text-on-surface-variant">
						{game.minPlayers}–{game.maxPlayers} jug.
						{game.minTime === game.maxTime
							? `· ${game.minTime} min`
							: `· ${game.minTime}–${game.maxTime} min`}
					</p>
				</div>
			</button>
		{/each}
	</div>

	{#if filteredGames.length > visibleCount}
		<button
			type="button"
			onclick={() => (visibleCount += CATALOG_PAGE_SIZE)}
			class="cursor-pointer rounded-base border border-primary/50 bg-primary/10 px-6 py-2 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow"
		>
			Cargar más ({filteredGames.length - visibleCount} restantes)
		</button>
	{/if}

	{#if filteredGames.length === 0}
		<p class="text-body-md text-on-surface-variant">No hay juegos que coincidan con tu búsqueda.</p>
	{/if}
</section>

{#if selected}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-label={`Pedir ${selected.name}`}
	>
		<button
			type="button"
			class="absolute inset-0 cursor-pointer bg-black/60 backdrop-blur-sm"
			aria-label="Cerrar formulario"
			onclick={closeModal}
		></button>
		<div
			class="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-base surface-level-3 border border-glass-border p-6 sm:p-8"
		>
			<button
				type="button"
				onclick={closeModal}
				aria-label="Cerrar formulario"
				class="absolute top-3 right-3 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-base border border-glass-border bg-black/30 text-on-surface-variant transition hover:bg-black/50 hover:text-on-surface"
			>
				<svg
					viewBox="0 0 24 24"
					class="h-5 w-5"
					fill="none"
					stroke="currentColor"
					aria-hidden="true"
				>
					<path d="M18 6 6 18 M6 6l12 12" stroke-linecap="round" stroke-width="2" />
				</svg>
			</button>
			{#if submitted}
				<div class="flex flex-col items-center gap-3 py-6 text-center">
					<div
						class="flex h-14 w-14 items-center justify-center rounded-full border border-primary/50 bg-primary/15"
					>
						<svg
							viewBox="0 0 24 24"
							class="h-7 w-7 text-primary"
							fill="none"
							stroke="currentColor"
							aria-hidden="true"
						>
							<path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-width="2.2" />
						</svg>
					</div>
					<h3 class="font-display text-headline-md font-semibold text-on-surface">
						Solicitud enviada
					</h3>
					<p class="text-body-md text-on-surface-variant">
						El pedido de <span class="font-semibold text-on-surface">{selected.name}</span>
						quedó registrado. Te contactaremos para coordinar la entrega.
					</p>
					<button
						type="button"
						onclick={closeModal}
						class="mt-4 cursor-pointer rounded-base border border-primary/50 bg-primary/10 px-6 py-2 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow"
					>
						Listo
					</button>
				</div>
			{:else}
				<div class="mb-6 flex gap-4">
					<img
						src={selected.cover}
						alt={`Caja de ${selected.name}`}
						class="h-24 w-20 rounded-base border border-glass-border bg-surface-container-lowest object-cover"
						width="80"
						height="96"
					/>
					<div class="flex flex-col justify-center gap-1">
						<span class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
							>Pedir juego</span
						>
						<h3 class="font-display text-headline-md leading-tight font-semibold text-on-surface">
							{selected.name}
						</h3>
						<p class="font-mono text-sm text-on-surface-variant">
							{selected.minPlayers}–{selected.maxPlayers} jug.
							{selected.minTime === selected.maxTime
								? `· ${selected.minTime} min`
								: `· ${selected.minTime}–${selected.maxTime} min`}
						</p>
						{#if selected.status === 'loaned'}
							<span
								class="w-fit rounded-full border border-glass-border bg-black/40 px-2 py-0.5 font-mono text-xs tracking-wider text-on-surface-variant uppercase"
							>
								Prestado
							</span>
						{/if}
					</div>
				</div>

				<form onsubmit={handleSubmit} class="flex flex-col gap-4">
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div class="flex flex-col gap-1.5">
							<label
								for="pedir-nombre"
								class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
							>
								Nombre
							</label>
							<input
								id="pedir-nombre"
								type="text"
								bind:value={nameValue}
								placeholder="Tu nombre completo"
								class="w-full rounded-base border border-glass-border bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/70 focus:border-primary/50"
							/>
						</div>
						<div class="flex flex-col gap-1.5">
							<label
								for="pedir-rol"
								class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
							>
								ROL
							</label>
							<input
								id="pedir-rol"
								type="text"
								bind:value={rolValue}
								placeholder="12345678-9"
								class="w-full rounded-base border border-glass-border bg-surface-container-lowest px-4 py-2.5 font-mono text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/70 focus:border-primary/50"
							/>
						</div>
					</div>

					<div class="flex flex-col gap-1.5">
						<label
							for="pedir-correo"
							class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
						>
							Correo
						</label>
						<input
							id="pedir-correo"
							type="email"
							bind:value={emailValue}
							placeholder="correo@usm.cl"
							class="w-full rounded-base border border-glass-border bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/70 focus:border-primary/50"
						/>
					</div>

					<div class="flex flex-col gap-1.5">
						<label
							for="pedir-comentario"
							class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
						>
							Comentario <span class="normal-case opacity-60">(opcional)</span>
						</label>
						<textarea
							id="pedir-comentario"
							bind:value={commentValue}
							rows="2"
							placeholder="Algo que debamos saber…"
							class="w-full resize-none rounded-base border border-glass-border bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/70 focus:border-primary/50"
						></textarea>
					</div>

					<details class="rounded-base border border-glass-border bg-surface-container-lowest px-4">
						<summary
							class="cursor-pointer py-3 font-mono text-label-md tracking-wider text-on-surface-variant uppercase select-none hover:text-on-surface"
						>
							Términos y Condiciones
						</summary>
						<div class="text-body-sm flex flex-col gap-2 pb-4 text-on-surface-variant">
							<p>
								Los préstamos son gratuitos y exclusivos para estudiantes USM. Al retirar un juego
								te haces responsable de la caja y su contenido.
							</p>
							<p>
								Devuelve la caja completa y en el mismo estado, dentro del plazo acordado con el
								club.
							</p>
							<p>
								El club se reserva el derecho de suspender el préstamo en caso de atrasos o daños
								recurrentes.
							</p>
						</div>
					</details>

					<label class="text-body-sm flex cursor-pointer items-start gap-3 text-on-surface-variant">
						<input
							type="checkbox"
							bind:checked={termsAccepted}
							class="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary"
						/>
						<span>He leído y acepto los términos y condiciones del préstamo.</span>
					</label>

					<button
						type="submit"
						disabled={!termsAccepted || submitting}
						aria-busy={submitting}
						class="disabled:ice-glow-none mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-base border border-primary/50 bg-primary/10 px-6 py-2.5 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-primary/10"
					>
						{#if submitting}
							<svg
								viewBox="0 0 24 24"
								class="h-4 w-4 animate-spin"
								fill="none"
								stroke="currentColor"
								aria-hidden="true"
							>
								<path d="M21 12a9 9 0 1 1-6.219-8.56" stroke-linecap="round" stroke-width="2.2" />
							</svg>
							Enviando…
						{:else}
							Enviar solicitud
						{/if}
					</button>
				</form>
			{/if}
		</div>
	</div>
{/if}
