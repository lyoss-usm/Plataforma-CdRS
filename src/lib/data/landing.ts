import { landingSchema } from '$lib/schemas';
import contenido from './landing.json';

/** Textos de la landing: se editan en `landing.json` sin tocar los componentes. */
export const landing = landingSchema.parse(contenido);
