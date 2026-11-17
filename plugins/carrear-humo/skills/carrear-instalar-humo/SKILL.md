---
name: carrear-instalar-humo
description: "Mini-instalador de prueba de CarrEar. Úsala cuando el usuario diga «Instala CarrEar», «instalar CarrEar» o «configura CarrEar». Sigue el recorrido del onboarding de cliente: comprueba el proyecto «Digital Brain», crea en Google Drive la carpeta «Digital Brain — [Nombre]» con sus subcarpetas y el doc «Digital Brain — Configuración», deja el texto para las instrucciones del proyecto, apunta todo en una bitácora aparte y propone una tarea programada de prueba. Versión de prueba de humo: solo pide el nombre de pila."
---

# CarrEar · Instalador de prueba (humo 0.8.0)

Objetivo: comprobar en una cuenta nueva el recorrido del onboarding de cliente (doc «CarrEar — Onboarding: as-is, en camino e ideal», etapa 3 «Instalar»):
1. que el chat del instalador vive en el proyecto «Digital Brain» y se llama «📌 Instalador — CarrEar»;
2. que se puede escribir en su Drive con la estructura acordada;
3. que se puede crear desde el chat una tarea programada que corre sola, con aprobación automática.
Todo lo que pase se apunta en una bitácora aparte. **El único dato personal que se pide es el nombre de pila** (para el nombre de la carpeta). Nada de correo, ciudad, familia ni empresa.

Habla en el idioma del usuario, frases cortas. Al final de cada paso di «Paso N: OK» o «Paso N: KO — <mensaje exacto del error>». Apunta la hora de inicio: al cerrar se mide el tiempo total (meta del ensayo: ≤ 30 min).

## Regla de la bitácora
Desde el paso 3, cada paso que termine (OK o KO) añade una línea al final del doc «Bitácora de pruebas» **con el conector Google Docs** (insertar texto al final del documento; el de Drive no edita):
`<fecha y hora ISO> · INSTALADOR · Paso N · OK|KO · <qué se hizo o el error exacto>`
Si la bitácora aún no existe o no se puede escribir, sigue y dilo en el chat.

## Paso 0 — Tu acceso a CarrEar
- Busca la herramienta `licencia` del conector CarrEar (si está diferida, cárgala) y llámala.
- Si no existe el conector: «Paso 0: KO — falta la conexión CarrEar. Ve a Personalizar › Plug-ins › Carrear humo › Conectores › Conectar y vuelve a escribir "Instala CarrEar"». Para.
- Si `estado` no es `activa`: enseña su `mensaje` y su `enlacePago` y para. No sigas con ningún paso.
- Si es `activa`: «Paso 0: OK — acceso activo hasta <hasta>».

## Paso 1 — Proyecto «Digital Brain» y nombre del chat
- Comprueba si este chat está dentro de un proyecto cuyo nombre empieza por «Digital Brain» (p. ej. «Digital Brain · PRUEBA») (lo ves en tu contexto: instrucciones o archivos del proyecto). Si no lo sabes, pregúntalo con un sí/no.
- Si no está: «Paso 1: KO — este chat no está en el proyecto Digital Brain. Crea el proyecto (Proyectos › Nuevo proyecto › "Digital Brain"), abre un chat dentro y vuelve a escribir "Instala CarrEar"». Para.
- Si está: pide renombrar este chat: «Pulsa ⋮ junto a este chat › Renombrar › escribe 📌 Instalador — CarrEar. Si tu app permite fijar chats, fíjalo arriba». Espera su «hecho» y sigue (el renombre no lo puedes comprobar tú: anótalo como «hecho según el usuario»).

## Paso 2 — Comprobar Google Drive y pedir el nombre
- Busca las herramientas del conector Google Drive (por ejemplo `search_files` y `create_file`). Si están diferidas, cárgalas.
- Si no hay conector de Drive: «Paso 2: KO — falta el conector Google Drive. Actívalo en Ajustes › Conectores y vuelve a escribir "Instala CarrEar"». Para.
- Busca también las herramientas del conector Google Docs (las que editan un doc, por ejemplo `update_doc`). Si no está: «Paso 2: KO — falta el conector Google Docs (sirve para que tu equipo apunte cosas en tus documentos). Actívalo en Personalizar › Conectores › Google Docs › Conectar y vuelve a escribir "Instala CarrEar"». Para.
- Pregunta: «¿Cómo te llamas? Solo tu nombre de pila; lo uso para el nombre de tu carpeta». Guárdalo como `{nombre}`.

