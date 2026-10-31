import { z } from 'zod';

const rutaEstaticaSchema = z.string().startsWith('/');

export const landingSchema = z.object({
	meta: z.object({
		titulo: z.string().min(1),
		descripcion: z.string().min(1),
		imagenOg: rutaEstaticaSchema,
		imagenOgAlt: z.string().min(1)
	}),
	lema: z.string().min(1),
	navegacion: z.array(z.object({ href: z.string().startsWith('#'), label: z.string().min(1) })),
	nosotros: z.array(
		z.object({
			titulo: z.string().min(1),
			img: rutaEstaticaSchema,
			alt: z.string().min(1),
			cuadrado: z.boolean(),
			texto: z.string().min(1)
		})
	),
	faq: z.array(z.object({ q: z.string().min(1), a: z.string().min(1) })),
	eventos: z.array(
		z.object({
			src: rutaEstaticaSchema,
			alt: z.string().min(1),
			caption: z.string().min(1),
			cols: z.string(),
			rot: z.string()
		})
	),
	redes: z.array(
		z.object({ name: z.string().min(1), handle: z.string().min(1), url: z.string().min(1) })
	)
});

export type Landing = z.infer<typeof landingSchema>;
