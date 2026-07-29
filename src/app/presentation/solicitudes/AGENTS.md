# Reglas del módulo Solicitudes

Este módulo conserva comportamiento procedente de una aplicación legacy y tiene
compatibilidad funcional prioritaria.

## Comportamiento que debe preservarse

- Mantener la ruta standalone `/solicitudv1` y la ruta principal actual.
- Mantener la persistencia administrada por `StorageSolicitudService`.
- No renombrar ni eliminar claves de localStorage sin una migración explícita.
- Mantener la restauración de artículos y datos CLUES después de recargar.
- Mantener la normalización actual de claves de artículos.
- Mantener los flujos de inventario, CPM, KIT, homologación y feature flags.
- Mantener formatos, columnas, plantillas y nombres esperados en importaciones y exportaciones.
- No eliminar comportamiento aparentemente extraño sin localizar primero su consumidor.

## Estrategia de refactorización

- No reescribir `SolicitudesComponent` completo.
- Extraer una sola responsabilidad por tarea.
- Favorecer facades y servicios pequeños sobre lógica adicional en el componente.
- Conservar temporalmente las APIs públicas usadas por el template y componentes hijos.
- Separar primero, simplificar después.
- Cada extracción debe mantener comportamiento y agregar o ajustar pruebas cuando sea viable.

## Estado y asincronía

- No duplicar fuentes de verdad entre propiedades, signals, observables y localStorage.
- Identificar cuál es la fuente autoritativa antes de cambiar estado.
- Evitar suscripciones anidadas.
- Limpiar todas las suscripciones ligadas al ciclo de vida.
- No llamar `detectChanges()` como parche automático sin explicar por qué es necesario.

## Antes de terminar una tarea

- Probar restauración desde localStorage.
- Probar agregar, editar y eliminar artículos.
- Probar el flujo específico de CPM, KIT u homologación afectado.
- Probar build de producción.
- Reportar cualquier escenario que requiera verificación manual.
