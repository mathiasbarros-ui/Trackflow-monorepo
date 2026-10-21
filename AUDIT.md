# AUDIT — Auditoría inicial

## Entorno de medición

- Fecha: 2026/10/16
- Navegador: Chrome DevTools Lighthouse 13.4.1
- Modo de ejecución (dev o producción): dev.
- URLs medidas: Las capturas muestran `/login`, una ruta truncada `/backoffice/inve...`, `/suppliers` y `/docs#/incidents...`. El host visible es un dominio de Codespaces, pero no se conserva completo.
- Dispositivos simulados: Mobile y Desktop. En las capturas de DevTools se ven ventanas Responsive de 768 x 860 y 1024 x 860 y el control indica “No throttling”; no se confirma la configuración de simulación usada por Lighthouse.
- Limitación: las capturas muestran una advertencia de Lighthouse sobre datos de IndexedDB y recomiendan repetir en incógnito. Las puntuaciones pueden estar afectadas por datos guardados.
- Trazabilidad: la plantilla propone Website `/`, Website `/vista-elegida` y Backoffice `/dashboard`, pero las capturas visibles corresponden a `/login`, inventario, proveedores y Swagger `/docs`. Las capturas internas de escritorio y móvil parecen corresponder a rutas distintas. La guía del ejercicio mencionada no está disponible dentro de los archivos del workspace, así que no se puede confirmar la correspondencia esperada.

## Puntuaciones iniciales

Resultados transcritos de las seis capturas de `audit/before/`. Las etiquetas describen lo que sí se alcanza a identificar en cada imagen; no deben tomarse como una comparación estricta de la misma ruta cuando las rutas difieren.

| Página / captura                                                      | Modo    | Performance | Accessibility | Best Practices | SEO |   FCP |   LCP |   CLS |      TBT |
| --------------------------------------------------------------------- | ------- | ----------: | ------------: | -------------: | --: | ----: | ----: | ----: | -------: |
| Backoffice `/login` (`fronted-desktop.png`)                           | Desktop |          98 |           100 |            100 |  60 | 0.4 s | 1.1 s |     0 |     0 ms |
| Backoffice `/login` (`frontend-mobile.png`)                           | Mobile  |          77 |           100 |            100 |  60 | 1.3 s | 5.7 s |     0 |   140 ms |
| Backoffice inventario (`frontend-desktop-internal.png`, URL truncada) | Desktop |          97 |           100 |            100 |  60 | 0.4 s | 1.2 s | 0.013 |     0 ms |
| Backoffice `/suppliers` (`frontend-mobile-internal.png`)              | Mobile  |          79 |            89 |            100 |  60 | 1.0 s | 5.6 s |     0 |    90 ms |
| API Swagger `/docs` (`backend-desktop.png`)                           | Desktop |          78 |            88 |             96 |  50 | 1.6 s | 1.8 s |     0 |   180 ms |
| API Swagger `/docs` (`backend-mobile.png`)                            | Mobile  |          47 |            88 |             96 |  50 | 4.5 s | 4.8 s |     0 | 1,160 ms |

### Lectura de resultados

- El rendimiento móvil es inferior en las capturas de `/login` (21 puntos menos) y Swagger `/docs` (31 puntos menos). No se debe interpretar la diferencia de 18 puntos de las capturas internas como efecto del dispositivo: escritorio muestra inventario y móvil proveedores.
- La mayor señal de bloqueo aparece en Swagger móvil: TBT de 1,160 ms, frente a 180 ms en escritorio. También presenta el menor rendimiento (47).
- El LCP móvil es alto en las capturas de frontend: 5.7 s en `/login` y 5.6 s en `/suppliers`. En ambas, FCP ocurre bastante antes (1.3 s y 1.0 s), por lo que conviene identificar el elemento LCP y separar espera de recurso, renderizado y variación del entorno antes de cambiar código.
- CLS es 0 en cinco capturas y 0.013 en inventario de escritorio; el desplazamiento visual no parece ser el problema principal de esta línea base.
- SEO queda en 50 para Swagger y 60 para las demás capturas. Las imágenes no muestran las auditorías concretas responsables, por lo que no es posible atribuir esos puntos a metadatos, indexación u otro factor específico.

## Problemas detectados

### Problema 1

- Frontend y URL: API de TrackFlow, Swagger UI en `/docs`.
- Indicador afectado: Performance móvil 47; TBT 1,160 ms, FCP 4.5 s y LCP 4.8 s. En escritorio: Performance 78 y TBT 180 ms.
- Evidencia de Lighthouse: las capturas `backend-mobile(metricals).png` y `backend-desktop(metricasl).png` muestran la diferencia de métricas; la captura de escritorio muestra la interfaz Swagger con múltiples grupos de endpoints. La advertencia de IndexedDB también aparece en el reporte.
- Archivo o componente involucrado: `services/trackflow-api/main.py` crea FastAPI con la documentación `/docs` habilitada por defecto y registra varios routers. No hay evidencia suficiente para señalar qué tarea concreta produjo el TBT.
- Causa raíz comprobada (o hipótesis a verificar): Hipótesis: el renderizado de Swagger UI y del esquema OpenAPI contribuye al bloqueo en móvil. No está comprobada; también pueden influir el entorno, la caché o la ejecución no productiva.
- Solución propuesta: repetir Lighthouse en incógnito y en el modo de ejecución acordado; revisar las tareas largas y auditorías de TBT de la página `/docs`. Solo si el perfil confirma que Swagger/esquema domina el bloqueo, valorar reducir la documentación expuesta o separar su carga. No deshabilitar `/docs` sin validar su necesidad operativa.
- Recomendación aplicada como prueba acotada: `services/trackflow-api/main.py` configura `swagger_ui_parameters={"docExpansion": "none"}` para iniciar Swagger con las operaciones plegadas. No se deshabilitan `/docs`, `/openapi.json` ni las operaciones.
- Verificación realizada: el código de la versión instalada de FastAPI acepta `swagger_ui_parameters` y lo incorpora a la configuración de Swagger UI; `python -m py_compile services/trackflow-api/main.py` finalizó correctamente.
- Verificación pendiente: no se pudo ejecutar `TestClient` ni Lighthouse en este entorno. No están confirmados el comportamiento visual de la página, la disponibilidad funcional de las rutas tras el cambio ni una reducción de TBT. La causa raíz sigue siendo una hipótesis hasta revisar una traza y comparar mediciones equivalentes.

