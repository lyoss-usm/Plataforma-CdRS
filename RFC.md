# RFC: Plataforma Club de Rol Sansano

## 1. Contexto y Visión
* **Problema Actual:** El *Club de Rol Sansano* opera con un ecosistema fragmentado y poco eficiente (Notion, Google Forms y AppSheet). Esto provoca mala sincronización de datos, una interfaz deficiente y un rendimiento lento que entorpece la gestión de préstamos, especialmente en eventos presenciales.
* **Objetivo General:** Desarrollar un sistema centralizado de gestión que profesionalice la operación del club mediante la unificación del inventario, la trazabilidad de préstamos y la exposición pública de la iniciativa.
* **Objetivos Específicos:**
    * Digitalizar y automatizar el flujo de prestamos "General" y de "Juntas Masivas" en una sola plataforma.
    * Implementar un sistema de gestion de inventario enriquecido por la API de BoardGameGeek (BGG) con redundancia local.
    * Implementar una plataforma administrativa con control de acceso basado en roles para segmentar las capacidades del staff (Directivos, Senior, Junior).
    * Garantizar la integridad del sistema manteniendo el código bajo un modelo **Open Source**, delegando la autenticación y autorización en servicios o librerías de terceros para asegurar estándares de industria sin exponer la lógica de acceso sensible.
    * Proveer una interfaz pública que visibilice la iniciativa del club.
* **Métrica de Éxito:** Eliminación total de las colisiones de datos en el inventario y capacidad de respuesta del sistema inferior a 2 segundos en condiciones de alta demanda (Juntas Masivas).
* **Imagen a Proyectar:** Hosiptalidad y Fluidez. Refleja el ambiente de una comunidad de ROL, invitando a explorar el catalogo y evitando a toda costa la friccion/distancia con el usuario.

> [!NOTE]
> La fecha limite **recomendada** para este proyecto es el **17 de octubre**. (Nerdonomicon)

## 2. Requisitos y Alcance (Definiendo el MVP)
* **Usuarios Finales / Interesados:**
   - *Estudiantes de la USM*: Publico general que navega por el catalogo y realiza solicitudes de prestamo.
   - *Staff Junior*: Voluntarios del club encargados de la atencion presencial en el meson durante las Juntas Masivas.
   - *Staff Senior*: Miembros con responsabilidades adicionales que gestionan tanto las juntas como los prestamos generales solicitados por la web.
   - *Directivos*: Administradores del sistema con control total sobre el inventario, moderacion de usuarios y la configuracion de permisos del staff.
   - *LyOSS*: Equipo desarrollador y coordinacion, interesados en entregar un producto Open Source que cumpla estandares tecnicos y de seguridad.
* **Requisitos Funcionales (Indispensable / Ahora):**
   - **Publico**
      - El usuario **debe** poder visualizar el catalogo de juegos actualizado **para** conocer la disponibilidad y detalles antes de solicitar un prestamo.
      - El usuario **debe** poder completar un formulario de solicitud integrado **para** gestionar prestamos sin ser redirigido a herramientas externas.
      - El sistema **debe** presentar la iniciativa del club mediante una interfaz publica **para** atraer nuevos miembros y visibilizar sus actividades.
   - **Administrativo**
      - El staff **debe** poder ingresar datos de usuarios directamente en el panel administrativo **para** agilizar la entrega de juegos durante juntas masivas.
      - El sistema **debe** permitir gestionar el ciclo de vida del juego a traves de estados estrictos (En bodega, Prestado, Por contar, ...) **para** asegurar trazabilidad del inventario.
      - El sistema **debe** permitir administrar el catalogo interno, permitiendo agregar, editar o retirar juegos, enriqueciendo la ficha con datos de BGG almacenados **para** mantener el catalogo actualizado con el minimo esfuerzo manual.
      - El sistema **debe** permitir aplicar restricciones (baneos) a usuarios especificos **para** prevenir el mal uso del servicio de prestamos.
      - El sistema **debe** controlar el acceso mediante roles **para** limitar las acciones de escritura y gestion segun el nivel de staff (Junior, Senior, Directivo).
      - El sistema **debe** permitir exportar los datos en formato CSV **para** que el staff pueda analizarlos externamente con herramientas como NumPy.
      - El sistema **debe** permitir la busqueda de juego por nombre ignorando mayusculas y minusculas **para** agilizar la localizacion de items en el catalogo (para usuarios y staff).
      - El sistema **debe** permitir la identificacion de inventario mediante el escaneo de codigos QR **para** reducir el error humano.
   
