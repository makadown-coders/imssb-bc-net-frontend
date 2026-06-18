# IMSSB-BC-NET Frontend

Frontend inicial en Angular 22 para consumir la Web API de autenticacion `IMSSB-BC-NET`.

## Requisitos

- Node.js `24.17.0` (`.nvmrc`)
- npm `11.12.1`
- Backend disponible en `http://localhost:8080`

## Instalacion

```bash
npm install
```

## Ejecucion

```bash
npm start
```

La aplicacion levanta en:

```text
http://localhost:4200
```

## Configuracion de API

El `apiBaseUrl` esta centralizado en:

```text
src/environments/environment.ts
```

Valor por defecto:

```ts
apiBaseUrl: 'http://localhost:8080'
```

Los servicios no hardcodean la URL del backend; consumen la configuracion mediante `APP_CONFIG`.

## Paleta institucional

La UI usa variables CSS globales en `src/styles.scss` basadas en el logo de IMSS Bienestar:

- Primario: `#006341`
- Superficie base: `#FFFFFF`
- Acento institucional: `#CBA135`
- Terciario/verde apoyo: `#2E8B57`

Los tonos secundarios y terciarios se derivan de esa base para fondos suaves, bordes, texto y estados interactivos. Los componentes nuevos deben consumir las variables `--imssb-*` en lugar de declarar colores sueltos.

## Login de prueba

Con el backend corriendo, usa:

```text
email: admin@imssb-bc.test
password: Password123!
```

Flujo esperado:

1. Entrar en `/login`.
2. Autenticarse contra `POST /api/auth/login`.
3. Redireccionar a `/dashboard`.
4. Cargar usuario desde `GET /api/user/me`.
5. Probar `GET /api/ping` con el boton `Probar ping`.
6. Cerrar sesion con `POST /api/auth/logout`.

## CORS del backend

Para desarrollo local, el backend probablemente debe permitir:

```text
CORS_ORIGINS=http://localhost:4200
```

Si el backend corre en Docker exponiendo `localhost:8080`, este frontend ya consume esa URL por defecto.

## Pruebas

```bash
npm test -- --watch=false
```

Pruebas iniciales incluidas:

- `LoginUseCase_Should_SaveSession_When_CredentialsAreValid`
- `LoginUseCase_Should_PropagateError_When_CredentialsAreInvalid`
- `AuthGuard_Should_RedirectToLogin_When_NoAccessToken`
- `TokenStorage_Should_SaveAndRestoreSession`
- `AuthTokenInterceptor_Should_AddBearerToken_When_AccessTokenExists`

## Build

```bash
npm run build
```

## Arquitectura

La aplicacion separa responsabilidades en capas:

- `domain`: modelos puros y contrato `AuthRepository`.
- `application`: casos de uso y `AuthStore` con signals.
- `infrastructure`: `HttpClient`, DTOs, mappers y `localStorage`.
- `presentation`: componentes standalone de login y dashboard.

Los signals se usan para estado local de autenticacion porque son simples, reactivos y suficientes para esta base sin introducir NgRx.

El refresh token automatico vive en `auth-error.interceptor.ts`: cuando una peticion protegida responde `401`, intenta `POST /api/auth/refresh`, guarda el nuevo par de tokens y reintenta la peticion original. Si el refresh falla, limpia la sesion y redirige a `/login`.

Para produccion, el almacenamiento de tokens deberia moverse de `localStorage` a cookies `httpOnly` + `SameSite` cuando el backend este preparado.

Para extender la base, agrega nuevos modulos siguiendo el mismo patron: modelos y puertos en `domain`, casos de uso en `application`, implementaciones HTTP en `infrastructure` y pantallas en `presentation`.
