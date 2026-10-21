export interface Sommet {
    id: string;
    nom: string;
    massif: string;
    latitude: number;
    longitude: number;
    altitude: number; // en mètres
}

export const SOMMETS: Sommet[] = [
    {
        id: "chamechaude",
        nom: "Chamechaude",
        massif: "Chartreuse",
        latitude: 45.29,
        longitude: 5.79,
        altitude: 2082,
    },
    {
        id: "mont_jalla",
        nom: "Mont Jalla",
        massif: "Chartreuse",
        latitude: 45.21,
        longitude: 5.73,
        altitude: 635,
    },
    {
        id: "la_pinea",
        nom: "La Pinéa",
        massif: "Chartreuse",
        latitude: 45.29,
        longitude: 5.70,
        altitude: 1771,
    },
    {
        id: "le_grand_som",
        nom: "Le Grand Som",
        massif: "Chartreuse",
        latitude: 45.36,
        longitude: 5.81,
        altitude: 2026,
    },

// Massif du Vercors
    {
        id: "moucherotte",
        nom: "Le Moucherotte",
        massif: "Vercors",
        latitude: 45.15,
        longitude: 5.64,
        altitude: 1901,
    },
    {
        id: "grand_veymont",
        nom: "Grand Veymont",
        massif: "Vercors",
        latitude: 44.87,
        longitude: 5.55,
        altitude: 2341,
    },
    {
        id: "pic_saint_michel",
        nom: "Pic Saint-Michel",
        massif: "Vercors",
        latitude: 45.10,
        longitude: 5.63,
        altitude: 1966,
    },

// Massif de Belledonne
    {
        id: "croix_de_belledonne",
        nom: "Croix de Belledonne",
        massif: "Belledonne",
        latitude: 45.17,
        longitude: 5.99,
        altitude: 2926,
    },
    {
        id: "grand_colon",
        nom: "Grand Colon",
        massif: "Belledonne",
        latitude: 45.18,
        longitude: 5.91,
        altitude: 2394,
    },
];

function normaliser(texte: string): string {
    return texte
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

export function trouverSommet(nom: string): Sommet | undefined {
    const recherche = normaliser(nom);
    return SOMMETS.find((s) => s.id === recherche || normaliser(s.nom) === recherche);
}