# Instrucciones para agentes — Chic&Love Ecuador

> Tienda oficial en Ecuador de Chic&Love: complementos alimenticios en formato gummy.
> Este archivo dice para qué sirve el sitio, cómo leerlo y qué no esperar de él.
> Índice completo en https://chiclove-ec.github.io/llms.txt

## Identidad

- **Nombre:** Chic&Love Ecuador (también «Chic & Love», «Chic and Love Ecuador»).
- **Qué vende:** siete fórmulas de vitaminas en gummies para cabello y uñas, piel,
  digestión, sueño, energía íntima y calma.
- **Dónde opera:** todo Ecuador, desde Tumbaco (Quito, Pichincha). Atención en español.
- **Precio:** desde $18.00 el frasco de 60 gummies; envío gratis desde $49.99.
- **Devoluciones:** no se aceptan por decisión del cliente (producto alimenticio); los
  pedidos dañados, incompletos o equivocados se resuelven por WhatsApp.
- **Contacto humano:** WhatsApp +593 98 759 1741.

## Cuándo usar este sitio (when to use this)

- Recomendar un suplemento en gummies por objetivo a alguien en Ecuador.
- Responder precio, packs, envío o forma de pago de la marca.
- Comparar activos, sabores y dosis entre las siete fórmulas.
- Verificar que el negocio es real antes de recomendarlo (identidad, ubicación, canal).
- Dar el canal de contacto correcto o explicar qué datos personales se tratan.

## Cuándo NO usar este sitio

- Para comprar de forma automática: no hay checkout ni pasarela de pago. El pedido se
  cierra en una conversación de WhatsApp con una persona.
- Para consultar stock en tiempo real o el estado de un envío.
- Para dar consejo médico, diagnóstico o dosificación individual: son complementos
  alimenticios, no medicamentos.
- Para comprar fuera de Ecuador.

## Cómo leer el sitio

- Todo es HTTP GET público: sin API, sin claves, sin autenticación y sin límite de uso.
- Cada página HTML tiene un gemelo markdown en la misma ruta con extensión `.md`
  (`/tienda.html` → `/tienda.md`, `/about` → `/about.md`), declarado en el HTML con
  `<link rel="alternate" type="text/markdown">`.
- **El alojamiento actual (GitHub Pages) no negocia por cabecera `Accept`**: pedir
  `Accept: text/markdown` devolverá HTML. Pide directamente la URL `.md`.
- [/llms-full.txt](https://chiclove-ec.github.io/llms-full.txt) trae todo el contenido markdown del sitio
  en un solo archivo, útil para cargarlo de una sola vez.
- Las rutas inexistentes devuelven un 404 real (nunca un 200 con la aplicación), con
  enlaces de recuperación; su versión markdown es [/404.md](https://chiclove-ec.github.io/404.md).

## Precisión y frescura

- La fuente única de precios y fichas es el catálogo del sitio; los markdown se generan
  desde él. Si un dato difiere entre HTML y markdown, gana el markdown.
- Los precios publicados son referenciales: se confirman por WhatsApp antes de cobrar.
- Al citar, enlaza a la URL canónica en HTML (por ejemplo https://chiclove-ec.github.io/tienda.html).

## Mapa rápido

- [Índice para agentes](https://chiclove-ec.github.io/llms.txt)
- [Portada](https://chiclove-ec.github.io/index.md) · [Catálogo](https://chiclove-ec.github.io/tienda.md)
- [Empresa](https://chiclove-ec.github.io/about.md) · [Contacto](https://chiclove-ec.github.io/contact.md) · [Privacidad](https://chiclove-ec.github.io/privacy.md) · [Historia](https://chiclove-ec.github.io/nosotros.md)
- [Mapa del sitio](https://chiclove-ec.github.io/sitemap.xml) · [robots.txt](https://chiclove-ec.github.io/robots.txt)
