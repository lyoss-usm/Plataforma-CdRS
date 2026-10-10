-- 1. Juego base
INSERT INTO "Juego" ("idJuego", "nombreJuego", "tipo") 
VALUES (1, 'Catan', 'Juego base')
ON CONFLICT ("idJuego") DO NOTHING;

-- 2. Expansión
INSERT INTO "Juego" ("idJuego", "nombreJuego", "tipo", "idJuegoBase") 
VALUES (2, 'Catan: Seafarers', 'Expansión', 1)
ON CONFLICT ("idJuego") DO NOTHING;

-- 3. Ejemplar con los campos requeridos cubiertos
INSERT INTO "Ejemplar" ("idEjemplar", "idJuego", "esExterno", "estadoEjemplar", "estadoCompletitud") 
VALUES ('EXP-001', 2, false, 'En bodega', 'Completo');