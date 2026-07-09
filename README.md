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
├── Diccionarios/
│   ├── Diccionario_Datos_Dataset_Instituciones_Unificadas.xlsx
│   ├── Diccionario_Datos_migraciones_posibles.xlsx
│   ├── Diccionario_Datos_conexiones_nivel3_torres_estatales.xlsx
│   ├── Diccionario_Datos_torres_propuestas_actualizado.xlsx
│   └── Diccionario_Datos_INFORMACION_TORRES.xlsx
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
- `Diccionarios/`: diccionarios de datos en formato Excel para cada dataset utilizado por el dashboard.
- `generacion_entregables_telecomunicaciones.ipynb`: libreta reproducible usada para generar los datasets finales desde los archivos fuente y el Modelo Digital de Elevación.

## Flujo de datos

El flujo general del proyecto es:

1. Consolidar y normalizar el padrón de instituciones públicas.
2. Clasificar cada institución mediante el Índice de Prioridad de Conectividad (IPC).
3. Cruzar instituciones contra torres estatales mediante coordenadas geográficas.
4. Calcular distancias hacia la infraestructura estatal más cercana.
5. Validar preliminarmente línea de vista con apoyo de un Modelo Digital de Elevación.
6. Generar los datasets finales usados por el dashboard.
7. Visualizar KPIs, mapas, tablas y gráficas en la aplicación estática.

Los datasets publicados en `data/` son los insumos directos del dashboard. La libreta `generacion_entregables_telecomunicaciones.ipynb` documenta el proceso de generación y permite reproducir los archivos finales a partir de las fuentes de trabajo.

## Diccionarios de datos

La carpeta `Diccionarios/` contiene un diccionario Excel por cada dataset utilizado:

- `Diccionario_Datos_Dataset_Instituciones_Unificadas.xlsx`
- `Diccionario_Datos_migraciones_posibles.xlsx`
- `Diccionario_Datos_conexiones_nivel3_torres_estatales.xlsx`
- `Diccionario_Datos_torres_propuestas_actualizado.xlsx`
- `Diccionario_Datos_INFORMACION_TORRES.xlsx`

Cada diccionario describe nombre de variable, tipo de dato, formato, unidad de medida, descripción, obligatoriedad, catálogo de referencia, valores nulos y ejemplos. Esto permite interpretar los archivos sin depender del código fuente.

## Consideraciones

- Las instituciones reportadas como candidatas representan oportunidades técnicas preliminares, no migraciones automáticas.
- El ahorro anual se presenta como una estimación potencial basada en un costo promedio mensual de $1,300 MXN por institución.
- La línea de vista fue evaluada de forma preliminar con un Modelo Digital de Elevación; cualquier implementación requiere validación técnica en campo.

## Tecnologías

- **PapaParse:** lectura local de archivos CSV.
- **Chart.js:** gráficas y visualizaciones de métricas.
- **Leaflet:** mapas interactivos, capas y marcadores geográficos.
- **HTML, CSS y JavaScript:** 

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
