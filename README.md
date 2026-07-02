# IMSS Bienestar BC — Frontend

Aplicación web en Angular 22 para autenticación y administración de catálogos, Personas, Usuarios y roles del sistema IMSS Bienestar BC.

## Tecnologías

- Angular 22 con componentes standalone.
- Angular Material.
- Signals para estado local y de autenticación.
- RxJS para peticiones, búsqueda con espera y coordinación de operaciones.
- Vitest mediante Angular CLI.
- Netlify para despliegue del sitio estático.

## Requisitos

- Node.js `24.17.0`, definido en `.nvmrc`.
- npm `11.12.1` o una versión compatible.
- Backend disponible localmente en `http://localhost:8080`.

## Instalación

```bash
npm install
```

## Ejecutar localmente

```bash
npm start
```

La aplicación queda disponible en:

```text
http://localhost:4200
```

### Usuario de desarrollo

Con el backend local en ejecución:

```text
email: demo@example.com
password: P**********!
rol: ADMIN_TIC
```

## Configuración de la API

Las URL se definen en:

```text
src/environments/environment.ts
src/environments/environment.development.ts
```

Desarrollo utiliza:

```ts
apiBaseUrl: 'http://localhost:8080'
```

La configuración de producción apunta al backend desplegado. Los servicios consumen `APP_CONFIG`; no deben declarar URLs base directamente.

Los paths de cada endpoint están centralizados en `src/app/core/config/app-config.ts`.

## Arquitectura

La aplicación separa responsabilidades por capas:

- `domain`: modelos y contratos sin dependencias de presentación.
- `application`: casos de uso y estado de autenticación.
- `infrastructure`: servicios HTTP, DTOs, mappers y almacenamiento de tokens.
- `presentation`: páginas, diálogos y componentes visuales.
- `core`: configuración, guards, interceptores y layout compartido.

Los módulos nuevos deben seguir la misma dirección de dependencias:

```text
presentation → application/domain ← infrastructure
```

Para operaciones administrativas sencillas, algunos componentes consumen servicios de infraestructura directamente. Cuando una operación concentra reglas reutilizables, debe extraerse a un caso de uso en `application`.

## Rutas y autorización

| Ruta | Acceso | Descripción |
|---|---|---|
| `/login` | Invitado | Inicio de sesión. |
| `/dashboard` | Usuario autenticado | Perfil actual, cambio de contraseña y cierre de sesión. |
| `/catalogos` | `ADMIN_TIC` | Administración de catálogos institucionales. |
| `/personas` | `ADMIN_TIC` | Personas, Unidades y aprovisionamiento de cuentas. |
| `/usuarios` | `ADMIN_TIC` | Roles y contraseñas de cuentas existentes. |

`authGuard` exige un access token. `adminTicGuard` comprueba el claim `ADMIN_TIC` y redirige al Dashboard cuando no existe.

La lectura del JWT en el frontend solo adapta navegación e interfaz. La seguridad real siempre corresponde al backend; ocultar botones o rutas nunca sustituye la autorización del servidor.

## Módulos funcionales

### Dashboard

- Consulta del Usuario autenticado.
- Cambio de contraseña propia con confirmación.
- Cierre de sesión posterior al cambio de contraseña.
- Prueba del endpoint público `ping`.

### Catálogos

Administra tipos de unidad, municipios, localidades, Unidades, tipologías y asociaciones entre Unidad y tipología.

### Personas

- Listado y búsqueda por nombre, correo, RFC o CURP.
- Filtros combinables por Unidad y estado.
- Autocompletado de filtros sin distinguir mayúsculas ni acentos.
- Creación y edición de Personas.
- Baja lógica.
- Aprovisionamiento de una cuenta desde una Persona activa.
- Restablecimiento administrativo de contraseña.

Una Persona representa el expediente humano u organizacional. Una cuenta de acceso se crea desde la Persona; el módulo no crea Usuarios independientes.

### Usuarios

