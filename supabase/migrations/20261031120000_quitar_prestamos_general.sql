-- Elimina el permiso `prestamos:general`. El "préstamo general" del club es la solicitud web que se
-- retira presencialmente (wiki § 1.2, #18), cubierto por `solicitudes:atender`; no existe un préstamo
-- presencial sin solicitud fuera de junta. Si en el mesón no se retiene documento, el cajero de junta
-- registra tipoDocumento 'Otro'.
-- Las políticas se recrean cambiando `prestamos:general` por `solicitudes:atender` (el permiso del
-- flujo general real: atender la solicitud crea el Prestamo y marca el Ejemplar). Nadie pierde acceso.

DROP POLICY "ejemplar_update_staff" ON public."Ejemplar";
CREATE POLICY "ejemplar_update_staff" ON public."Ejemplar"
	FOR UPDATE TO authenticated
	USING (
		public.tiene_permiso('inventario:editar')
		OR public.tiene_permiso('prestamos:junta')
		OR public.tiene_permiso('solicitudes:atender')
		OR public.tiene_permiso('prestamos:devolver')
	)
	WITH CHECK (
		public.tiene_permiso('inventario:editar')
		OR public.tiene_permiso('prestamos:junta')
		OR public.tiene_permiso('solicitudes:atender')
		OR public.tiene_permiso('prestamos:devolver')
	);

DROP POLICY "solicitud_update_staff" ON public."Solicitud";
CREATE POLICY "solicitud_update_staff" ON public."Solicitud"
	FOR UPDATE TO authenticated
	USING (
		public.tiene_permiso('solicitudes:atender')
		OR public.tiene_permiso('prestamos:junta')
	)
	WITH CHECK (
		public.tiene_permiso('solicitudes:atender')
		OR public.tiene_permiso('prestamos:junta')
	);

DROP POLICY "prestamo_insert_staff" ON public."Prestamo";
CREATE POLICY "prestamo_insert_staff" ON public."Prestamo"
	FOR INSERT TO authenticated
	WITH CHECK (
		public.tiene_permiso('prestamos:junta')
		OR public.tiene_permiso('solicitudes:atender')
	);

DROP POLICY "prestamo_update_staff" ON public."Prestamo";
CREATE POLICY "prestamo_update_staff" ON public."Prestamo"
	FOR UPDATE TO authenticated
	USING (
		public.tiene_permiso('prestamos:junta')
		OR public.tiene_permiso('solicitudes:atender')
		OR public.tiene_permiso('prestamos:devolver')
	)
	WITH CHECK (
		public.tiene_permiso('prestamos:junta')
		OR public.tiene_permiso('solicitudes:atender')
		OR public.tiene_permiso('prestamos:devolver')
	);

DELETE FROM public."CargoPermiso"
WHERE "idPermiso" = (SELECT "idPermiso" FROM public."Permiso" WHERE "nombrePermiso" = 'prestamos:general');

DELETE FROM public."Permiso" WHERE "nombrePermiso" = 'prestamos:general';
