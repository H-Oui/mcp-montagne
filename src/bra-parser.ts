import { XMLParser } from "fast-xml-parser";

const LIBELLES = ["", "faible", "limité", "marqué", "fort", "très fort"];
export const libelleRisque = (n: number): string => LIBELLES[n] ?? "inconnu";

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseAttributeValue: true,
    isArray: (nom) => ["ECHEANCE", "NIVEAU", "NEIGE24H"].includes(nom),
});

const vrai = (v: unknown): boolean => v === true || v === "true";
const nombre = (v: unknown): number | null => (typeof v === "number" ? v : null);

export interface Vent {
    vitesse: number;
    direction: string;
}

export interface Echeance {
    date: string;
    ventBas: Vent;
    ventHaut: Vent;
    isotherme0: number;
    limitePluieNeige: number | null;
    tempsSensible: number;
    merDeNuages: number | null;
}

export interface Bulletin {
    massif: string;
    idMassif: number;
    redigeLe: string;
    valideJusquAu: string;
    risque: {
        maximal: number;
        libelleMaximal: string;
        parAltitude: { altitude: number; sous: number; auDessus: number } | null;
        commentaire: string;
        pentesDangereuses: string[];
        tendanceJ2: { maximal: number | null; libelle: string; commentaire: string };
        resume: string;
    };
    stabilite: { titre: string; texte: string };
    qualiteNeige: string;
    enneigement: {
        date: string;
        limiteSud: number;
        limiteNord: number;
        niveaux: { altitude: number; nord: number; sud: number }[];
    } | null;
    neigeFraiche: {
        altitudeMesure: number;
        jours: { date: string; min: number; max: number }[];
    } | null;
    meteo: {
        commentaire: string;
        altitudeVentBas: number;
        altitudeVentHaut: number;
        echeances: Echeance[];
    } | null;
}

export function parseBra(xml: string): Bulletin {
    const racine = parser.parse(xml).BULLETINS_NEIGE_AVALANCHE;
    if (!racine) {
        throw new Error("XML inattendu : balise BULLETINS_NEIGE_AVALANCHE introuvable");
    }

    const cartouche = racine.CARTOUCHERISQUE;
    const r = cartouche.RISQUE;
    const altitude = nombre(r["@_ALTITUDE"]);
    const risque1 = nombre(r["@_RISQUE1"]);
    const risque2 = nombre(r["@_RISQUE2"]);
    const pente = cartouche.PENTE ?? {};
    const orientations = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"].filter((o) =>
        vrai(pente[`@_${o}`])
    );

    const e = racine.ENNEIGEMENT;
    const nf = racine.NEIGEFRAICHE;
    const m = racine.METEO;

    return {
        massif: racine["@_MASSIF"],
        idMassif: racine["@_ID"],
        redigeLe: racine["@_DATEBULLETIN"],
        valideJusquAu: racine["@_DATEVALIDITE"],
        risque: {
            maximal: r["@_RISQUEMAXI"],
            libelleMaximal: libelleRisque(r["@_RISQUEMAXI"]),
            parAltitude:
                altitude !== null && risque1 !== null && risque2 !== null
                    ? { altitude, sous: risque1, auDessus: risque2 }
                    : null,
            commentaire: r["@_COMMENTAIRE"] ?? "",
            pentesDangereuses: orientations,
            tendanceJ2: {
                maximal: nombre(r["@_RISQUEMAXIJ2"]),
                libelle: cartouche.RisqueJ2 ?? "",
                commentaire: cartouche.CommentaireRisqueJ2 ?? "",
            },
            resume: cartouche.RESUME ?? "",
        },
        stabilite: {
            titre: racine.STABILITE?.TITRE ?? "",
            texte: racine.STABILITE?.TEXTESANSTITRE ?? racine.STABILITE?.TEXTE ?? "",
        },
        qualiteNeige: racine.QUALITE?.TEXTE ?? "",
        enneigement: e
            ? {
                date: e["@_DATE"],
                limiteSud: e["@_LimiteSud"],
                limiteNord: e["@_LimiteNord"],
                niveaux: (e.NIVEAU ?? []).map((n: any) => ({
                    altitude: n["@_ALTI"],
                    nord: n["@_N"],
                    sud: n["@_S"],
                })),
            }
            : null,
        neigeFraiche: nf
            ? {
                altitudeMesure: nf["@_ALTITUDESS"],
                jours: (nf.NEIGE24H ?? []).map((j: any) => ({
                    date: j["@_DATE"],
                    min: j["@_SS24Min"],
                    max: j["@_SS24Max"],
                })),
            }
            : null,
        meteo: m
            ? {
                commentaire: m.COMMENTAIRE ?? "",
                altitudeVentBas: m["@_ALTITUDEVENT1"],
                altitudeVentHaut: m["@_ALTITUDEVENT2"],
                echeances: (m.ECHEANCE ?? []).map((x: any) => ({
                    date: x["@_DATE"],
                    ventBas: { vitesse: x["@_FF1"], direction: String(x["@_DD1"]) },
                    ventHaut: { vitesse: x["@_FF2"], direction: String(x["@_DD2"]) },
                    isotherme0: x["@_ISO0"],
                    limitePluieNeige: x["@_PLUIENEIGE"] === -1 ? null : x["@_PLUIENEIGE"],
                    tempsSensible: x["@_TEMPSSENSIBLE"],
                    merDeNuages: x["@_MERNUAGES"] === -1 ? null : x["@_MERNUAGES"],
                })),
            }
            : null,
    };
}