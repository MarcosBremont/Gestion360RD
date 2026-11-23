import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jarabacoa Conecta",
    short_name: "Jarabacoa",
    description:
      "Reporta incidencias, sigue su solución y descubre Jarabacoa. Funciona sin señal.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "es-DO",
    background_color: "#f6f4ee",
    theme_color: "#1f6b4a",
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
