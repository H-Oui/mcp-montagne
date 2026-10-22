import { libelleRisque, type Bulletin } from "./bra-parser.js";

const dateHeure = (iso: string) => iso.slice(0, 16).replace("T", " ");

export function formaterBulletin(b: Bulletin): string {
    const l: string[] = [];
    const r = b.risque;

    l.push(`Bulletin d'estimation du risque d'avalanche, massif ${b.massif}`);
    l.push(`Rédigé le ${dateHeure(b.redigeLe)}, valable jusqu'au ${dateHeure(b.valideJusquAu)}.`);
    l.push("");
    l.push(`RISQUE MAXIMAL : ${r.maximal}/5 (${r.libelleMaximal})`);
    if (r.parAltitude) {
        const a = r.parAltitude;
        l.push(`- Sous ${a.altitude} m : ${a.sous}/5 (${libelleRisque(a.sous)})`);
        l.push(`- Au-dessus de ${a.altitude} m : ${a.auDessus}/5 (${libelleRisque(a.auDessus)})`);
    }
    if (r.commentaire) l.push(r.commentaire);
    if (r.pentesDangereuses.length > 0) {
        l.push(`Orientations de pentes les plus dangereuses : ${r.pentesDangereuses.join(", ")}`);
    }
    if (r.resume) {
        l.push("");
        l.push(r.resume);
    }

    if (r.tendanceJ2.maximal !== null) {
        l.push("");
        l.push(
            `TENDANCE À J+2 : risque maximal ${r.tendanceJ2.maximal}/5 (${libelleRisque(r.tendanceJ2.maximal)})`
        );
        if (r.tendanceJ2.commentaire) l.push(r.tendanceJ2.commentaire);
    }

    if (b.stabilite.texte) {
        l.push("");
        l.push("STABILITÉ DU MANTEAU NEIGEUX");
        if (b.stabilite.titre) l.push(b.stabilite.titre);
        l.push(b.stabilite.texte);
    }

    if (b.qualiteNeige) {
        l.push("");
        l.push("QUALITÉ DE LA NEIGE");
        l.push(b.qualiteNeige);
    }

    if (b.enneigement) {
        const e = b.enneigement;
        l.push("");
        l.push(
            `ENNEIGEMENT (continu à partir de ${e.limiteNord} m au nord, ${e.limiteSud} m au sud)`
        );
        for (const n of e.niveaux) {
            l.push(`- ${n.altitude} m : ${n.nord} cm au nord, ${n.sud} cm au sud`);
        }
    }

    if (b.neigeFraiche) {
        l.push("");
        l.push(`NEIGE FRAÎCHE EN 24 H (mesurée à ${b.neigeFraiche.altitudeMesure} m)`);
        for (const j of b.neigeFraiche.jours) {
            l.push(`- ${j.date.slice(0, 10)} : ${j.min} à ${j.max} cm`);
        }
    }

    if (b.meteo) {
        const m = b.meteo;
        l.push("");
        l.push("APERÇU MÉTÉO");
        if (m.commentaire) l.push(m.commentaire);
        for (const x of m.echeances) {
            let ligne =
                `- ${dateHeure(x.date)} : isotherme 0 °C à ${x.isotherme0} m, ` +
                `vent ${x.ventBas.vitesse} km/h ${x.ventBas.direction} à ${m.altitudeVentBas} m, ` +
                `${x.ventHaut.vitesse} km/h ${x.ventHaut.direction} à ${m.altitudeVentHaut} m`;
            if (x.limitePluieNeige !== null) ligne += `, limite pluie-neige ${x.limitePluieNeige} m`;
            if (x.merDeNuages !== null) ligne += `, mer de nuages vers ${x.merDeNuages} m`;
            l.push(ligne);
        }
    }

    l.push("");
    l.push(
        "Ce résumé ne remplace pas le bulletin officiel de Météo-France (rubrique Météo Montagne de son site) ni le jugement sur le terrain : consulte toujours le bulletin complet avant de partir."
    );
    l.push("Source : Météo-France, Licence Ouverte 2.0.");

    return l.join("\n");
}