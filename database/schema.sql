create table public.tipo_usuarios(
    id uuid primary key,
    nombre text unique not null
);

-- me  tome la libertad de definir los siguientes dos tipos de usuario.
insert into tipo_usuarios values(gen_random_uuid(), 'administrador');
insert into tipo_usuarios values('6d7fe9d1-8d34-4c93-8d88-889db0e8531b', 'jugador');

create table public.usuarios(
    id uuid references auth.users(id) on delete cascade primary key,
    tipo_de_usuario uuid references tipo_usuarios(id) default '6d7fe9d1-8d34-4c93-8d88-889db0e8531b' not null,
    created_at timestamp with time zone default now() not null
);

create table public.posibles_estados_inventario(
    --si esta ok para ser utilizado, reparar, no mostrarlo, etc. Falta ponernos deacurdo en valores inamovibles
    --considerar valores inamovibles como "administrador" y "jugador"
    id integer primary key,
    descripcion text unique not null,
    -- por si alguien agrega descripciones profanas, sepan quien fue
    created_by uuid references public.usuarios(id)
);

create table public.fabricante(
    id bigint primary key,
    nombre text unique not null,
    created_at timestamp with time zone default now() not null,
    -- por si alguien agrega descripciones profanas, sepan quien fue
    created_by uuid references public.usuarios(id)
);

create table public.cantidad_jugadores(
    -- es probable que se repita mucho estos textos. por tanto que se guarden aqui
    id bigint primary key,
    descripcion text unique not null,
    created_at timestamp with time zone default now() not null,
    -- por si alguien agrega descripciones profanas, sepan quien fue
    created_by uuid references public.usuarios(id)
);

create table public.juegos_de_mesa(
    id bigint primary key,
    fabricante bigint references public.fabricante(id),
    nombre text unique not null,
    numero_de_piezas bigint,
    numero_de_jugadores bigint references public.cantidad_jugadores(id) not null,
    duracion text not null,
    edad_minima text not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,
    -- por si alguien agrega descripciones profanas, sepan quien fue
    updated_by uuid references public.usuarios(id) not null
);

create table public.imagenes_juego_de_mesa(
    --Todas las imagenes relacionadas a caratulas / promociones del juego
    juego bigint references public.juegos_de_mesa(id),
    path_imagen text unique,
    created_at timestamp with time zone default now() not null,
    -- por si alguien agrega descripciones profanas, sepan quien fue
    uploaded_by uuid references public.usuarios(id) not null
);

create table public.piezas_de_un_juego(
    --por si es necesario agregar imagenes de cada pieza del juego
    id bigint primary key,
    id_juego bigint references public.juegos_de_mesa(id),
    descripcion text not null,
    path_de_imagen text unique,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,
    -- por si alguien agrega descripciones profanas, sepan quien fue
    updated_by uuid references public.usuarios(id) not null

);

create table public.inventario(
    id uuid primary key,
    id_juego_de_mesa bigint references public.juegos_de_mesa(id),
    numero_de_serie text unique not null,
    --descripcion_estado esta aqui para poder hacer queries mas rapido que tener que hacer un max(created_at) en estado_inventario
    --lo que esto implica es que hay que mantener los 2. Si supabase permite definir comportamiento custom, favor de verlo ahi.
    descripcion_estado integer references public.posibles_estados_inventario(id) not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,
    updated_by uuid references public.usuarios(id) not null
);

create table public.condicion_inventario(
    --registrar individualmente eventos del inventario. cualquier observación que pueda levantar un administrador
    id_inventario uuid references public.inventario(id) not null,
    id_pieza bigint references public.piezas_de_un_juego(id) not null,
    descripcion text not null,
    updated_by uuid references public.usuarios(id),
    created_at timestamp with time zone default now() not null
);

create table public.estado_inventario(
    --guarda el historico de los estados del inventario. Si el juego esta en condiciones de ser usado, reparado, etc
    id_inventario uuid references public.inventario,
    declarado_por_administrador uuid references public.usuarios(id),
    descripcion_estado bigint references public.posibles_estados_inventario(id) not null,
    created_at timestamp with time zone default now() not null
);

create table public.prestamos(
    id uuid primary key,
    id_inventario uuid references public.inventario(id),
    recibido_por_jugador uuid references public.usuarios(id),
    entregado_por_administrador uuid references public.usuarios(id),
    created_at timestamp with time zone default now() not null
);

create table public.devoluciones(
    --la idea aqui es que un jugador puede devolver el juego y posteriormente piezas de llegar a ser necesario.
    id uuid primary key,
    id_prestamo uuid references prestamos(id),
    numero_de_piezas bigint,
    recibido_por_administrador uuid references public.usuarios(id),
    entregado_por_jugador uuid references public.usuarios(id),
    created_at timestamp with time zone default now() not null
);