### Problema 2

- Frontend y URL: Backoffice `/login` y `/suppliers` en móvil. La ruta de escritorio interna visible es inventario, no `/suppliers`.
- Indicador afectado: LCP móvil de 5.7 s (`/login`) y 5.6 s (`/suppliers`); Performance de 77 y 79. TBT (140 ms y 90 ms) y CLS (0) son comparativamente bajos.
- Evidencia de Lighthouse: `frontend-mobile(metricals).png` y `frontend-mobile-internal(metricals).png` muestran FCP de 1.3 s y 1.0 s, pero LCP cercano a 5.6 s. Los reportes completos no incluyen en las capturas el elemento LCP ni la auditoría diagnóstica correspondiente.
- Archivo o componente involucrado: `/login` se implementa en `uis/backoffice/src/app/login/page.tsx`; proveedores, en `uis/backoffice/src/app/suppliers/page.tsx`. La asignación de `/login` a backoffice se infiere del contenido de la captura y coincide con las rutas del repositorio. Ambas rutas son componentes cliente. La captura móvil de proveedores muestra datos cargados, pero no prueba que la solicitud de datos cause el LCP.
- Causa raíz comprobada (o hipótesis a verificar): Está comprobado en código que `AuthGuard` devolvía `null` mientras `loading` era verdadero incluso en rutas públicas, y que `/suppliers` iniciaba con `loading=false` y lista vacía antes de solicitar datos. La contribución exacta de esos comportamientos al LCP medido no está comprobada; el retardo de red y el elemento LCP requieren traza.
- Solución propuesta: se aplicaron dos correcciones locales: renderizar rutas públicas durante la restauración de sesión y comenzar `/suppliers` en estado de carga. Se mantienen la protección de rutas privadas y el flujo de datos.
- Verificación realizada: diagnóstico de VS Code sin errores en `AuthGuard.tsx` y `suppliers/page.tsx`; el chequeo de TypeScript del backoffice también pasó.
- Verificación pendiente: repetir Lighthouse en las mismas rutas/viewport y revisar elemento LCP, waterfall y renderizado. No se afirma una mejora de LCP ni de CLS; las capturas existentes son previas y tienen limitaciones de trazabilidad/caché indicadas arriba.

## Código duplicado

### Caso 1

- Archivos: `uis/backoffice/src/app/login/page.tsx`, `uis/backoffice/src/app/register/page.tsx`, `uis/backoffice/src/app/forgot-password/page.tsx`, `uis/backoffice/src/app/reset-password/page.tsx` y `uis/backoffice/src/app/account/change-password/page.tsx`.
- Código repetido: páginas de autenticación repiten la estructura `card authCard`, formularios `authForm`, estados/mensajes y enlaces de navegación; las clases visuales compartidas ya se encuentran en `uis/backoffice/src/app/globals.css`.
- Abstracción aplicada: `uis/backoffice/src/components/auth/AuthCard.tsx` centraliza el marco `main`/`section`, título y descripción opcional. Las cinco páginas reutilizan el componente; validaciones, formularios, mensajes y solicitudes siguen en cada página. Es una mejora de mantenimiento, no una optimización Lighthouse demostrada.
- Verificación realizada: diagnóstico de VS Code sin errores en el nuevo componente y las cinco páginas que lo usan; el chequeo de TypeScript del backoffice también pasó.

### Caso 2

- Archivos: `uis/website/src/app/globals.css` y `uis/backoffice/src/app/globals.css`.
- Código coincidente verificado: `box-sizing` y parte de la base de `body` coinciden; `.container`, `.navbar` y `.button` tienen diferencias de márgenes, espaciado o presentación entre apps.
- Recomendación: no extraer una hoja compartida por ahora. Mantener los estilos locales; reconsiderar tokens comunes solo si el producto define una identidad visual compartida y se confirma que los valores deben evolucionar juntos. No se aplicó una abstracción CSS.

## Siguiente medición

1. Repetir en incógnito y anotar fecha, versión de Chrome/Lighthouse, modo dev/producción, URL completa, viewport, CPU/red y cualquier throttling.
2. Medir exactamente las rutas indicadas en la guía; usar la misma ruta en Mobile y Desktop y guardar el reporte completo, incluido el elemento LCP y las oportunidades de TBT/SEO.
3. Tomar varias mediciones bajo las mismas condiciones y comparar la mediana. Hasta entonces, estas capturas sirven como indicio inicial, no como línea base reproducible.
