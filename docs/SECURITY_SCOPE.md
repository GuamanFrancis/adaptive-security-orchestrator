# Alcance de seguridad

Solo se permiten pruebas activas en localhost y en un staging propio autorizado. No se probará el despliegue de NeoHW, Microsoft Foundry, Unsplash ni terceros.

Activos bajo control de este proyecto: código, sesiones, base de datos local, endpoints propios y archivos generados. Servicios externos: Microsoft Foundry para generación; Unsplash para imágenes públicas de inspiración.

La clave de Foundry del prototipo anterior aparece en su README. Debe revocarse y reemplazarse antes de configurar este proyecto. El repositorio nuevo ignora `.env` y `data/`. No deben añadirse a Git claves, prompts privados, referencias ni imágenes de usuarios.