## Paso 3 — Bitácora de pruebas (solo para la prueba)
- Busca en la raíz de Mi unidad una carpeta llamada exactamente `CarrEar · Bitácora de pruebas` (no en la papelera). Si no existe, créala (`application/vnd.google-apps.folder`).
- Dentro, busca un Google Doc con título exacto `Bitácora de pruebas`. Si existe, reutilízalo y no lo sobrescribas. Si no, créalo (`application/vnd.google-apps.document`) con este texto:
  ```
  BITÁCORA DE PRUEBAS — CarrEar (kit de humo)
  Una línea por evento: fecha y hora · origen · paso · OK/KO · detalle.
  Orígenes: INSTALADOR (este chat), TAREA (tarea programada), PANTALLA (pantalla compartida).

  REGISTRO
  ```
- Guarda su id: es `logDocId`. Añade la primera línea con los pasos 1 a 3.

## Paso 4 — Carpeta «Digital Brain — {nombre}» y subcarpetas
- Busca en la raíz de Mi unidad una carpeta llamada exactamente `Digital Brain — {nombre}`. Si existe, reutilízala; si no, créala en la raíz.
- Dentro, crea (o reutiliza si ya existen) estas 6 subcarpetas, con estos nombres exactos: `Perfil y carrera`, `Personas`, `Vacantes`, `Marca`, `Proyectos`, `Documentos`.
- Guarda los ids: la carpeta principal es `rootFolderId`; cada subcarpeta va a su campo `drive.folders.*` de la configuración.
- Comprueba que las 7 carpetas aparecen al buscarlas. Apunta en la bitácora cuántas se crearon y cuántas se reutilizaron.

## Paso 5 — Doc «Digital Brain — Configuración»
- Dentro de `Digital Brain — {nombre}`, busca un Google Doc con título exacto `Digital Brain — Configuración`. Si existe, reutilízalo y no lo sobrescribas.
- Si no existe, créalo como Google Doc con el texto de `plantilla-configuracion.txt` (en la carpeta de esta skill), sustituyendo:
  - `{installedAt}` → fecha y hora actuales en ISO 8601 (UTC);
  - `{nombre}` → el nombre de pila;
  - `{timezone}` → la zona horaria del usuario si la sabes (navegador o cuenta), si no `—`;
  - `{rootFolderId}`, `{f_perfil}`, `{f_personas}`, `{f_vacantes}`, `{f_marca}`, `{f_proyectos}`, `{f_documentos}` → los ids del paso 4;
  - `{logDocId}` → id de la bitácora;
  - `{configDocId}` → `—` al crear; si la herramienta permite editar después, pon el id del doc.
- Si no puedes leer la plantilla, crea el doc con las secciones vacías NÚCLEO, PLAN CONTRATADO, IDENTIDAD DEL USUARIO, FAMILIA, DRIVE: CARPETAS Y DOCUMENTOS, HOJAS DE GOOGLE, CORREO, CALENDARIO Y TAREAS, WHATSAPP Y ORDENADOR, MARCA Y CONFIDENCIALIDAD, INSTALACIÓN Y CONSUMO, y apunta en la bitácora que se usó el plan B.
- Guarda su id: es `configDocId`. Enseña el enlace al doc.

## Paso 5b — Tu página CarrEar (completa)
- Lee `archivos-pagina.json` (carpeta de esta skill): trae `version`, `maestro` y `files` (cada ruta con su origen `{artifact, path}`).
- Publica `carrear.html` (carpeta de esta skill) como artefacto nuevo, **exactamente como está, sin cambiar ni una letra**, pasando en `files` el objeto `files` de ese JSON tal cual (no subas esos archivos desde disco: la plataforma los copia del maestro de CarrEar en el servidor). Capacidades:
  `{"db": {}, "sample": {}, "mcp": {"servers": [{"server": "carrear", "tools": ["licencia"]}, {"server": "Gmail", "tools": ["search_threads", "get_thread", "label_thread", "unlabel_thread", "trash_thread", "mark_thread_spam", "create_draft"]}, {"server": "Google Calendar", "tools": ["list_events", "create_event", "update_event", "get_event", "delete_event", "respond_to_event"]}, {"server": "Google Drive", "tools": ["search_files", "read_file_content", "download_file_content", "create_file", "update_file"]}, {"server": "Google Sheets", "tools": ["get_values", "update_values", "append_values"]}]}}`
  Si un conector no existe en la cuenta, déjalo igual en la lista: la página lo muestra como «Sin conectar».
  WhatsApp (Make + Bird) y tareas con Siri (Todoist) son opcionales y no van en esta instalación: si el usuario los pide, dile que es un módulo aparte que se activa después («activa WhatsApp» / «activa Todoist»).
