# Contrato propuesto para Jev

Jev será la capa de decisión sobre eventos de seguridad del estudio FLUX. Este documento define una interfaz de integración; **no implementa ni conecta Jev**. Falta la especificación del Jev existente del usuario para mapear su API y modelo de confianza.

## Entrada mínima

Jev consumiría eventos normalizados del backend, preferentemente desde el SIEM o un bus fiable. Esquema actual por línea de `backend/data/security-events.jsonl`:

```json
{"timestamp":"2026-09-24T00:00:00.000Z","source":"flux-backend","event_type":"auth.login_failed","request_id":"uuid","src_ip":"127.0.0.1","user":null,"path":"/api/login","method":"POST","status":401,"user_agent":"browser","security_tags":["authentication"]}
```

No enviar cookies, claves, contraseñas, prompts ni imágenes a Jev. Un correlador posterior puede añadir identidad seudonimizada, reputación de IP, reglas WAF y datos IDS con procedencia, retención y permisos definidos.

## Salida propuesta

```json
{"decision_id":"uuid","request_id":"uuid","verdict":"observe","risk_score":35,"confidence":0.7,"reason_codes":["repeated_auth_failure"],"evidence_event_ids":["uuid"],"recommended_action":"alert","expires_at":"2026-09-24T01:00:00.000Z","policy_version":"jev-v1"}
```

Valores de `verdict`: `allow`, `observe`, `challenge`, `block`. Jev debe distinguir una recomendación de una acción ejecutada. La API debe validar tipos, rangos, firma/autenticación del emisor, versión de política, caducidad e idempotencia. Decisiones no válidas o servicio caído quedan en `observe` y generan alerta, salvo que una política explícita de alto riesgo establezca otra cosa.

## Puesta en marcha

1. Correlacionar `request_id` entre API, SIEM y Jev; fijar una política de retención y anonimización.
2. Ejecutar Jev en modo observación y medir cobertura, latencia, precisión y falsos positivos.
3. Probar reglas concretas, por ejemplo intentos de login distribuidos, abuso del presupuesto Foundry y acceso a imágenes ajenas. Revisar cada alerta con evidencia y contexto.
4. Habilitar `challenge` o `block` solo con aprobación operativa, expiración automática, registro de la acción y botón de reversión.

La arquitectura de referencia VPN/WAF/IDS aplica solo después de desplegar y conectar esos servicios. No deben aparecer como fuentes de evidencia en Jev antes de existir.
