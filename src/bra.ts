import { XMLParser } from "fast-xml-parser";

export type ResultatBra =
    | { statut: "hors_saison"; message: string }
    | { statut: "bulletin"; xml: string };

export async function getBra(idMassif: number): Promise<ResultatBra> {
    const cle = process.env.METEOFRANCE_API_KEY;
    if (!cle) throw new Error("METEOFRANCE_API_KEY manquante");

    const url = `https://public-api.meteofrance.fr/public/DPBRA/v1/massif/BRA?id-massif=${idMassif}&format=xml`;
    const reponse = await fetch(url, { headers: { apikey: cle, accept: "*/*" } });
    if (!reponse.ok) {
        throw new Error(`Météo-France a répondu avec le statut ${reponse.status}`);
    }

    const xml = await reponse.text();
    const data = new XMLParser().parse(xml);

    // Hors saison renvoie d'un xml message
    if (typeof data.message === "string") {
        return { statut: "hors_saison", message: data.message.trim() };
    }

    return { statut: "bulletin", xml };
}