- La primera vez, Claude pregunta si permites copiar del artefacto de CarrEar (otra organización). Dile: «Acepta: es el código de tu página, sin datos de nadie». Si la herramienta pide reintentar para hacer esa pregunta, reintenta la misma publicación.
- Si la publicación falla de otra forma: «Paso 5b: KO — <error exacto>», publica en su lugar `carrear-piloto.html` como página provisional (mismas capacidades) y apúntalo en la bitácora.
- Si ya publicaste la página antes en esta cuenta, vuelve a publicar en **el mismo enlace** para que no pierda su base.
- Dile: «Abre tu página CarrEar y pulsa Continuar en la ventana de permisos (una sola vez). Si ves "Tu acceso a CarrEar no está activo", avísame». Espera su «hecho».
- Apunta en la bitácora: versión, enlace y si la página abrió sin el aviso de acceso.
- Escribe el enlace en el doc de configuración, línea `boardUrl:` (conector Google Docs; solo esa línea).

## Paso 5c — Configuración de la página
Con la herramienta de base de datos de artefactos (ArtifactData; si está diferida, cárgala) escribe en la página del paso 5b la colección `dashboard`, documento `userConfig` (si ya existe, léelo y usa `update` con su versión; nunca borres campos):
`{"boardUrl": "<enlace de la página>", "user": {"firstName": "<nombre>", "timezone": "<zona o vacío>"}, "drive": {"rootFolderId": "<rootFolderId>", "rootFolderName": "Digital Brain — <nombre>", "folders": {"vacantes": "<id Vacantes>", "misDatos": "<id Perfil y carrera>"}}, "claude": {"projectId": "<id del proyecto si lo ves, si no vacío>"}, "chats": {}}`
Nada más: ni correo, ni teléfono, ni familia. «Paso 5c: OK» cuando la escritura confirme versión.

## Paso 5d — Un chat fijo por agente
Cargar un agente en un chat nuevo tarda; por eso cada agente vive en su propio chat fijado. Dile, en un solo mensaje:
«Vamos a dejar a tu equipo cada uno en su chat (2 minutos). Dentro del proyecto Digital Brain, para cada agente: abre un chat nuevo, escribe solo su nombre (Claire, Leo, Helena, Nina, Marco o Maya) y envíalo; luego ⋮ › Renombrar → "📌 <Nombre>", y fíjalo si tu app lo permite. Después pégame aquí los 6 enlaces (o los que tengas).»
- Con los enlaces que pegue (solo los que empiezan por `https://claude.ai/chat/`), haz `update` de `dashboard/userConfig` con `{"chats": {"claire": "…", "leo": "…", …}}`.
- Explícale: «En tu página, abajo a la derecha, verás un botón por agente que abre su chat. Cuando la página te proponga pedirle algo a un agente, copiará el mensaje y abrirá su chat: solo pégalo. La página sigue siendo para ver; las peticiones a tu equipo, en su chat».
- Si no quiere ahora: «Paso 5d: pendiente» y sigue; se puede hacer luego diciendo «configura mis chats».

## Paso 6 — Instrucciones del proyecto «Digital Brain»
Las skills leen los ids desde dos sitios fijos: este doc de configuración y las instrucciones del proyecto. Tú no puedes editar las instrucciones del proyecto: dale al usuario este bloque listo para copiar (con los ids reales) y dile dónde pegarlo: «Proyecto Digital Brain › Instrucciones › Editar › pega al final › Guardar».
```
CARREAR · CONFIGURACIÓN (no borrar)
Configuración: Google Doc «Digital Brain — Configuración», id <configDocId>
Carpeta principal: «Digital Brain — <nombre>», id <rootFolderId>
Antes de cualquier tarea de CarrEar, lee la configuración. Nada sale sin el sí del usuario.
```
Espera su «hecho» y apúntalo en la bitácora.

## Paso 7 — Proponer la tarea programada de prueba
Di en dos líneas qué vas a crear y pide un «sí». Con el «sí», crea la tarea con la herramienta de tareas programadas de Claude (si está diferida, cárgala). Datos de la tarea:
- Nombre: `⚙️ CarrEar — prueba de humo (diaria)`
- Frecuencia: una vez al día a las 18:17, hora local del usuario (si no la sabes, UTC).
- Aprobación: automática si la herramienta lo permite. Si la tarea queda «pidiendo aprobación», dile: «Abre la tarea y activa "Aprobar automáticamente" en sus ajustes» y apúntalo en la bitácora (dato clave del onboarding: H9).
- Prompt (pon los ids reales en lugar de `<configDocId>` y `<logDocId>`):

