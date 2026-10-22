import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { libelleRisque, parseBra } from "../src/bra-parser.js";
import { formaterBulletin } from "../src/bra-format.js";

const xml = readFileSync(
    new URL("./fixtures/bra-belledonne.xml", import.meta.url),
    "utf-8"
);
const bulletin = parseBra(xml);

describe("libelleRisque", () => {
    it("traduit les niveaux 1 à 5 en français", () => {
        expect(libelleRisque(1)).toBe("faible");
        expect(libelleRisque(3)).toBe("marqué");
        expect(libelleRisque(5)).toBe("très fort");
    });

    it("renvoie « inconnu » pour un niveau invalide", () => {
        expect(libelleRisque(9)).toBe("inconnu");
    });
});

describe("parseBra", () => {
    it("lit le massif et sa date de rédaction", () => {
        expect(bulletin.massif).toBe("Belledonne");
        expect(bulletin.idMassif).toBe(8);
        expect(bulletin.redigeLe).toBe("2026-02-01T16:00:00");
    });

    it("lit le risque maximal et sa répartition par altitude", () => {
        expect(bulletin.risque.maximal).toBe(3);
        expect(bulletin.risque.libelleMaximal).toBe("marqué");
        expect(bulletin.risque.parAltitude).toEqual({
            altitude: 1500,
            sous: 2,
            auDessus: 3,
        });
    });

    it("liste les orientations de pentes dangereuses", () => {
        expect(bulletin.risque.pentesDangereuses).toEqual(["N", "NE", "E", "W", "NW"]);
    });

    it("lit la tendance à J+2", () => {
        expect(bulletin.risque.tendanceJ2.maximal).toBe(3);
    });

    it("lit l'enneigement et la neige fraîche", () => {
        expect(bulletin.enneigement?.niveaux).toHaveLength(3);
        expect(bulletin.neigeFraiche?.jours).toHaveLength(6);
        expect(bulletin.neigeFraiche?.jours[0]).toEqual({
            date: "2026-01-28T00:00:00",
            min: 10,
            max: 20,
        });
    });

    it("convertit les valeurs -1 en null dans l'aperçu météo", () => {
        const echeances = bulletin.meteo?.echeances ?? [];
        expect(echeances).toHaveLength(4);
        expect(echeances[0].limitePluieNeige).toBeNull();
        expect(echeances[0].merDeNuages).toBeNull();
        expect(echeances[3].limitePluieNeige).toBe(1800);
    });

    it("refuse un XML qui n'est pas un bulletin", () => {
        expect(() => parseBra("<autre/>")).toThrow("BULLETINS_NEIGE_AVALANCHE");
    });
});

describe("formaterBulletin", () => {
    const texte = formaterBulletin(bulletin);

    it("contient le risque maximal et le massif", () => {
        expect(texte).toContain("massif Belledonne");
        expect(texte).toContain("RISQUE MAXIMAL : 3/5 (marqué)");
    });

    it("contient le rappel de sécurité et la source", () => {
        expect(texte).toContain("ne remplace pas le bulletin officiel");
        expect(texte).toContain("Météo-France");
    });

    it("ne contient aucune valeur manquante", () => {
        expect(texte).not.toContain("undefined");
        expect(texte).not.toContain("NaN");
    });
});