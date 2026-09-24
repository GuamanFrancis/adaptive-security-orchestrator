# Jev en el estudio FLUX

Jev es el modelo System One de TypeSafe AI. Recibe `state` y preguntas tipadas; no es un LLM conversacional ni devuelve directamente una orden de bloqueo. La integración utiliza el endpoint `POST https://api.typesafe.ai/v1/systemone` con `model: "jev-latest"` y una pregunta `score`. Véanse la [introducción](https://docs.typesafe.ai/introduction/coding-agents), el [inicio rápido](https://docs.typesafe.ai/introduction/quickstart) y la [referencia HTTP](https://docs.typesafe.ai/api).

## Integración implementada

- Al configurar `TYPESAFE_API_KEY` en `backend/.env`, el backend observa eventos de autenticación fallida, acceso denegado, límites y generación fallida.
- Tras tres fallos por IP en diez minutos, con un máximo de una evaluación por minuto, se envía a Jev un estado con tipo de evento, ruta, método, estado HTTP, etiquetas y conteo. No se envían IP, claves, contraseñas, cookies, prompts ni imágenes.
- Jev responde un `score` de 0 a 3 y `confidence` de 0 a 1. Una puntuación de al menos 2 y confianza de al menos 0.8 produce recomendación `review`; los demás casos quedan en `observe`.
- Las decisiones validadas se guardan en `backend/data/jev-decisions.jsonl`, junto con `request_id` para correlacionarlas con `security-events.jsonl`. Los archivos se excluyen de Git.
- La llamada a Jev es asíncrona y tiene un plazo de cinco segundos. Un fallo de red o una respuesta inválida no bloquea la operación del usuario.
- Los fallos se registran con una categoría (`timeout`, `rate_limit`, `authentication`, `upstream`, `invalid_response` o `network`) y `request_id`, sin incluir respuestas completas ni credenciales. El exportador de Splunk también puede enviar esos registros.

## Límite operativo

Esta es una integración en **modo observación**. No se bloquean cuentas ni IP automáticamente, y no hay un SIEM ni WAF conectados. Antes de pasar a acciones activas se necesita evaluar falsos positivos, definir quién revisa las alertas, añadir retención y almacenamiento central, y diseñar un mecanismo reversible de aplicación de políticas. El umbral de 0.8 es una política inicial local que requiere calibración con datos reales.
