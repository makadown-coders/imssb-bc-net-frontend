# Módulo de Solicitudes

La ruta `/solicitudes` es una migración funcional y deliberadamente desacoplada de `solicitudes-app`. Usa componentes standalone, Angular Material y las variables institucionales definidas en `styles.scss`; no depende de Tailwind ni implementa modo oscuro.

## Organización

- `domain/solicitudes/models`: modelos que consume la interfaz.
- `infrastructure/solicitudes/api`: DTOs del backend y su adaptación al dominio.
- `infrastructure/solicitudes/storage`: borrador local versionado.
- `presentation/solicitudes`: formulario, captura y tabla Material.

El componente nunca consume respuestas HTTP crudas. `SolicitudesApiService` mantiene la compatibilidad con los nombres heredados (`snake_case`) y entrega objetos de dominio consistentes.

## Contratos requeridos

- `GET /api/unidades`: catálogo de unidades médicas.
- `GET /api/articulos?q=...`: búsqueda paginada/limitada de artículos.
- `POST /api/solicitudes/bitacora`: registro de la captura.

Estos endpoints deben aceptar cualquiera de los roles `IB_ONCO`, `SOLICITUDES_ABASTO`, `ADMIN_TIC`, `COORDINACION` o `ABASTO`, igual que el guard del cliente. La autorización real siempre corresponde al backend.

## Borradores

El navegador guarda la captura bajo `imssb.solicitudes.borrador.v1`. El sufijo de versión permite introducir migraciones futuras sin intentar interpretar estructuras antiguas. Ante un error de red el borrador se conserva.

## Pendiente deliberado

No se migraron todavía:

1. Importación y exportación Excel basada en plantillas.
2. Enriquecimiento con CPM, existencias y reglas de KIT.
3. Sugerencias/reemplazos de claves homólogas.
4. Encuesta piloto.

El origen mezcla estos flujos dentro de un componente de más de 1,500 líneas y depende de endpoints aún en migración. Deben incorporarse como casos de uso y diálogos independientes, no copiando el componente monolítico.
