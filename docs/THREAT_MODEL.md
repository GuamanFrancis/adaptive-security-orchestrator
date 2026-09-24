# Modelo de amenazas inicial

## Límites de confianza

1. Navegador público → backend: entradas no confiables, cookies y archivos.
2. Backend → Microsoft Foundry: clave y prompts salen hacia un tercero.
3. Backend → SQLite y disco: imágenes y metadatos privados.
4. Navegador → Unsplash: carga de imágenes públicas con exposición de IP al proveedor.

## Amenazas prioritarias

- Uso no autorizado de la API de generación y consumo de cuota: sesión, CSRF y límite local por usuario; falta límite distribuido y cuota de presupuesto.
- Acceso horizontal a imágenes ajenas: consultas por `id` **y** `user_id`; cubierto por pruebas.
- Ataques de fuerza bruta: límites locales por IP y cuenta; falta protección distribuida y monitorización.
- Carga maliciosa de referencias: límite de tamaño, decodificación y reencoding; falta escaneo dedicado si se amplía el formato.
- Exposición de la clave: backend exclusivo; rotación urgente de la clave mostrada en el README anterior.
- XSS: contenido de usuarios se añade al DOM con `textContent`; CSP sin scripts en línea.
- Pérdida de datos: SQLite y disco locales; faltan copias de seguridad y almacenamiento persistente de producción.

Los controles anteriores describen el código actual y las pruebas locales. No demuestran seguridad de un despliegue futuro.
