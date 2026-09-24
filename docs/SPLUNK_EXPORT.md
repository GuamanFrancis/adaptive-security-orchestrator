# Exportación opcional de laboratorio a Splunk HEC

El backend guarda los eventos de la API y las decisiones de Jev en archivos JSONL locales. **No se requiere Splunk para este proyecto.** El exportador queda como demostración funcional de cómo alimentar un SIEM: `npm run siem:export` envía hasta 100 eventos por archivo y ejecución a Splunk HTTP Event Collector. Utiliza HTTPS para destinos remotos; acepta HTTP solo si el destino es loopback local. Usa el encabezado `Authorization: Splunk <token>` y el formato `event` documentado por [Splunk](https://help.splunk.com/en/splunk-cloud-platform/get-data-in/get-started-with-getting-data-in/10.2.2510/get-data-with-http-event-collector/http-event-collector-examples).

## Ejercicio opcional si se dispone de Splunk

1. Iniciar `Splunkd` solo mientras se hace la demostración. Splunk Web se abre en `http://localhost:8000`; ese puerto es para la interfaz, no para HEC.
2. En Splunk Web ir a **Settings → Data Inputs → HTTP Event Collector → Global Settings**. Activar HEC y comprobar su puerto y si SSL está activado. El puerto habitual es 8088. Después crear un token HEC con acceso solo al índice elegido. [Instrucciones oficiales](https://help.splunk.com/en/data-management/collect-http-event-data/use-hec-in-splunk-enterprise/set-up-and-use-http-event-collector-in-splunk-web).
3. Configurar en `backend/.env` `SPLUNK_HEC_URL=https://127.0.0.1:8088/services/collector/event` y `SPLUNK_HEC_TOKEN=<secreto>`. Si HEC local tiene SSL desactivado, usar `http://127.0.0.1:8088/services/collector/event`. No se acepta HTTP hacia otros equipos. Si SSL usa un certificado propio, configurar una CA de confianza para Node; no desactivar la verificación TLS.
4. Ejecutar desde `backend`: `npm run siem:export`. La aplicación local no ejecuta el exportador por sí sola.
5. En la búsqueda de Splunk usar `sourcetype=flux:security` o `sourcetype=flux:jev` y correlacionar con `request_id`.

El exportador guarda un cursor por archivo en `backend/data` solo después de recibir HTTP exitoso y `code: 0`. Si Splunk rechaza un evento, la siguiente ejecución lo reintenta. Esta confirmación significa recepción por HEC, **no** indexación confirmada; la entrega es al menos una vez y puede haber duplicados ante fallos entre recepción y escritura del cursor. El cursor cuenta líneas, por lo que no se debe truncar ni rotar manualmente un archivo JSONL activo. Para operación de alto volumen se requiere un agente de logs con spool, rotación coordinada, monitoreo y confirmación de indexación.

No hay una instancia Splunk ni credenciales configuradas en este repositorio; las pruebas usan un HEC simulado. La IP sí consta en los eventos de seguridad locales y se enviaría a Splunk al activar este ejercicio. El uso real requiere definir permisos y retención de esos datos.
