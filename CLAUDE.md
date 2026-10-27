# Timba

App personal para organizar partidas de poker (torneo) entre amigos. Todo se usa desde el móvil, en la mesa.

## Funciones

1. **Calculadora de fichas**: elegir el set de fichas disponible hoy y el número de jugadores, y obtener cuántas fichas de cada color recibe cada jugador (y cuántas sobran).
2. **Estructura de ciegas**: generar los niveles de ciegas a partir del stack inicial, nº de jugadores, duración del nivel y duración objetivo de la partida. Referencia: https://pokersoup.com/tool/blindStructureCalculator
3. **Cronómetro de niveles**: cuenta atrás por nivel (por defecto 20 min), aviso sonoro/vibración al cambiar, pausa/reanudar, pantalla siempre encendida.

## Reglas de nuestras partidas

- Jugadores: normalmente 5–9. Si somos más, 2 mesas (mismas ciegas y mismo cronómetro).
- Buy-in: 5 €. Sin recompras (freezeout).
- Duración objetivo: 2–3 horas.
- Niveles de 20 minutos.
- El stack inicial varía cada partida: la app debe **guardar la configuración de la última partida** (y un historial) para no tener que recordarla.
- Las ciegas deben poder pagarse con la ficha más pequeña del set en uso (la ciega pequeña inicial = valor de la ficha más baja).

## Reglas de reparto de fichas

- Escalonado: cuanto más alto el valor, **menos fichas** de ese color por jugador (nunca el mismo número de todas).
- Suficientes fichas pequeñas para pagar las primeras rondas de ciegas sin pedir cambio (~8–10 de la más baja si el set lo permite).
- Lo que sobra del set queda como **banca** para dar cambio y para retirar las fichas pequeñas más adelante (color-up); conviene que sobren fichas grandes.
- Stack inicial orientativo: 30–50 ciegas grandes, para partidas de 2–3 h con niveles de 20 min.

## Sets de fichas

Los sets son editables en la app (cada uno trae uno distinto y los valores pueden cambiar).

- **Set 200 pc**: 4 colores, 50 fichas de cada uno
  - Blanca 5 · Roja 10 · Verde 25 · Azul 50
  - Valor total del set: 4.500
- **Set 2**: pendiente (colores, cantidades y valores por confirmar).

## Stack técnico

- React + TypeScript + Vite, como PWA (funciona en el navegador del móvil y offline).
- Capacitor para generar el APK de Android cuando haga falta.
- Datos guardados en local (localStorage / Capacitor Preferences). Sin backend.
- Idioma de la interfaz: español.

## Comandos

- `npm run dev`: servidor de desarrollo (con `--host`, accesible desde el móvil en la misma wifi)
- `npm test`: tests (Vitest)
- `npm run build`: comprobación de tipos y build de producción
- `npm run android:sync`: build + copiar al proyecto Android (`android/`). Hay que ejecutarlo tras cada cambio antes de recompilar el APK
- `npm run android:open` / `npm run android:apk`: abrir en Android Studio / compilar el APK de debug (necesita `JAVA_HOME` apuntando al JBR de Android Studio). Guía completa en `ANDROID.md`

## Android (Capacitor 8)

- Config en `capacitor.config.json` (no `.ts`: con TypeScript 7 la CLI de Capacitor no puede leer configs `.ts`).
- En nativo, `src/lib/alerts.ts` usa `@capacitor-community/keep-awake` (pantalla encendida) y `@capacitor/haptics` (vibración); en web, Wake Lock API y `navigator.vibrate`.
- Icono y splash generados desde `assets/logo.png` con `npm run android:icons`.

## Estructura

- `src/lib/chips.ts`: algoritmo de reparto de fichas (lógica pura, con tests en `chips.test.ts`)
- `src/lib/blinds.ts`: estructura de ciegas (curva exponencial como Pokersoup: al llegar a la duración objetivo, ciega grande ≈ fichas totales / 12; valores redondeados a cantidades pagables y avisos de color-up). Tests en `blinds.test.ts`
- `src/lib/plan.ts`: `useGamePlan()`, la partida configurada (fichas + ciegas) que usan Ciegas y Reloj
- `src/lib/timer.ts`: lógica pura del cronómetro, basada en marcas de reloj (`endsAt`) para sobrevivir a pantalla bloqueada y recargas. Tests en `timer.test.ts`
- `src/lib/useGameClock.ts`: reloj de la partida a nivel de App (avanza niveles y avisa aunque se esté en otra pestaña)
- `src/lib/alerts.ts`: sonidos (Web Audio), vibración y Wake Lock
- `src/lib/storage.ts`: configuración y partida en curso guardadas en localStorage
- `src/components/`: pantallas (calculadora de fichas, editor de sets, estructura de ciegas, reloj)

Nota: Wake Lock y vibración solo funcionan en contexto seguro (https o localhost) y la vibración no existe en iOS. Abriendo la app por IP de la wifi (http) la pantalla puede apagarse; en el APK de Capacitor funcionan.

Nota: Pokersoup genera estructuras rotas con stacks pequeños (<1000) o duraciones con decimales; por eso usamos nuestro propio cálculo.
