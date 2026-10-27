# Generar el APK de Timba

## Preparación (solo la primera vez)

1. Instala **Android Studio**: https://developer.android.com/studio
2. Ábrelo una vez y deja que termine el asistente inicial. Ese asistente descarga el Android SDK.

No hace falta instalar Java aparte: Android Studio trae el suyo. El Java 8 que tienes instalado es demasiado antiguo para Android.

## Opción A: desde Android Studio (la más sencilla)

```bash
npm run android:sync
npm run android:open
```

En Android Studio, espera a que termine de sincronizar Gradle (la barra de abajo) y entra en **Build → Build App Bundle(s) / APK(s) → Build APK(s)**. Cuando termine, pulsa **locate** en el aviso. El APK está en:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

## Opción B: desde la terminal

Gradle necesita el Java de Android Studio. En PowerShell:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
npm run android:apk
```

## Instalar en el móvil

- **Por cable:** activa la *depuración USB* en el móvil (Ajustes → Acerca del teléfono → pulsa 7 veces en "Número de compilación" → Opciones de desarrollador). Después, en Android Studio, pulsa ▶ con el móvil conectado.
- **Sin cable:** pásate `app-debug.apk` (por Drive, WhatsApp, etc.), ábrelo en el móvil y acepta "instalar apps de origen desconocido".

## Después de cambiar la app

Cada vez que cambies código hay que volver a copiar la web al proyecto Android y recompilar:

```bash
npm run android:sync
```

Luego genera de nuevo el APK con la opción A o B. Al instalarlo encima del anterior **se conservan** los sets de fichas y la configuración.

## Icono

El icono sale de `assets/logo.svg`. Si lo cambias, conviértelo a `assets/logo.png` (1024×1024) y ejecuta:

```bash
npm run android:icons
```
