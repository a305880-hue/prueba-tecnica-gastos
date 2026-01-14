# Notas del Desarrollador

## 🧠 Decisiones Técnicas
* **Arquitectura Modular:** Estructura basada en módulos de NestJS para escalabilidad.
* **Validaciones:** Uso de DTOs y `class-validator` para asegurar la integridad de datos.
* **Despliegue:** Separación de servicios (Render para Backend, Vercel para Frontend).

## 🚧 Desafíos
* La integración de variables de entorno en el cliente (Nuxt) requirió configuración de `runtimeConfig` para soportar el despliegue en la nube.