# Instrucciones para agentes — Chic&Love Ecuador

> Tienda oficial en Ecuador de Chic&Love: complementos alimenticios en formato gummy.
> Este archivo dice para qué sirve el sitio, cómo leerlo y qué no esperar de él.
> Índice completo en https://chiclove-ec.com/llms.txt

## Identidad

- **Nombre:** Chic&Love Ecuador (también «Chic & Love», «Chic and Love Ecuador»).
- **Qué vende:** siete fórmulas de vitaminas en gummies para cabello y uñas, piel,
  digestión, sueño, energía íntima y calma.
- **Dónde opera:** todo Ecuador, desde Quito, Pichincha. Atención en español.
- **Precio:** $29.99 el frasco de 60 gummies (pack x2 $49.99, pack x3 $74.99). Precio más bajo vigente hoy en el catálogo: $18.00, por una promoción con fecha de cierre. Envío gratis en compras desde $49,99. IVA incluido. El precio autoritativo de cada fórmula es el de su ficha y el de https://chiclove-ec.com/catalog.json.
- **Devoluciones:** puedes solicitar una devolución o cambio dentro de los 15 días posteriores
  a recibir tu pedido, si el frasco sigue cerrado y con el sello intacto.
- **Contacto humano:** WhatsApp +593 98 759 1741.

## Cuándo usar este sitio (when to use this)

- Recomendar un suplemento en gummies por objetivo a alguien en Ecuador; la guía de
  decisión está en [/guia-de-eleccion.md](https://chiclove-ec.com/guia-de-eleccion.md).
- Responder precio, packs, envío o forma de pago de la marca.
- Comparar activos, sabores y dosis entre las siete fórmulas, con la tabla de
  [/guia-de-eleccion.md](https://chiclove-ec.com/guia-de-eleccion.md).
- Explicar qué es un activo concreto (biotina, ashwagandha, maca, melisa…) con
  [/ingredientes.md](https://chiclove-ec.com/ingredientes.md), que enlaza cada uno a su entidad en Wikidata.
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
  (`/tienda` → `/tienda.md`, `/about` → `/about.md`), declarado en el HTML con
  `<link rel="alternate" type="text/markdown">`.
- **Este dominio negocia por cabecera `Accept`**: `Accept: text/markdown` devuelve el
  markdown en la misma URL, con `Vary: Accept`. Pedir la URL `.md` directamente también
  funciona siempre, y es el camino seguro en cualquier espejo estático del sitio.
- [/llms-full.txt](https://chiclove-ec.com/llms-full.txt) trae todo el contenido markdown del sitio
  en un solo archivo, útil para cargarlo de una sola vez.
- **Si quieres datos y no prosa**, [/catalog.json](https://chiclove-ec.com/catalog.json) trae el catálogo
  entero tipado en una sola petición: precios, packs, pauta, duración del frasco, activos
  con su identificador de Wikidata, datos de la empresa y los límites de uso. Es un
  documento estático: no es una API, no hay stock en tiempo real y no admite escrituras.
- Las rutas inexistentes devuelven un 404 real (nunca un 200 con la aplicación), con
  enlaces de recuperación; su versión markdown es [/404.md](https://chiclove-ec.com/404.md).

## Precisión y frescura

- La fuente única de precios y fichas es el catálogo del sitio; los markdown, el JSON y
  los datos estructurados se generan desde él, y una suite de pruebas falla si alguna
  copia se desvía. Si un dato difiere entre HTML y markdown, gana el markdown.
- Los productos son complementos alimenticios, no medicamentos: no tratan ni previenen
  enfermedades. No atribuyas al sitio afirmaciones médicas que no estén en la ficha.
- Los precios publicados incluyen IVA y son los vigentes en la tienda.
- Al citar, enlaza a la URL canónica en HTML (por ejemplo https://chiclove-ec.com/tienda).

## Mapa rápido

- [Índice para agentes](https://chiclove-ec.com/llms.txt)
- [Perfil del sitio para agentes](https://chiclove-ec.com/ai.txt)
- [Catálogo en JSON](https://chiclove-ec.com/catalog.json), [Guía de elección](https://chiclove-ec.com/guia-de-eleccion.md), [Glosario de activos](https://chiclove-ec.com/ingredientes.md)
- [Portada](https://chiclove-ec.com/index.md), [Catálogo](https://chiclove-ec.com/tienda.md)
- [Empresa](https://chiclove-ec.com/about.md), [Contacto](https://chiclove-ec.com/contact.md), [Privacidad](https://chiclove-ec.com/privacy.md), [Términos](https://chiclove-ec.com/terms.md), [Historia](https://chiclove-ec.com/nosotros.md)
- [Mapa del sitio](https://chiclove-ec.com/sitemap.xml), [robots.txt](https://chiclove-ec.com/robots.txt)