* **Lujo / Futuro (Despues del MVP):**
  * Herramienta específica para registrar la afluencia de personas en eventos y juntas, independiente del flujo de préstamos, para generar estadísticas de participación.
  * Implementación de búsqueda por etiquetas complejas (mecánicas de juego, duración exacta, dificultad) y un sistema que sugiera juegos basados en los gustos del usuario.
  * Registro histórico de todos los juegos tomados por un usuario y su comportamiento (devoluciones a tiempo vs. atrasos) para facilitar la toma de decisiones en moderación.
  * Generación de gráficos y reportes sobre los juegos más solicitados, horas de mayor afluencia y comportamiento de préstamos por usuario.
  * Envío de alertas vía WhatsApp o correo electrónico para avisar a los usuarios sobre el vencimiento próximo de sus préstamos o confirmaciones de reserva.

* **Fuera de Alcance (¿Qué NO es el proyecto?):**
   - El sistema no permite jugar juegos de mesa de forma digital, es estrictamente para la gestión de inventario físico.
   - No se gestionarán transacciones monetarias, membresías pagadas ni multas económicas a través de la plataforma.
   - El proyecto no incluye perfiles públicos de usuarios con seguidores, muros de publicaciones o chats internos entre jugadores.
   - No se incluirá lógica para la creación de llaves de torneos, registro de puntajes competitivos o rankings de juegos específicos.

## 3. Diseño Técnico y Arquitectura

* **Diagrama de Contexto:**
<img alt="image" src="https://github.com/user-attachments/assets/5721775a-dc90-4dcd-8cff-b9f812e73466" />

* **Stack e Infraestructura:**
    * **Lenguajes/Librerias (Solo las mas importantes):** Svelte 5, Tailwind 4, Typescript, SQL.
    * **Infraestructura:**
         - **Aplicacion Web:** Sveltekit (Cloudflare pages).
         - **Backend as a Service:** Supabase (Base de Datos y Authenticacion).
    * **Licencia Sugerida:** MIT.
* **Requisitos No Funcionales:**
  - El sistema debe ser "Invite-Only", delegando la autenticación a Supabase Auth y la autorización a políticas de Row Level Security (RLS) para proteger los datos sensibles.
  - La arquitectura sobre Cloudflare Pages debe soportar picos de tráfico de usuarios simultáneos durante eventos del club sin degradación de servicio.
  - La interfaz administrativa debe ser "Mobile-First" para facilitar la gestión del staff en bodega y visualmente simple para no abrumar a los usuarios finales.
  - El sistema debe procesar búsquedas de catálogo y registros de préstamos en menos de 2 segundos para asegurar la fluidez en Juntas Masivas.
  - La información de juegos obtenida de la API de BGG debe contar con persistencia local (redundancia) para que el catálogo sea funcional incluso sin conexión a la API externa.

---

**Notas para el revisor:**
- El uso de Cloudflare Pages y Supabase permite que el costo operativo de esta infraestructura sea $0, cumpliendo con la sostenibilidad del proyecto a largo plazo.
- La seguridad no reside en el código (que es público), sino en la base de datos, lo que permite que cualquier persona pueda auditar el software sin comprometer las credenciales del club.
- Se prioriza la velocidad de respuesta en el mesón como el factor crítico de éxito técnico.
