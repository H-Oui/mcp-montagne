export interface Massif {
    id: number;
    nom: string;
}

export const MASSIFS: Massif[] = [
    { id: 1, nom: "Chablais" },
    { id: 2, nom: "Aravis" },
    { id: 3, nom: "Mont-Blanc" },
    { id: 4, nom: "Bauges" },
    { id: 5, nom: "Beaufortain" },
    { id: 6, nom: "Haute-Tarentaise" },
    { id: 7, nom: "Chartreuse" },
    { id: 8, nom: "Belledonne" },
    { id: 9, nom: "Maurienne" },
    { id: 10, nom: "Vanoise" },
    { id: 11, nom: "Haute-Maurienne" },
    { id: 12, nom: "Grandes-Rousses" },
    { id: 13, nom: "Thabor" },
    { id: 14, nom: "Vercors" },
    { id: 15, nom: "Oisans" },
    { id: 16, nom: "Pelvoux" },
    { id: 17, nom: "Queyras" },
    { id: 18, nom: "Devoluy" },
    { id: 19, nom: "Champsaur" },
    { id: 20, nom: "Embrunnais Parpaillon" },
    { id: 21, nom: "Ubaye" },
    { id: 22, nom: "Haut-Var Haut-Verdon" },
    { id: 23, nom: "Mercantour" },
];

function normaliser(texte: string): string {
    return texte
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

export function trouverMassif(nom: string): Massif | undefined {
    const recherche = normaliser(nom);
    return MASSIFS.find((m) => normaliser(m.nom) === recherche);
}