import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resumeSortie } from "../src/synthese.js";
import type { Sommet } from "../src/sommets.js";

const xmlBulletin = readFileSync(
    new URL("./fixtures/bra-belledonne.xml", import.meta.url),
    "utf-8"
);

const xmlHorsSaison = `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>
<message><![CDATA[Bulletin avalanche : la saison est terminée sur le massif Belledonne, rendez-vous début novembre.]]></message>`;


const sommet: Sommet = {
    id: "test",
    nom: "Sommet test",
    massif: "Belledonne",
    latitude: 45.2,
    longitude: 6.0,
    altitude: 2100,
};

// Génère une réponse Open-Meteo sur 4 jours
function meteoJson(premierJour: string): string {
    const time: string[] = [];
    for (let j = 0; j < 4; j++) {
        const d = new Date(`${premierJour}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() + j);
        const date = d.toISOString().slice(0, 10);
        for (let h = 0; h < 24; h++) {
            time.push(`${date}T${String(h).padStart(2, "0")}:00`);
        }
    }
    const rempli = (valeur: number) => time.map(() => valeur);
    return JSON.stringify({
        hourly: {
            time,
            temperature_2m: rempli(-3),
            wind_speed_10m: rempli(5),
            wind_gusts_10m: rempli(30),
            cloud_cover: rempli(95),
            precipitation: rempli(0),
            snowfall: rempli(0.1),
            freezing_level_height: rempli(1800),
        },
    });
}

interface FausseReponse {
    corps: string;
    statut?: number;
}


function simulerReseau(meteo: FausseReponse, bra: FausseReponse) {
    vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string) => {
            const r = url.includes("open-meteo") ? meteo : bra;
            return new Response(r.corps, { status: r.statut ?? 200 });
        })
    );
}

describe("resumeSortie", () => {
    beforeEach(() => {
        vi.stubEnv("METEOFRANCE_API_KEY", "cle-de-test");
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
    });

    it("combine la météo et le message hors saison", async () => {
        simulerReseau({ corps: meteoJson("2026-10-23") }, { corps: xmlHorsSaison });
        const texte = await resumeSortie(sommet, 1);

        expect(texte).toContain("SYNTHÈSE POUR Sommet test (2100 m, massif Belledonne)");
        expect(texte).toContain("Prévision du 2026-10-24");
        expect(texte).toContain("Température : de -3 à -3 °C");
        expect(texte).toContain("Rafales maximales : 30 km/h");
        expect(texte).toContain("Pas de bulletin d'avalanche actuellement");
    });

    it("précise que l'absence de bulletin ne signifie pas l'absence de risque", async () => {
        simulerReseau({ corps: meteoJson("2026-10-23") }, { corps: xmlHorsSaison });
        const texte = await resumeSortie(sommet, 1);
        expect(texte).toContain("ne signifie pas l'absence de risque");
    });

    it("contient toujours le rappel de prudence et les sources", async () => {
        simulerReseau({ corps: meteoJson("2026-10-23") }, { corps: xmlHorsSaison });
        const texte = await resumeSortie(sommet, 1);
        expect(texte).toContain("ne remplace ni le bulletin officiel");
        expect(texte).toContain("Open-Meteo");
    });

    it("utilise le niveau de risque au-dessus du seuil pour un sommet élevé", async () => {
        // Le bulletin est valable le 2026-02-02 : on demande ce jour-là
        simulerReseau({ corps: meteoJson("2026-02-02") }, { corps: xmlBulletin });
        const texte = await resumeSortie(sommet, 0);

        expect(texte).toContain("Risque maximal : 3/5 (marqué)");
        expect(texte).toContain("(2100 m) : 3/5 (marqué)");
    });

    it("utilise le niveau de risque sous le seuil pour un sommet plus bas", async () => {
        simulerReseau({ corps: meteoJson("2026-02-02") }, { corps: xmlBulletin });
        const texte = await resumeSortie({ ...sommet, altitude: 1200 }, 0);

        expect(texte).toContain("(1200 m) : 2/5 (limité)");
    });

    it("donne la tendance à J+2 pour le lendemain de la validité du bulletin", async () => {
        simulerReseau({ corps: meteoJson("2026-02-03") }, { corps: xmlBulletin });
        const texte = await resumeSortie(sommet, 0);

        expect(texte).toContain("Tendance à J+2 : risque maximal 3/5");
        expect(texte).not.toContain("Risque maximal : 3/5 (marqué)");
    });

    it("n'applique pas un ancien bulletin à une date lointaine", async () => {
        simulerReseau({ corps: meteoJson("2026-10-23") }, { corps: xmlBulletin });
        const texte = await resumeSortie(sommet, 1);

        expect(texte).toContain("ne couvre pas ce jour-là");
    });

    it("restitue la météo si le bulletin est indisponible", async () => {
        simulerReseau({ corps: meteoJson("2026-10-23") }, { corps: "", statut: 401 });
        const texte = await resumeSortie(sommet, 1);

        expect(texte).toContain("Prévision du 2026-10-24");
        expect(texte).toContain("Bulletin indisponible");
    });

    it("restitue le bulletin si la météo est indisponible", async () => {
        simulerReseau({ corps: "", statut: 500 }, { corps: xmlHorsSaison });
        const texte = await resumeSortie(sommet, 1);

        expect(texte).toContain("Météo indisponible");
        expect(texte).toContain("Pas de bulletin d'avalanche actuellement");
    });

    it("signale un massif absent de la liste sans faire échouer la météo", async () => {
        simulerReseau({ corps: meteoJson("2026-10-23") }, { corps: xmlHorsSaison });
        const texte = await resumeSortie({ ...sommet, massif: "Inconnu" }, 1);

        expect(texte).toContain("Prévision du 2026-10-24");
        expect(texte).toContain("absent de la liste des bulletins");
    });

    it("lève une erreur si la météo et le bulletin échouent", async () => {
        simulerReseau({ corps: "", statut: 500 }, { corps: "", statut: 401 });

        await expect(resumeSortie(sommet, 1)).rejects.toThrow("indisponibles");
    });
});