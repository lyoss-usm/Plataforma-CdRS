import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';

const prestamoJuntaSchema = z.object({
    idEjemplar: z.string().min(1, 'El código del ejemplar es requerido'),
    rutSansano: z.number().int().positive('El RUT del solicitante es inválido'),
    tipoDocumento: z.enum(['Carnet', 'TNE', 'TUI', 'Otro'])
});

const devolucionSchema = z.object({
    idPrestamo: z.number().int().positive('ID de préstamo inválido'),
    estadoFinal: z.enum(['Para revisar', 'En bodega', 'De baja'])
});


function getSupabaseConfig() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY.');
    }

    return {
        url: SUPABASE_URL.replace(/\/$/, ''),
        anonKey: SUPABASE_ANON_KEY
    };
}



export const POST: RequestHandler = async ({ request, url }) => {
    const tipo = url.searchParams.get('tipo');
    if (tipo !== 'junta') {
        return json({ error: 'Endpoint configurado solo para préstamos de junta' }, { status: 400 });
    }

    try {
        const body = await request.json();
        
        const datos = prestamoJuntaSchema.parse(body);

        // OJO: Como tu proyecto maneja la sesión con un store de Svelte (adminSession), 
        // temporalmente pondremos un RUT de prueba para que pase. 
        // Luego deberás leer el token de autorización del request.
        const rutStaff = 12345678; 

        const { url: supabaseUrl, anonKey } = getSupabaseConfig();

        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/crear_prestamo_junta`, {
            method: 'POST',
            headers: {
                apikey: anonKey,
                Authorization: `Bearer ${anonKey}`, // Idealmente, aquí va el Bearer Token del admin autenticado
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                p_id_ejemplar: datos.idEjemplar,
                p_rut_sansano: datos.rutSansano,
                p_rut_staff: rutStaff,
                p_tipo_documento: datos.tipoDocumento
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            console.error('Error de Supabase HTTP:', response.status, errorData);
            return json({ error: errorData?.message || 'Error al crear el préstamo en base de datos' }, { status: response.status });
        }

        const idPrestamo = await response.json();

        return json({ success: true, idPrestamo }, { status: 200 });

    } catch (err) {
        if (err instanceof z.ZodError) {
            return json({ error: 'Datos inválidos', detalles: err.flatten().fieldErrors }, { status: 400 });
        }
        console.error('Error interno:', err);
        return json({ error: 'Error interno del servidor' }, { status: 500 });
    }
};

export const PATCH: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        const datos = devolucionSchema.parse(body);
        
        const rutStaff = 12345678; // Mock temporal
        const { url: supabaseUrl, anonKey } = getSupabaseConfig();

        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/devolver_prestamo`, {
            method: 'POST', // Supabase expone los RPC internamente mediante POST
            headers: {
                apikey: anonKey,
                Authorization: `Bearer ${anonKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                p_id_prestamo: datos.idPrestamo,
                p_rut_receptor: rutStaff,
                p_estado_final: datos.estadoFinal
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            console.error('Error de Supabase HTTP:', response.status, errorData);
            return json({ error: errorData?.message || 'Error al devolver el préstamo' }, { status: response.status });
        }

        return json({ success: true }, { status: 200 });

    } catch (err) {
        if (err instanceof z.ZodError) {
            return json({ error: 'Datos inválidos', detalles: err.flatten().fieldErrors }, { status: 400 });
        }
        console.error('Error interno:', err);
        return json({ error: 'Error interno del servidor' }, { status: 500 });
    }
};