- Listado con Persona, Unidad, roles y estado.
- Filtros por texto, Unidad, rol y estado.
- Asignación y revocación múltiple de roles.
- Restablecimiento de contraseña.
- Visualización protegida de `ADMIN_TIC`.

El módulo Usuarios administra acceso, no expedientes. Por eso no contiene un botón para crear cuentas. La cuenta técnica `demo@example.com` puede mostrarse sin Persona vinculada.

Al modificar roles, la interfaz envía únicamente las diferencias entre la selección anterior y la nueva. El backend revoca las sesiones persistentes del Usuario afectado.

## Autenticación y tokens

1. `POST /api/auth/login` devuelve access token y refresh token.
2. `LoginUseCase` guarda la sesión y `AuthStore` carga `/api/user/me`.
3. `authTokenInterceptor` agrega `Authorization: Bearer` a las peticiones protegidas.
4. Ante un `401`, `authErrorInterceptor` intenta renovar la sesión.
5. El refresh token es rotatorio: el backend revoca el anterior y entrega uno nuevo.
6. Si la renovación falla, se limpia la sesión y se redirige a `/login`.

Actualmente los tokens se guardan en `localStorage`. Para un entorno con mayores requisitos de seguridad, deben migrarse a cookies `httpOnly`, `Secure` y `SameSite` cuando el backend soporte ese flujo.

## Navegación responsive

- En escritorio, las opciones se muestran horizontalmente.
- Hasta 900 px, la navegación cambia a un menú hamburguesa de dos columnas.
- Hasta 520 px, el menú utiliza una sola columna.
- El menú se cierra automáticamente después de navegar.
- Catálogos, Personas y Usuarios solo aparecen con `ADMIN_TIC`.

## Diseño institucional

La paleta vive en `src/styles.scss` y utiliza variables `--imssb-*`.

- Verde principal: `#006341`.
- Superficie: `#FFFFFF`.
- Dorado institucional: `#CBA135`.
- Verde secundario: `#2E8B57`.

Los componentes nuevos deben reutilizar estas variables y Angular Material en lugar de declarar colores aislados.

## Manejo de formularios y peticiones

- Las contraseñas requieren entre 12 y 128 caracteres y confirmación visual.
- Los formularios marcan campos inválidos antes de enviar.
- Los estados `loading` y `saving` evitan operaciones duplicadas.
- Las búsquedas de texto usan una espera de 350 ms para reducir peticiones.
- `takeUntilDestroyed` libera suscripciones ligadas al ciclo de vida del componente.
- Los errores relevantes se muestran mediante `MatSnackBar`.

## Build

```bash
npm run build
```

El resultado se genera en:

```text
dist/imssb-bc-net-frontend
```

Angular puede advertir que el bundle inicial supera el presupuesto configurado. El build sigue siendo válido, pero conviene convertir los módulos administrativos a lazy loading conforme crezca la aplicación.

## Pruebas

Ejecución única:

```bash
npm test -- --watch=false
```

Las pruebas actuales cubren:

- Inicio de sesión exitoso y fallido.
- Persistencia de la sesión.
- Redirección del guard sin access token.
- Inclusión del Bearer token por el interceptor.

## Despliegue en Netlify

`netlify.toml` redirige las rutas del navegador hacia `index.html`, necesario para que el router de Angular resuelva URLs como `/personas` o `/usuarios` después de recargar.

La variable de entorno compilada debe apuntar al backend correcto y ese backend debe aceptar el origen del frontend mediante CORS.

## Convenciones para contribuir

- Mantén nombres de dominio consistentes: Persona no es sinónimo de Usuario.
- Utiliza `ADMIN_TIC` únicamente como rol protegido de administración.
- No confíes en controles visuales como medida de seguridad.
- Centraliza endpoints y lectura de claims.
- Prefiere comentarios que expliquen decisiones o riesgos, no comentarios que repitan el código.
- Conserva mensajes orientados al usuario en español.
- Ejecuta build y pruebas antes de integrar cambios.
