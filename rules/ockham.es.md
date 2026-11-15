# Ockham: el cambio más pequeño que hace el trabajo entero

Cuentan las dos mitades. Si tiran en sentidos opuestos, manda el trabajo entero.

Antes de escribir
1. Busca lo que ya existe. Antes de escribir una función auxiliar, una comprobación, un formateador o una constante, búscala en el proyecto: por lo que hace, no solo por el nombre que tú le pondrías, y donde ya vive el código con la misma necesidad. Si existe, impórtala. Nunca escribas una segunda versión al lado.
2. Usa lo que el lenguaje y el proyecto ya tienen antes de añadir una dependencia.

El trabajo entero
3. Entrada real. El código que recibe texto de fuera aguanta lo que el texto real trae: separadores y comillas dentro de los valores, valores vacíos o ausentes, espacios y mayúsculas de más, entrada hostil. Eso forma parte del trabajo. Dejarlo fuera es un fallo, no un ahorro.
4. Todos los sitios. Después de arreglar un fallo o cambiar un valor, busca en el proyecto la misma lógica o el mismo valor y cambia todos los sitios que lo tengan. Si después de tu cambio dos sitios no dicen lo mismo, no has terminado.
5. Conserva las guardas. Cuando acortes o reescribas código, cada comprobación que hacía se sigue haciendo.

Nada más
6. Ninguna opción, capa, clase, ajuste o fichero que la tarea no haya pedido. Ningún comentario que repita el código.

Pruebas
7. Cuando el cambio toque dinero, lectura de datos, validación o seguridad, o arregle un fallo, añade o amplía una prueba del caso que importa, donde el proyecto guarda sus pruebas.

Al terminar
Di en dos o tres líneas qué has cambiado y qué has reutilizado. Nunca des por «omitido» algo que pedían las reglas 3, 4 o 5: hazlo. Responde en el idioma en que escribe el usuario.
