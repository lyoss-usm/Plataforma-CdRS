-- Cuentas de staff SOLO para desarrollo local (se cargan con `supabase db reset`).
-- Contraseña de las tres cuentas: cdrs-dev
--   dev.junior@usm.cl · dev.senior@usm.cl · dev.directivo@usm.cl
-- RUT/teléfono fuera de los rangos del seed faker (RUT 70M+, teléfono 10M+).

INSERT INTO auth.users (
	instance_id,
	id,
	aud,
	role,
	email,
	encrypted_password,
	email_confirmed_at,
	raw_app_meta_data,
	raw_user_meta_data,
	created_at,
	updated_at,
	confirmation_token,
	email_change,
	email_change_token_new,
	recovery_token
)
SELECT
	'00000000-0000-0000-0000-000000000000',
	cuenta.id,
	'authenticated',
	'authenticated',
	cuenta.email,
	extensions.crypt('cdrs-dev', extensions.gen_salt('bf')),
	now(),
	'{"provider":"email","providers":["email"]}',
	'{}',
	now(),
	now(),
	'',
	'',
	'',
	''
FROM (
	VALUES
		('00000000-0000-4000-8000-000000000001'::uuid, 'dev.junior@usm.cl'),
		('00000000-0000-4000-8000-000000000002'::uuid, 'dev.senior@usm.cl'),
		('00000000-0000-4000-8000-000000000003'::uuid, 'dev.directivo@usm.cl')
) AS cuenta (id, email)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
	id,
	user_id,
	provider_id,
	identity_data,
	provider,
	last_sign_in_at,
	created_at,
	updated_at
)
SELECT
	u.id,
	u.id,
	u.id::text,
	jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
	'email',
	now(),
	now(),
	now()
FROM auth.users AS u
WHERE u.email IN ('dev.junior@usm.cl', 'dev.senior@usm.cl', 'dev.directivo@usm.cl')
ON CONFLICT DO NOTHING;

INSERT INTO public."Sansano" (
	"rutSansano",
	"rolSansano",
	"digitoVerificador",
	"idCargo",
	"nombreSansano",
	"telefono",
	"correoInstitucional",
	"authUserId"
)
SELECT
	staff.rut,
	staff.rol,
	staff.dv,
	c."idCargo",
	staff.nombre,
	staff.telefono,
	staff.correo,
	staff.auth_id
FROM (
	VALUES
		(60000001, 202500001, 2, 'Junior', 'Valentina Rojas (dev)', 90000001, 'dev.junior@usm.cl', '00000000-0000-4000-8000-000000000001'::uuid),
		(60000002, 202500002, 0, 'Senior', 'Manuel Pizarro (dev)', 90000002, 'dev.senior@usm.cl', '00000000-0000-4000-8000-000000000002'::uuid),
		(60000003, 202500003, 9, 'Directivo', 'Camila Vergara (dev)', 90000003, 'dev.directivo@usm.cl', '00000000-0000-4000-8000-000000000003'::uuid)
) AS staff (rut, rol, dv, cargo, nombre, telefono, correo, auth_id)
JOIN public."Cargo" AS c ON c."nombreCargo" = staff.cargo
ON CONFLICT ("rutSansano") DO NOTHING;
