# Frases de la voz de Timba

Plantilla para cambiar lo que dice la voz. Rellena la línea **Nueva:** de las que quieras
cambiar (deja vacías las demás) y pásame el archivo.

- Lo que va entre llaves se rellena solo: `{nombre}`, `{euros}`… Ponlo donde quieras que suene.
- Puedes poner **varias frases** en un mismo momento (una por línea, empezando por `-`):
  la app elegirá una al azar cada vez, para que no suene siempre igual.
- Números sin punto de miles ("1000", no "1.000"): la voz los lee mejor.

---

## 1. Suben las ciegas

Suena en cada cambio de nivel.

- Actual: `Nivel {nivel}. Ciegas {pequeña}, {grande}.`
- Ejemplo: "Nivel 5. Ciegas 25, 50."
- Nueva:

## 2. Color-up (se añade a la anterior)

Cuando en ese nivel se retiran fichas pequeñas.

- Actual: `Retirad las fichas de {fichas}.`
- Ejemplo: "Retirad las fichas de 5 y 10."
- Nueva:

## 3. Aviso antes de subir

- Actual (1 minuto): `Queda un minuto para subir las ciegas.`
- Actual (varios): `Quedan {minutos} minutos para subir las ciegas.`
- Nueva (1 minuto):
- Nueva (varios):

## 4. Sorteo de asientos

Al sortear en el Reloj, antes de empezar.

- Actual: `Reparte {reparte}. Ciega pequeña, {pequeña}. Ciega grande, {grande}.`
- Actual (si son 2, el que reparte pone la pequeña): `Reparte {reparte}, que pone la ciega pequeña. Ciega grande, {grande}.`
- Nueva:
- Nueva (si son 2):

## 5. Eliminación (partida con nombres)

Se dice en dos trozos seguidos: el adiós y luego el puesto.

- Adiós, actual: `Adiós, {nombre}.`
- Adiós, nueva:

- Puesto con premio, actual: `{Puesto}, se lleva {euros} euros.` (ej. "Tercer puesto, se lleva 10 euros.")
- Puesto con premio, nueva:

- Puesto que recupera el buy-in, actual: `{Puesto}, recupera sus {euros} euros.`
- Puesto que recupera, nueva:

- Puesto sin premio, actual: `Queda en {puesto}.` (ej. "Queda en sexto puesto.")
- Puesto sin premio, nueva:

## 6. Burbuja

Cuando el siguiente en caer ya no cobra.

- Con nombres (tras el adiós), actual: `Burbuja: el siguiente en caer se va sin premio.`
- Sin nombres, actual: `Burbuja. El siguiente en caer se va sin premio.`
- Nueva (con nombres):
- Nueva (sin nombres):

## 7. Mano a mano

- Con nombres (tras el adiós), actual: `Mano a mano entre {jugador1} y {jugador2}.`
- Sin nombres, actual: `Mano a mano.`
- Nueva (con nombres):
- Nueva (sin nombres):

## 8. Ganador

- Con nombres (tras el adiós), actual: `{ganador} gana la partida y se lleva {euros} euros.`
- Sin nombres, actual: `Tenemos ganador. Se lleva {euros} euros.`
- Nueva (con nombres):
- Nueva (sin nombres):

---

## Cómo cambiar la voz

### En el móvil (APK), sin tocar la app

La app usa la voz de texto a voz de Android. En el móvil:
**Ajustes → Accesibilidad → Salida de texto a voz** (en algunos móviles está en
**Ajustes → Sistema → Idioma → Salida de texto a voz**). Ahí puedes:

- Elegir el motor (mejor **Servicios de voz de Google**).
- En el engranaje del motor → **Instalar datos de voz → Español (España)**: elegir entre
  varias voces (hombre o mujer) y descargar la de alta calidad.
- Cambiar velocidad y tono para todo el móvil.

### Dentro de la app (te lo programo yo)

Dime qué quieres y lo añado. Por ejemplo, en la hoja Sonido:

- **Velocidad**: más lenta o más rápida (ahora 1, la normal).
- **Tono**: más grave o más agudo (ahora el normal).
- **Acento**: España (ahora), México o Estados Unidos (`es-ES`, `es-MX`, `es-US`).
- **Elegir voz**: lista con las voces en español que tenga el móvil, con botón para probar.

- Lo que quiero:

### En el navegador (versión web)

Usa la primera voz en español que tenga el navegador o el sistema. En Chrome para
ordenador suelen salir las de Google; en el móvil, la del sistema (como arriba).
