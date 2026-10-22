import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBra } from "../src/bra.js";

const xmlBulletin = readFileSync(
    new URL("./fixtures/bra-belledonne.xml", import.meta.url),
    "utf-8"
);

const xmlHorsSaison = `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>
<message><![CDATA[Bulletin avalanche : la saison est terminée sur le massif Belledonne, rendez-vous début novembre.]]></message>`;

function simulerApi(corps: string, statut = 200) {
    const fetchSimule = vi.fn().mockResolvedValue(new Response(corps, { status: statut }));
    vi.stubGlobal("fetch", fetchSimule);
    return fetchSimule;
}

describe("getBra", () => {
    beforeEach(() => {
        vi.stubEnv("METEOFRANCE_API_KEY", "cle-de-test");
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
    });

    it("détecte le message hors saison", async () => {
        simulerApi(xmlHorsSaison);
        const resultat = await getBra(8);
        expect(resultat.statut).toBe("hors_saison");
        if (resultat.statut === "hors_saison") {
            expect(resultat.message).toContain("saison est terminée");
        }
    });

    it("renvoie le XML d'un vrai bulletin", async () => {
        simulerApi(xmlBulletin);
        const resultat = await getBra(8);
        expect(resultat.statut).toBe("bulletin");
    });

    it("appelle l'API avec le bon massif et la clé dans l'en-tête", async () => {
        const fetchSimule = simulerApi(xmlBulletin);
        await getBra(14);
        expect(fetchSimule).toHaveBeenCalledWith(
            expect.stringContaining("id-massif=14"),
            expect.objectContaining({
                headers: expect.objectContaining({ apikey: "cle-de-test" }),
            })
        );
    });

    it("lève une erreur si l'API répond 401", async () => {
        simulerApi("", 401);
        await expect(getBra(8)).rejects.toThrow("401");
    });

    it("lève une erreur si la clé d'API est absente", async () => {
        vi.stubEnv("METEOFRANCE_API_KEY", "");
        simulerApi(xmlBulletin);
        await expect(getBra(8)).rejects.toThrow("METEOFRANCE_API_KEY");
    });
});