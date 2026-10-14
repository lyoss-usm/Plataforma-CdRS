import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchBggXml, parseBggThing } from '$lib/server/bgg';

export const GET: RequestHandler = async ({ params }) => {
    const { id } = params;

    if (!/^\d+$/.test(id)) error(400, 'id inválido');

    try {
        return json(parseBggThing(await fetchBggXml(id)));
    } catch (e) {
        console.error('[bgg]', e);
        error(502, 'BGG no disponible');
    }
};