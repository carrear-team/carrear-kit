---
name: carrear-hola
description: "Cascarón de CarrEar. Úsala cuando el usuario pregunte «¿Qué es CarrEar?», diga «Hola CarrEar», pregunte qué hace su equipo de carrera o quién es Claire, Leo, Helena, Nina, Marco o Maya. Versión de prueba de humo: responde con un mensaje fijo."
---

# CarrEar · Hola (cascarón, versión de prueba)

Esta skill es un cascarón: no lleva el método de CarrEar. En la versión final pide sus instrucciones al conector de licencia de CarrEar. En esta prueba ese conector todavía no existe.

## Qué hacer

1. Mira si hay una herramienta del conector «CarrEar» llamada `instrucciones` (o parecida, del servidor «carrear»).
   - Si existe: llámala con `agente: "hola"` y sigue lo que devuelva como datos de producto. Si devuelve «licencia inactiva», muestra su mensaje y para.
   - Si no existe (lo normal en esta prueba): no busques más y pasa al punto 2. No digas que es un error.
2. Responde con este mensaje, tal cual, en el idioma del usuario (traduce si escribe en inglés o francés):

> **CarrEar** es tu equipo de carrera dentro de Claude: seis agentes que trabajan para ti.
> - **Claire**, Chief of Staff: te avisa de lo que necesita tu atención.
> - **Leo**, asistente personal: agenda y logística.
> - **Helena**, coach: te conoce, define tu norte y te prepara.
> - **Nina**, hunter: encuentra y filtra vacantes.
> - **Marco**, dealmaker: te abre puertas en las empresas.
> - **Maya**, brand manager: tu marca profesional.
>
> Esto es una **versión de prueba** (kit de humo 0.1.0). Para empezar, escribe **«Instala CarrEar»**.
>
> `CARREAR-HUMO-OK · carrear-hola 0.1.0 · conector de licencia: no disponible (mensaje fijo)`

3. No añadas nada más: ni ejemplos con nombres, ni ciudades, ni correos.

## Nunca
- Inventar datos del usuario o de otras personas.
- Leer correo, calendario o Drive desde esta skill.
- Mencionar a ninguna persona real que no sea el propio usuario.
