import { bggConfigSchema } from '../schemas/bgg.ts';
import contenido from './bgg.json';

/** Traducciones y umbrales BGG → dominio: se editan en `bgg.json`; un JSON inválido rompe el arranque. */
export const bggConfig = bggConfigSchema.parse(contenido);
