# Política de seguridad

## Alcance

Este repositorio contiene el sitio web estático de **Chic&Love Ecuador**
(<https://chiclove-ec.github.io>). No hay backend, base de datos ni cuentas de
usuario: el sitio se sirve como archivos estáticos y el pedido se entrega por
WhatsApp cuando la persona pulsa el botón de checkout.

## Versiones con soporte

Solo se da soporte a lo que está publicado desde `main`. No hay versiones
anteriores mantenidas.

## Cómo reportar una vulnerabilidad

El canal estándar y legible por máquina está en
[`/.well-known/security.txt`](.well-known/security.txt):

- WhatsApp: <https://wa.me/593987591741>
- Instagram: <https://www.instagram.com/chicloveec>

Alternativamente, abre un
[aviso de seguridad privado](https://github.com/chiclove-ec/chiclove-ec.github.io/security/advisories/new)
en GitHub. **No abras un issue público** para un fallo explotable.

Incluye, si puedes: la URL afectada, los pasos para reproducirlo y el impacto.
Respondemos en español o en inglés. No ofrecemos recompensas económicas.

## Fuera de alcance

- Ausencia de cabeceras HTTP que GitHub Pages no permite definir
  (`Content-Security-Policy` por cabecera, `Permissions-Policy`, COOP/COEP).
  Son una limitación conocida del hosting: el sitio las declara por `<meta>`
  donde el navegador las acepta y añade un guard anti-frame. Está documentado en
  el README, sección *Deploy*.
- Reportes generados por escáneres automáticos sin un impacto demostrado.
- Ingeniería social, phishing o denegación de servicio.

## Cómo se protege el sitio

Resumen en la sección *Seguridad* del [README](README.md): CSP cerrada sin
scripts ni estilos inline, build por lista blanca para que la documentación y
los artefactos locales nunca lleguen al artefacto público, validación del `id`
de producto contra el catálogo, saneado del carrito de `localStorage` y enlaces
externos con `rel="noopener noreferrer"`.
