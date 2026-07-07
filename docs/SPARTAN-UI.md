# Interfaz con Spartan

La aplicación usa Spartan 1.x sobre Angular 22 y Tailwind CSS 4. Angular Material ya no forma parte de las dependencias.

## Convenciones

- Los componentes Helm generados viven en `src/app/shared/ui` y se importan mediante `@spartan-ng/helm/*`.
- Los componentes interactivos sin apariencia (`Brain`) se consumen desde `@spartan-ng/brain/*`.
- La paleta institucional y los tokens semánticos están en `src/styles.scss`. Esta migración mantiene exclusivamente el tema claro; el modo oscuro se abordará por separado.
- Para avisos se usa `toast` de `@spartan-ng/brain/sonner`, con un único `hlm-toaster` en la raíz.
- Los formularios usan `HlmInput`, `HlmLabel`, `HlmCheckbox` y controles nativos cuando ofrecen mejor accesibilidad (fecha y listas extensas).
- Los diálogos reciben datos con `injectBrnDialogContext()` y devuelven resultados mediante `BrnDialogRef.close()`.

## Agregar un componente

Ejecuta `npx ng g @spartan-ng/cli:ui nombre-del-componente`. Revisa el resultado antes de modificarlo: los archivos generados pertenecen al proyecto y pueden adaptarse a la identidad institucional.

## Verificación

Antes de integrar cambios ejecuta `npm run build` y confirma que no aparezcan imports de `@angular/material` ni elementos `mat-*` dentro de `src`.
