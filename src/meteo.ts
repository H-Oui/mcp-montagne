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
interface ReponseHoraire {
    hourly: {
        time: string[];
        temperature_2m: number[];
        wind_speed_10m: number[];
        wind_gusts_10m: number[];
        cloud_cover: number[];
        precipitation: number[];
        snowfall: number[];
        freezing_level_height: number[];
    };
}

export interface CreneauPrevision {
    heure: string;
    temperature: number;
    vent: number;
    rafales: number;
    nuages: number;
    isotherme0: number;
}

export interface PrevisionJour {
    sommet: string;
    date: string;
    resume: {
        temperatureMin: number;
        temperatureMax: number;
        rafalesMax: number;
        neigeTotaleCm: number;
        isotherme0Min: number;
        isotherme0Max: number;
    };
    creneaux: CreneauPrevision[];
}

const HEURES_AFFICHEES = [6, 9, 12, 15, 18];

export async function getPrevisionSommet(
    sommet: Sommet,
    jour: number
): Promise<PrevisionJour> {
    const params = new URLSearchParams({
        latitude: String(sommet.latitude),
        longitude: String(sommet.longitude),
        elevation: String(sommet.altitude),
        hourly:
            "temperature_2m,wind_speed_10m,wind_gusts_10m,cloud_cover,precipitation,snowfall,freezing_level_height",
        forecast_days: "4",
        timezone: "auto",
    });

    const reponse = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!reponse.ok) {
        throw new Error(`Open-Meteo a répondu avec le statut ${reponse.status}`);
    }

    const h = ((await reponse.json()) as ReponseHoraire).hourly;

    // dates
    const dates = [...new Set(h.time.map((t) => t.slice(0, 10)))];
    const date = dates[jour];
    if (!date) {
        throw new Error(`Pas de prévision disponible pour le jour ${jour}`);
    }

    // heures du jour
    const indices = h.time
        .map((t, i) => (t.startsWith(date) ? i : -1))
        .filter((i) => i >= 0);

    const creneaux = indices
        .filter((i) => HEURES_AFFICHEES.includes(Number(h.time[i].slice(11, 13))))
        .map((i) => ({
            heure: h.time[i].slice(11, 16),
            temperature: h.temperature_2m[i],
            vent: h.wind_speed_10m[i],
            rafales: h.wind_gusts_10m[i],
            nuages: h.cloud_cover[i],
            isotherme0: h.freezing_level_height[i],
        }));

    const temperatures = indices.map((i) => h.temperature_2m[i]);
    const isothermes = indices.map((i) => h.freezing_level_height[i]);
    const neige = indices.reduce((somme, i) => somme + h.snowfall[i], 0);

    return {
        sommet: sommet.nom,
        date,
        resume: {
            temperatureMin: Math.min(...temperatures),
            temperatureMax: Math.max(...temperatures),
            rafalesMax: Math.max(...indices.map((i) => h.wind_gusts_10m[i])),
            neigeTotaleCm: Math.round(neige * 10) / 10,
            isotherme0Min: Math.min(...isothermes),
            isotherme0Max: Math.max(...isothermes),
        },
        creneaux,
    };
}