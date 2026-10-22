import type { Sommet } from "./sommets.js";
import { trouverMassif } from "./massifs.js";
import { getPrevisionSommet, type PrevisionJour } from "./meteo.js";
import { getBra } from "./bra.js";
import { libelleRisque, parseBra, type Bulletin } from "./bra-parser.js";

const joursEntre = (a: string, b: string): number =>
    Math.round(
        (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000
    );

function messageErreur(raison: unknown): string {
    return raison instanceof Error ? raison.message : "erreur inconnue";
}

function formaterMeteo(p: PrevisionJour): string {
    const r = p.resume;
    const l = [
        `Prévision du ${p.date} à l'altitude du sommet :`,
        `- Température : de ${r.temperatureMin} à ${r.temperatureMax} °C`,
        `- Rafales maximales : ${r.rafalesMax} km/h`,
        `- Neige cumulée : ${r.neigeTotaleCm} cm`,
        `- Isotherme 0 °C : de ${r.isotherme0Min} à ${r.isotherme0Max} m`,
    ];
    for (const c of p.creneaux) {
        l.push(
            `- ${c.heure} : ${c.temperature} °C, vent ${c.vent} km/h (rafales ${c.rafales}), ` +
            `nuages ${c.nuages} %, isotherme 0 °C à ${c.isotherme0} m`
        );
    }
    return l.join("\n");
}

function formaterBulletinCourt(
    b: Bulletin,
    sommet: Sommet,
    dateCible: string | undefined
): string {
    const r = b.risque;
    const l: string[] = [];
    const validite = b.valideJusquAu.slice(0, 10);
    const ecart = dateCible ? joursEntre(validite, dateCible) : 0;

    l.push(
        `Bulletin du massif ${b.massif}, rédigé le ${b.redigeLe.slice(0, 16).replace("T", " ")}, ` +
        `valable jusqu'au ${b.valideJusquAu.slice(0, 16).replace("T", " ")}.`
    );

    if (ecart <= 0) {
        l.push(`- Risque maximal : ${r.maximal}/5 (${r.libelleMaximal})`);
        if (r.parAltitude) {
            const a = r.parAltitude;
            const niveau = sommet.altitude > a.altitude ? a.auDessus : a.sous;
            l.push(
                `- Pour les pentes à l'altitude du sommet (${sommet.altitude} m) : ${niveau}/5 (${libelleRisque(niveau)}) ` +
                `(seuil du bulletin : ${a.altitude} m)`
            );
        }
        if (r.pentesDangereuses.length > 0) {
            l.push(`- Orientations les plus dangereuses : ${r.pentesDangereuses.join(", ")}`);
        }
        if (r.resume) l.push(r.resume);
    } else if (ecart === 1 && r.tendanceJ2.maximal !== null) {
        l.push(
            `Ce bulletin ne couvre pas directement ce jour-là. Tendance à J+2 : risque maximal ` +
            `${r.tendanceJ2.maximal}/5 (${libelleRisque(r.tendanceJ2.maximal)}).`
        );
    } else {
        l.push("Ce bulletin ne couvre pas ce jour-là : consulter le prochain bulletin.");
    }

    l.push("Pour le détail complet du bulletin, utiliser l'outil bulletin_avalanche.");
    return l.join("\n");
}

export async function resumeSortie(sommet: Sommet, jour: number): Promise<string> {
    const massif = trouverMassif(sommet.massif);

    const [meteo, bra] = await Promise.allSettled([
        getPrevisionSommet(sommet, jour),
        massif
            ? getBra(massif.id)
            : Promise.reject(new Error(`massif « ${sommet.massif} » absent de la liste des bulletins`)),
    ]);

    if (meteo.status === "rejected" && bra.status === "rejected") {
        throw new Error(
            `météo (${messageErreur(meteo.reason)}) et bulletin (${messageErreur(bra.reason)}) indisponibles`
        );
    }

    const dateCible = meteo.status === "fulfilled" ? meteo.value.date : undefined;
    const l: string[] = [];

    l.push(`SYNTHÈSE POUR ${sommet.nom} (${sommet.altitude} m, massif ${sommet.massif})`);
    l.push("");
    l.push("MÉTÉO");
    l.push(
        meteo.status === "fulfilled"
            ? formaterMeteo(meteo.value)
            : `Météo indisponible : ${messageErreur(meteo.reason)}`
    );
    l.push("");
    l.push("RISQUE D'AVALANCHE");

    if (bra.status === "rejected") {
        l.push(`Bulletin indisponible : ${messageErreur(bra.reason)}`);
    } else if (bra.value.statut === "hors_saison") {
        l.push(`Pas de bulletin d'avalanche actuellement. Message de Météo-France : ${bra.value.message}`);
        l.push(
            "Attention : l'absence de bulletin ne signifie pas l'absence de risque. Ne pas en déduire que la sortie est sans danger, et évaluer l'enneigement réel sur place."
        );
    } else {
        try {
            l.push(formaterBulletinCourt(parseBra(bra.value.xml), sommet, dateCible));
        } catch (erreur) {
            l.push(`Bulletin reçu mais illisible : ${messageErreur(erreur)}`);
        }
    }

    l.push("");
    l.push(
        "Cette synthèse est indicative et ne remplace ni le bulletin officiel de Météo-France, ni le jugement sur le terrain."
    );
    l.push("Sources : Météo-France (Licence Ouverte 2.0) ; Weather data by Open-Meteo.com");

    return l.join("\n");
}