```
⚙️ Tarea automática de CarrEar (kit de humo 0.6.0). Corre sin nadie delante: no preguntes nada.
0. Llama a la herramienta `licencia` del conector CarrEar. Si su estado no es «activa», apunta en la bitácora «TAREA · diaria · PARADA · acceso no activo» y termina con «Acceso no activo: tarea parada». No hagas nada más.
Empieza tu respuesta con esta línea, tal cual: «⚙️ Tarea automática de CarrEar — esta conversación se reinicia en cada corrida. ¿Cambios? → 📌 Instalador — CarrEar».
1. Con el conector Google Drive, abre el Google Doc con id <configDocId> («Digital Brain — Configuración»). Si el id falla, búscalo por título exacto. Solo léelo; no lo cambies.
2. Abre el Google Doc con id <logDocId> («Bitácora de pruebas»). Si el id falla, búscalo por título exacto.
3. Con el conector Google Docs, añade al final de la bitácora una línea nueva: «<fecha y hora ISO actual> · TAREA · diaria · OK · config legible» (o «KO · <motivo exacto>»). No cambies nada más.
4. No leas correo ni calendario, no envíes nada, no crees ni borres otros archivos.
5. Termina con una sola línea: «Prueba de humo OK» o «Prueba de humo KO: <motivo>».
```

Si la tarea se creó bien, escribe `install.claudePlan: pro` en la configuración (solo esa línea).

Si no existe la herramienta de tareas programadas, o falla por permisos o por el plan de la cuenta: di «Paso 7: KO — <mensaje exacto>» y apúntalo en la bitácora (indica qué no permite el plan).
- Si el motivo es el plan (cuenta Claude Free), dilo así, claro y sin presionar:
  «Tu cuenta es Claude Free. CarrEar funciona cuando tú escribes en el chat, pero las actividades que se repiten solas necesitan Claude Pro, porque en Free no existen las tareas programadas. Por ejemplo, sin Pro:
  · Claire no te prepara cada mañana lo que merece tu atención.
  · Leo no revisa cada día tu agenda ni te avisa de choques.
  · Tu equipo no hace el seguimiento automático de correos sin respuesta.
  Además, en Free tienes menos mensajes al día. Si quieres esas actividades, puedes pasar a Claude Pro desde Ajustes › Plan; CarrEar no cambia tu plan.»
- Si el motivo fue el plan, escribe `install.claudePlan: free` en la configuración (con el conector Google Docs, solo esa línea).
- Si el motivo es otro, da al usuario los datos de arriba para crearla a mano (Tareas programadas › Nueva tarea), con el prompt listo para copiar.

## Paso 8 — Cierre
Resume en 7 líneas: acceso (hasta cuándo), chat (proyecto y nombre), página CarrEar (enlace), carpeta «Digital Brain — {nombre}» (enlace), configuración (enlace), bitácora (enlace), tarea (nombre y estado) y tiempo total desde el paso 1. Después: «Para comprobar la tarea ya: abre la tarea y pulsa "Ejecutar ahora"; en menos de 5 min debe aparecer una línea TAREA en la bitácora y la conversación de la tarea debe empezar por la línea ⚙️». Recuerda: «Al terminar la prueba, pon la tarea en pausa». Añade este texto, tal cual (sin marcar ni recomendar ninguna opción):
«Sobre los permisos de Claude: la primera vez que uses cada herramienta, Claude te preguntará si lo permite.
· Para lo que solo lee (tu acceso a CarrEar, el método de Claire, Leo y Helena, leer tu correo, tu agenda y tu Drive) puedes elegir "Permitir siempre" o "Permitir una vez"; tú decides, y puedes cambiarlo cuando quieras en Ajustes.
· Para lo que crea, mueve, borra o envía, Claude te preguntará cada vez, y antes tu agente te dirá en una línea qué va a tocar (título del evento, archivo o destinatario).
· En tu página CarrEar, los botones funcionan después de pulsar una vez "Continuar" en su ventana de permisos.
· Claude tiene también un modo Auto: en él actúa sin pedirte confirmación, también al borrar o enviar. Es opción tuya; CarrEar no lo cambia ni lo recomienda, y la regla de tu equipo sigue igual: nada sale sin tu sí.» Añade a la bitácora la línea de cierre con el tiempo total.

## Nunca
- Pedir, inventar ni escribir datos personales aparte del nombre de pila.
- Leer correo, calendario ni otros archivos del Drive aparte de buscar las carpetas y docs de arriba.
- Borrar ni sobrescribir archivos existentes.
- Enviar correos, mensajes o invitaciones.
