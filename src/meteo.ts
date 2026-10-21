import type { Sommet } from "./sommets.js";

interface ReponseOpenMeteo {
    current: {
        time: string;
        temperature_2m: number;
        wind_speed_10m: number;
        wind_gusts_10m: number;
        cloud_cover: number;
        weather_code: number;
        freezing_level_height: number;
    };
}

export interface MeteoSommet {
    sommet: string;
    heure: string;
    temperature: number;
    vent: number;
    rafales: number;
    nuages: number;
    codeMeteo: number;
    isotherme0: number;
}

export async function getMeteoSommet(sommet: Sommet): Promise<MeteoSommet> {
    const params = new URLSearchParams({
        latitude: String(sommet.latitude),
        longitude: String(sommet.longitude),
        elevation: String(sommet.altitude),
        current:
            "temperature_2m,wind_speed_10m,wind_gusts_10m,cloud_cover,weather_code,freezing_level_height",
        timezone: "auto",
    });

    const reponse = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!reponse.ok) {
        throw new Error(`Open-Meteo a répondu avec le statut ${reponse.status}`);
    }

    const data = (await reponse.json()) as ReponseOpenMeteo;
    const c = data.current;

    return {
        sommet: sommet.nom,
        heure: c.time,
        temperature: c.temperature_2m,
        vent: c.wind_speed_10m,
        rafales: c.wind_gusts_10m,
        nuages: c.cloud_cover,
        codeMeteo: c.weather_code,
        isotherme0: c.freezing_level_height,
    };
}