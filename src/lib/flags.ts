import { env } from '$env/dynamic/public';
import { flagsSchema } from '$lib/schemas/flags';

/**
 * Módulos encendidos en este despliegue (#40), leídos de `PUBLIC_FLAG_*`. Un valor inválido
 * rompe el arranque (y el build, al prerenderizar la landing) en vez de dejar un módulo expuesto.
 * La landing es prerenderizada: sus enlaces usan el valor del build, así que cambiar un flag
 * exige volver a desplegar.
 */
export const flags = flagsSchema.parse(env);
