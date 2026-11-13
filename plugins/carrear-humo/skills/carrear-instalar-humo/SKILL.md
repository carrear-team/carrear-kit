---
name: carrear-instalar-humo
description: "Mini-instalador de prueba de CarrEar. Úsala cuando el usuario diga «Instala CarrEar», «instalar CarrEar» o «configura CarrEar». Crea en su Google Drive la carpeta «CarrEar» con el doc «Digital Brain — Configuración» vacío y propone una tarea programada de prueba. Versión de prueba de humo: no pide ni guarda datos personales."
---

# CarrEar · Instalador de prueba (humo 0.1.0)

Objetivo: comprobar en una cuenta nueva que (1) se puede escribir en su Drive y (2) se puede crear desde el chat una tarea programada que corre sola. **No pidas ni escribas ningún dato personal**: ni nombre, ni correo, ni ciudad. La ficha queda vacía a propósito.

Habla en el idioma del usuario, frases cortas. Al final de cada paso di «Paso N: OK» o «Paso N: KO — <mensaje exacto del error>».

## Paso 1 — Comprobar Google Drive
- Busca las herramientas del conector Google Drive (por ejemplo `search_files` y `create_file`). Si están diferidas, cárgalas.
- Si no hay conector de Drive: di «Paso 1: KO — falta el conector Google Drive. Actívalo en Ajustes › Conectores y vuelve a escribir "Instala CarrEar"» y para.

## Paso 2 — Carpeta «CarrEar»
- Busca una carpeta llamada exactamente `CarrEar` en la raíz de Mi unidad (no en la papelera).
- Si existe, reutilízala. Si no, créala (tipo carpeta de Google Drive: `application/vnd.google-apps.folder`) en la raíz.
- Guarda su id: es `rootFolderId`.

## Paso 3 — Doc «Digital Brain — Configuración»
- Dentro de la carpeta `CarrEar`, busca un Google Doc con título exacto `Digital Brain — Configuración`.
- Si existe, reutilízalo y no lo sobrescribas.
- Si no existe, créalo como Google Doc (`application/vnd.google-apps.document`) con el texto de `plantilla-configuracion.txt` (está en la carpeta de esta skill), sustituyendo:
  - `{installedAt}` → fecha y hora actuales en ISO 8601 (UTC),
  - `{rootFolderId}` → id de la carpeta del paso 2,
  - `{configDocId}` → déjalo en `—` al crear; si la herramienta permite editar después, pon el id del doc.
- Si no puedes leer el archivo de la plantilla, crea el doc con estas secciones vacías, en este orden: NÚCLEO (`configVersion: 1`, `installedAt: <ahora>`), IDENTIDAD DEL USUARIO, FAMILIA, DRIVE: CARPETAS Y DOCUMENTOS, HOJAS DE GOOGLE, CORREO, CALENDARIO Y TAREAS, WHATSAPP Y ORDENADOR, MARCA Y CONFIDENCIALIDAD, INSTALACIÓN Y CONSUMO, PRUEBAS DE HUMO.
- Guarda su id: es `configDocId`. Muestra al usuario el enlace al doc.

## Paso 4 — Proponer la tarea programada de prueba
Di en dos líneas qué vas a crear y pide un «sí». Con el «sí», crea la tarea con la herramienta de tareas programadas de Claude (si está diferida, cárgala). Datos de la tarea:
- Nombre: `CarrEar · prueba de humo`
- Frecuencia: una vez al día a las 18:17, hora local del usuario (zona del navegador o de su cuenta; si no la sabes, UTC).
- Aprobación: automática si la herramienta lo permite. Si la tarea queda «pidiendo aprobación», dile: «Abre la tarea y activa "Aprobar automáticamente" en sus ajustes».
- Prompt (pon los ids reales en lugar de `<configDocId>`):

```
Tarea de prueba de CarrEar (kit de humo 0.1.0). Corre sin nadie delante: no preguntes nada.
1. Con el conector Google Drive, abre el Google Doc con id <configDocId> (título «Digital Brain — Configuración», carpeta «CarrEar»). Si el id falla, búscalo por título exacto.
2. Añade al final del doc, bajo «PRUEBAS DE HUMO», una línea nueva: «CARREAR-HUMO-TAREA-OK · <fecha y hora ISO actual>». No cambies nada más del doc.
3. No leas correo ni calendario, no envíes nada, no crees ni borres otros archivos.
4. Termina con una sola línea: «Prueba de humo OK» o «Prueba de humo KO: <motivo>».
```

Si no existe la herramienta de tareas programadas, o falla por permisos: di «Paso 4: KO — <mensaje exacto>» y da al usuario los datos de arriba para crearla a mano (Tareas programadas › Nueva tarea), con el prompt listo para copiar.

## Paso 5 — Cierre
Resume en 4 líneas: carpeta (enlace), doc (enlace), tarea (nombre y estado), y «Para comprobarla ya: abre la tarea y pulsa "Ejecutar ahora"; en menos de 5 min debe aparecer la línea CARREAR-HUMO-TAREA-OK en el doc». Recuerda: «Al terminar la prueba, pon la tarea en pausa».

## Nunca
- Pedir, inventar ni escribir datos personales del usuario o de terceros.
- Leer correo, calendario ni otros archivos del Drive aparte de buscar la carpeta y el doc.
- Borrar ni sobrescribir archivos existentes.
- Enviar correos, mensajes o invitaciones.
