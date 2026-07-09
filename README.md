# Dashboard de Infraestructura Pública de Telecomunicaciones del Estado de Sonora

Dashboard interactivo para analizar oportunidades de optimización de la infraestructura pública de telecomunicaciones en Sonora. El proyecto integra instituciones públicas, torres estatales y resultados de validación técnica para apoyar decisiones de migración, conexión inicial y despliegue de nueva infraestructura.

## Objetivo

Identificar cómo aprovechar la infraestructura estatal existente para mejorar la conectividad de escuelas, centros de salud, oficinas de gobierno e instituciones de seguridad, reduciendo la dependencia de proveedores privados y priorizando zonas con mayor rezago.

El análisis se organiza en tres estrategias:

1. **Migración a infraestructura estatal:** instituciones conectadas mediante proveedor privado que se encuentran cerca de una torre estatal.
2. **Conexión inicial:** instituciones sin conectividad, pero con una torre estatal cercana.
3. **Nueva infraestructura:** zonas críticas sin conectividad y sin torre estatal cercana donde una nueva torre puede beneficiar a varias instituciones.

## Resultados principales

- **3,547** instituciones públicas integradas y clasificadas.
- **1,713** instituciones candidatas técnicas a migración.
- **1,642** candidatas a migración con línea de vista directa.
- **$26,722,800 MXN** de ahorro anual potencial si se migran las candidatas técnicas.
- **755** instituciones candidatas a conexión inicial mediante torres estatales existentes.
- **714** candidatas a conexión inicial con línea de vista directa.
- **208** instituciones en prioridad crítica, sin conectividad y sin torre estatal cercana.
- **9** puntos propuestos para nueva infraestructura.
- **3** torres propuestas con línea de vista directa hacia infraestructura estatal.
- **81** instituciones beneficiadas por los puntos propuestos de nueva infraestructura.

## Índice de Prioridad de Conectividad

El proyecto clasifica cada institución mediante el Índice de Prioridad de Conectividad (IPC):

| Nivel | Prioridad | Criterio | Instituciones |
|---|---|---|---:|
| Nivel 1 | Baja | Conectadas mediante proveedor público o estatal | 735 |
| Nivel 2 | Media | Conectadas mediante proveedor privado | 1,849 |
| Nivel 3 | Alta | Sin conectividad y con torre estatal cercana | 755 |
| Nivel 4 | Crítica | Sin conectividad y sin torre estatal cercana | 208 |
| **Total** |  |  | **3,547** |

## Estructura del proyecto

```text
.
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── app.js
├── data/
│   ├── Dataset_Instituciones_Unificadas.csv
│   ├── migraciones_posibles.csv
│   ├── conexiones_nivel3_torres_estatales.csv
│   ├── torres_propuestas_actualizado.csv
│   └── INFORMACION TORRES.txt
└── generacion_entregables_telecomunicaciones.ipynb
```

## Archivos principales

- `index.html`: estructura del dashboard y las secciones de navegación.
- `css/styles.css`: sistema visual, layout, tarjetas KPI, tablas, mapas y diseño responsivo.
- `js/app.js`: carga de datos, filtros, KPIs, gráficas, mapas interactivos y tablas paginadas.
- `data/Dataset_Instituciones_Unificadas.csv`: padrón consolidado de instituciones públicas.
- `data/migraciones_posibles.csv`: instituciones candidatas a migración y validación de línea de vista.
- `data/conexiones_nivel3_torres_estatales.csv`: instituciones sin conectividad candidatas a conexión inicial.
- `data/torres_propuestas_actualizado.csv`: puntos propuestos para nueva infraestructura.
- `data/INFORMACION TORRES.txt`: torres estatales usadas para el mapa y cruces geográficos.
- `generacion_entregables_telecomunicaciones.ipynb`: libreta reproducible usada para generar los datasets finales desde los archivos fuente y el Modelo Digital de Elevación.

## Consideraciones

- Las instituciones reportadas como candidatas representan oportunidades técnicas preliminares, no migraciones automáticas.
- El ahorro anual se presenta como una estimación potencial basada en un costo promedio mensual de $1,300 MXN por institución.
- La línea de vista fue evaluada de forma preliminar con un Modelo Digital de Elevación; cualquier implementación requiere validación técnica en campo.

## Tecnologías

- **PapaParse:** lectura local de archivos CSV.
- **Chart.js:** gráficas y visualizaciones de métricas.
- **Leaflet:** mapas interactivos, capas y marcadores geográficos.
- **HTML, CSS y JavaScript:** aplicación estática sin backend.
- **Google Fonts:** tipografías Inter y Outfit.

## Cómo ejecutar el dashboard

Por la carga local de CSV y datos geográficos, se recomienda abrir el proyecto mediante un servidor local:

```powershell
python -m http.server 8000
```

Después, abrir en el navegador:

```text
http://localhost:8000
```

## Equipo de análisis y desarrollo

- Daniel Eduardo Alvarez Terrazas
- Jesus David Ayala Morales
- Christian Alexis Flores Alvarez
- Ana Sofía Matti Ríos

