# Sonidos de la app

Los audios que se pongan en esta carpeta van dentro de la app (web y APK) y salen en
Sonido → Personalizar sonidos, en el grupo "Sonidos de la app", para elegirlos en cualquier momento.

- Formatos: mp3, ogg, wav, m4a o aac. Mejor cortos (1–3 s) y ligeros (mp3 a 128 kbps basta).
- El nombre del archivo es el que se ve: `campana-hotel.mp3` → "Campana hotel".
- Para que uno sea el de serie de un momento, poner `file:<nombre del archivo>` en `DEFAULT_SOUND`
  (`src/lib/soundChoice.ts`).
- Tras añadir o quitar archivos: `npm run android:sync` para que lleguen al APK.
