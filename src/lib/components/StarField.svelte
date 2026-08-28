<script lang="ts">
	let { density = 2 }: { density?: number } = $props();

	let canvas = $state<HTMLCanvasElement>();
	let ctx: CanvasRenderingContext2D;
	let raf = 0;
	let stars: Star[] = [];
	let size = { w: 0, h: 0 };
	let color = '#c5eaff';
	let colorCore = '#7dd3fc';

	type Star = {
		x: number;
		y: number;
		r: number;
		aspect: number;
		rot: number;
		base: number;
		phase: number;
		freq: number;
		vy: number;
		core: boolean;
	};

	const withAlpha = (hex: string, alpha: number) => {
		const n = parseInt(hex.slice(1), 16);
		return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
	};

	const spawn = () => {
		const count = Math.floor((size.w * size.h) / 16000) * Math.max(1, density);
		stars = Array.from({ length: count }, () => ({
			x: Math.random() * size.w,
			y: Math.random() * size.h,
			r: 0.8 + Math.random() * 1.9,
			aspect: 1 + Math.random() * 1.3,
			rot: Math.random() * Math.PI,
			base: 0.25 + Math.random() * 0.75,
			phase: Math.random() * Math.PI * 2,
			freq: 0.5 + Math.random() * 1.8,
			vy: -(0.02 + Math.random() * 0.12),
			core: Math.random() < 0.25
		}));
	};

	const starPath = (k: number) => {
		const pts = [
			[0, -1],
			[1, 0],
			[0, 1],
			[-1, 0]
		];
		ctx.beginPath();
		ctx.moveTo(0, -1);
		for (let i = 0; i < 4; i++) {
			const [ax, ay] = pts[i];
			const [bx, by] = pts[(i + 1) % 4];
			ctx.bezierCurveTo(ax * k, ay * k, bx * k, by * k, bx, by);
		}
		ctx.closePath();
	};

	const draw = (t: number) => {
		ctx.clearRect(0, 0, size.w, size.h);
		for (const s of stars) {
			s.y += s.vy;
			if (s.y < -4) {
				s.y = size.h + 4;
				s.x = Math.random() * size.w;
			}
			const tw = 0.5 + 0.5 * Math.sin(t * s.freq * 2 + s.phase);
			const alpha = s.base * (0.35 + 0.65 * tw);
			const scale = 1 + 0.14 * tw;
			const col = s.core ? colorCore : color;

			const halo = s.r * 4;
			const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, halo);
			g.addColorStop(0, withAlpha(col, alpha * 0.2));
			g.addColorStop(1, withAlpha(col, 0));
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc(s.x, s.y, halo, 0, Math.PI * 2);
			ctx.fill();

			ctx.save();
			ctx.translate(s.x, s.y);
			ctx.rotate(s.rot);
			ctx.scale(s.r * scale, s.r * s.aspect * scale);
			starPath(0.42);
			ctx.fillStyle = withAlpha(col, alpha);
			ctx.fill();
			ctx.restore();
		}
	};

	$effect(() => {
		if (!canvas) return;
		const c = canvas;
		ctx = c.getContext('2d')!;

		const resize = () => {
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			const { clientWidth, clientHeight } = c.parentElement!;
			c.width = clientWidth * dpr;
			c.height = clientHeight * dpr;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			size = { w: clientWidth, h: clientHeight };
			spawn();
		};

		const cs = getComputedStyle(document.documentElement);
		color = cs.getPropertyValue('--color-primary').trim() || '#c5eaff';
		colorCore = cs.getPropertyValue('--color-primary-fixed-dim').trim() || '#7dd3fc';

		const ro = new ResizeObserver(resize);
		ro.observe(c.parentElement!);
		resize();

		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		let t = 0;
		const frame = () => {
			t += 0.016 * 2;
			draw(t);
			if (!reduced) raf = requestAnimationFrame(frame);
		};
		if (reduced) {
			draw(0);
		} else {
			raf = requestAnimationFrame(frame);
		}

		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
		};
	});
</script>

<canvas
	bind:this={canvas}
	class="pointer-events-none absolute inset-0 h-full w-full"
	aria-hidden="true"
></canvas>
