# Jarabacoa Conecta

PWA del Ayuntamiento de Jarabacoa: reportes ciudadanos con foto y GPS (offline-first), mapa público,
guía turística, avisos/clima y panel de gestión. Next.js 16 + Tailwind + Firebase.

## Puesta en marcha
1. `cp .env.example .env.local` y rellena las claves de Firebase (ver comentarios en el archivo).
2. `npm install && npm run dev` → http://localhost:3000 (el service worker solo funciona con `npm run build && npm start`).

## Firebase (plan Blaze requerido para Storage y Functions)
```
npm i -g firebase-tools && firebase login
firebase deploy --only firestore,storage,functions
```
- **Authentication**: activar Anónimo, Google y Correo/contraseña.
- **Cloud Messaging**: generar el par de claves Web Push y ponerlo en `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.
- **App Check**: registrar la app web con reCAPTCHA v3 → `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`. Verifica un tiempo en
  modo "sin imponer" y luego activa la imposición en Firestore y Storage.
- **Primer administrador**: crea tu cuenta en la app y ejecuta
  `GOOGLE_APPLICATION_CREDENTIALS=clave.json node scripts/set-role.mjs correo@x.com admin` (luego cierra sesión y vuelve a entrar).

## Modo gratuito (plan Spark) vs. completo (Blaze)
| | Spark (gratis) | Blaze + Functions |
|---|---|---|
| Fotos | En Firestore (≤ ~500 KB, comprimidas), protegidas por reglas | igual |
| Reporte en el mapa público | Cuando el personal lo revisa y guarda en `/admin` | Automático |
| Notificaciones | Bandeja dentro de la app | + push (FCM) |
| Clima | El navegador lo pide a Open-Meteo | Función cada 30 min + alertas en borrador |
| Antispam / duplicados / reapertura | No | Sí |

Para pasar al modo completo: despliega las funciones y pon `NEXT_PUBLIC_SERVER_FUNCTIONS=true`.

## Funciones (`functions/`) — requieren Blaze
| Función | Qué hace |
|---|---|
| `onReportWritten` | Revisa altas (límite por hora, duplicados), proyecta a `publicReports` (sin foto ni datos personales), notifica y reabre si el ciudadano dice "no quedó resuelto" |
| `onUserTokens` / `onAlertPublished` | Suscribe dispositivos y envía push al publicar un aviso |
| `refreshWeather` | Clima de Open-Meteo cada 30 min y alertas automáticas en **borrador** |

## Privacidad
La foto del ciudadano solo la ven su dueño y el personal. El mapa público muestra un icono "Con foto".
La foto de evidencia del trabajo terminado es pública (transparencia).
