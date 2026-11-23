"use client";

export interface Weather {
  temp: number; humidity: number; wind: number; code: number; condition: string; rainProb: number; updatedAt?: Date;
}

export function condition(code: number): string {
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

const KEY = "weather-cache";
const TTL = 30 * 60_000;

/** Sin Cloud Functions: el navegador pide el clima a Open-Meteo y lo guarda 30 min (sirve sin señal). */
export async function fetchWeather(): Promise<Weather | null> {
  let cached: (Weather & { at: number }) | null = null;
  try { cached = JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { /* sin caché */ }
  if (cached && Date.now() - cached.at < TTL) return { ...cached, updatedAt: new Date(cached.at) };
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude: "19.1175", longitude: "-70.6364",
      current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
      hourly: "precipitation_probability", forecast_hours: "3",
      wind_speed_unit: "kmh", timezone: "America/Santo_Domingo",
    }).toString();
    const j = await (await fetch(url)).json();
    const w: Weather = {
      temp: Math.round(j.current.temperature_2m),
      humidity: Math.round(j.current.relative_humidity_2m),
      wind: Math.round(j.current.wind_speed_10m),
      code: j.current.weather_code,
      condition: condition(j.current.weather_code),
      rainProb: Math.max(...(j.hourly.precipitation_probability as number[]).map((p) => p ?? 0)),
    };
    const at = Date.now();
    localStorage.setItem(KEY, JSON.stringify({ ...w, at }));
    return { ...w, updatedAt: new Date(at) };
  } catch {
    return cached ? { ...cached, updatedAt: new Date(cached.at) } : null;
  }
}
