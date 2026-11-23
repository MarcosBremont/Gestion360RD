import { FieldValue } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db } from "./helpers";

// Centro de Jarabacoa. Datos: Open-Meteo.com (gratis para uso no comercial; citar la fuente).
const LAT = "19.1175";
const LNG = "-70.6364";

// Umbrales para alertas AUTOMÁTICAS. Se crean como BORRADOR: una persona las aprueba antes de enviarse.
const RAIN_3H_MM = 15;
const GUST_KMH = 60;

function condition(code: number): string {
  if (code === 0) return "Despejado";
  if (code <= 2) return "Parcialmente nublado";
  if (code === 3) return "Nublado";
  if (code === 45 || code === 48) return "Niebla";
  if (code >= 51 && code <= 57) return "Llovizna";
  if (code >= 61 && code <= 67) return "Lluvia";
  if (code >= 80 && code <= 82) return "Chubascos";
  if (code >= 95) return "Tormenta eléctrica";
  return "Variable";
}

async function draftOnce(id: string, data: Record<string, unknown>) {
  try {
    await db().doc(`alerts/${id}`).create({ ...data, status: "draft", source: "auto", createdAt: FieldValue.serverTimestamp() });
  } catch (e) {
    if ((e as { code?: number }).code !== 6) throw e; // 6 = ALREADY_EXISTS: ya se propuso hoy
  }
}

export const refreshWeather = onSchedule("every 30 minutes", async () => {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: LAT,
    longitude: LNG,
    current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
    hourly: "precipitation_probability,precipitation,wind_gusts_10m",
    forecast_hours: "6",
    wind_speed_unit: "kmh",
    timezone: "America/Santo_Domingo",
  }).toString();

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const j = await res.json();

  const prob: number[] = j.hourly.precipitation_probability.slice(0, 3);
  const rain3h = (j.hourly.precipitation as number[]).slice(0, 3).reduce((a, b) => a + (b ?? 0), 0);
  const gust = Math.max(...(j.hourly.wind_gusts_10m as number[]));

  await db().doc("weather/current").set({
    temp: Math.round(j.current.temperature_2m),
    humidity: Math.round(j.current.relative_humidity_2m),
    wind: Math.round(j.current.wind_speed_10m),
    code: j.current.weather_code,
    condition: condition(j.current.weather_code),
    rainProb: Math.max(...prob.map((p) => p ?? 0)),
    source: "open-meteo",
    updatedAt: FieldValue.serverTimestamp(),
  });

  const day = new Date().toLocaleDateString("en-CA", { timeZone: "America/Santo_Domingo" }).replaceAll("-", "");
  if (rain3h >= RAIN_3H_MM)
    await draftOnce(`auto-rain-${day}`, {
      title: "Lluvias fuertes previstas",
      body: "Se esperan lluvias intensas en las próximas horas. Evita cruzar ríos y arroyos y ten precaución en zonas de montaña.",
      severity: "warning",
    });
  if (gust >= GUST_KMH)
    await draftOnce(`auto-wind-${day}`, {
      title: "Vientos fuertes previstos",
      body: "Se esperan ráfagas de viento fuertes. Asegura objetos sueltos y evita zonas con árboles o cables caídos.",
      severity: "warning",
    });
});
