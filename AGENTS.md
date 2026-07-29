# IMSS Bienestar BC Frontend

## Stack obligatorio

- Angular 22 con componentes standalone.
- TypeScript 6.
- ChangeDetectionStrategy.OnPush cuando corresponda.
- Signals para estado local y RxJS para flujos asincrónicos.
- SCSS y Tailwind CSS 4.
- Spartan NG y los componentes visuales ya existentes en el repositorio.
- ng-icons con iconos Lucide.
- ng-fast-toast para notificaciones.
- Vitest mediante Angular CLI.
- npm como administrador de paquetes.

Angular Material no forma parte del stack actual.

- No importar paquetes `@angular/material`.
- No crear componentes `Mat*`.
- No sugerir migrar componentes actuales a Angular Material.
- No sustituir Spartan NG o los componentes existentes por otra biblioteca visual
  sin una tarea explícita.

## Arquitectura

Mantener la dirección general de dependencias:

presentation -> application/domain <- infrastructure

- `domain` contiene modelos y contratos sin dependencias visuales.
- `application` contiene casos de uso y coordinación reutilizable.
- `infrastructure` contiene HTTP, DTOs, mappers y almacenamiento.
- `presentation` contiene páginas, componentes, formularios y modales.
- `core` contiene configuración, guards, interceptores y layout.

Los componentes pueden consumir infraestructura directamente cuando la operación es
simple y local. Extraer un caso de uso o facade cuando exista lógica reutilizable,
varios pasos asincrónicos o reglas del negocio.

## Convenciones

- Mantener componentes standalone.
- Preferir `inject()` sobre inyección por constructor cuando sea consistente con el archivo.
- Limpiar suscripciones con `takeUntilDestroyed`, `DestroyRef` o el patrón existente.
- Centralizar endpoints en la configuración existente.
- Consumir la URL base mediante `APP_CONFIG`.
- No declarar URLs de API directamente en componentes o servicios.
- Reutilizar las variables CSS institucionales `--imssb-*`.
- Mantener mensajes y validaciones visibles en español.
- No usar controles visuales como sustituto de autorización del backend.
- Evitar `any` nuevo salvo integración externa justificada.

## Cambios visuales

- Conservar accesibilidad por teclado, labels, estados de foco y diseño responsive.
- Antes de crear un componente nuevo, buscar un primitive o patrón equivalente.
- No cambiar simultáneamente comportamiento y diseño cuando puedan separarse.
- No convertir una pantalla completa a una arquitectura nueva en una sola tarea.

## Comandos de validación

Instalación reproducible:

    npm ci

Build:

    npm run build

Pruebas:

    npm test -- --watch=false

Ejecutar build y pruebas después de cambios funcionales.

## Code Review Rules

### Biblioteca visual

- Marcar como regresión cualquier importación de Angular Material.
  Ruta segura: utilizar Spartan NG, Tailwind o componentes ya existentes.

### Configuración de API

- Marcar URLs base de API escritas directamente en componentes o servicios.
  Ruta segura: usar `APP_CONFIG` y la configuración centralizada.

### Compatibilidad

- Marcar cambios silenciosos en rutas, almacenamiento local, importación o exportación.
  Ruta segura: mantener compatibilidad o proporcionar una migración explícita y probada.

### Seguridad

- Marcar cualquier lógica que trate guards, claims del frontend u ocultamiento de botones
  como autorización suficiente.
  Ruta segura: exigir autorización real en el backend.
