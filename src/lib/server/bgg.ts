import { env } from '$env/dynamic/private';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { XMLParser } from 'fast-xml-parser';

export async function fetchBggXml(id: string): Promise<string> {
    if (env.BGG_MOCK === '1') {
        return readFile(join(process.cwd(), 'fixtures', 'bgg', `${id}.xml`), 'utf-8');
    }

    const res = await fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${id}`, {
        headers: { Authorization: `Bearer ${env.BGG_API_TOKEN}`},
        signal: AbortSignal.timeout(3000)
    });
    if (!res.ok) throw new Error(`BGG status ${res.status}`);
    return res.text();
}

type BggAttr = { '@_value': string };
type BggName = { '@_type': string; '@_value': string };
type BggItem = {
    '@_id': string;
    name?: BggName[];
    yearpublished?: BggAttr;
    minplayers?: BggAttr;
    maxplayers?: BggAttr;
    playingtime?: BggAttr;
    image?: string;
    thumbnail?: string;
};

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => name === 'name'
});

export function parseBggThing(xml: string) {
    const item = parser.parse(xml)?.items?.item as BggItem | undefined;
    if (!item) throw new Error('XML sin <item>');

    const primary = item.name?.find((n) => n['@_type'] === 'primary') ?? item.name?.[0];
    const num = (node?: BggAttr) => (node ? Number(node['@_value']) : null);

    return {
        id: Number(item['@_id']),
        name: primary?.['@_value'] ?? null,
        year: num(item.yearpublished),
        minPlayers: num(item.minplayers),
        maxPlayers: num(item.maxplayers),
        playingTime: num(item.playingtime),
        image: item.image ?? null,
        thumbnail: item.thumbnail ?? null
    };
}