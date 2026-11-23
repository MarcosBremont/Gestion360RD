// Asigna un rol (custom claim) a un usuario. Uso:
//   GOOGLE_APPLICATION_CREDENTIALS=/ruta/service-account.json node scripts/set-role.mjs correo@x.com admin
// Roles: admin | editor | brigade | citizen. El usuario debe cerrar sesión y volver a entrar.
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const [email, role] = process.argv.slice(2);
if (!email || !["admin", "editor", "brigade", "citizen"].includes(role)) {
  console.error("Uso: node scripts/set-role.mjs <correo> <admin|editor|brigade|citizen>");
  process.exit(1);
}
initializeApp({ credential: applicationDefault(), projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
const user = await getAuth().getUserByEmail(email);
await getAuth().setCustomUserClaims(user.uid, { role });
console.log(`OK: ${email} (${user.uid}) ahora es "${role}".`);
