import path from "node:path";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { SOMMETS, trouverSommet } from "./sommets.js";
import { getMeteoSommet, getPrevisionSommet } from "./meteo.js";
import { MASSIFS, trouverMassif } from "./massifs.js";
import { getBra } from "./bra.js";
import { parseBra } from "./bra-parser.js";
import { formaterBulletin } from "./bra-format.js";

// Charge le .env situé à la racine du projet
try {
    process.loadEnvFile(path.join(import.meta.dirname, "..", ".env"));
} catch {

}

const server = new McpServer({ name: "mcp-montagne", version: "1.0.0" });

server.registerTool(
    "meteo_sommet",
    {
        description:
            "Donne la météo à l'altitude d'un sommet de randonnée. Sans paramètre jour : conditions actuelles (température, vent, rafales, nuages, isotherme 0 °C). Avec jour (0 = aujourd'hui, 1 = demain, 2 = après-demain, 3 = dans trois jours) : prévision de la journée avec un résumé et des créneaux de 6 h à 18 h.",
        inputSchema: z.object({
            sommet: z.string().describe("Nom du sommet, par exemple Chamechaude"),
            jour: z
                .number()
                .int()
                .min(0)
                .max(3)
                .optional()
                .describe("Jour de la prévision : 0 aujourd'hui, 1 demain, 2 après-demain, 3 dans trois jours"),
        }),
    },
    async ({ sommet, jour }) => {
        const trouve = trouverSommet(sommet);
        if (!trouve) {
            const connus = SOMMETS.map((s) => s.nom).join(", ");
            return {
                content: [
                    { type: "text", text: `Sommet inconnu : ${sommet}. Sommets disponibles : ${connus}.` },
                ],
                isError: true,
            };
        }

        try {
            const donnees =
                jour === undefined
                    ? await getMeteoSommet(trouve)
                    : await getPrevisionSommet(trouve, jour);
            const texte =
                JSON.stringify(donnees, null, 2) + "\n\nSource : Weather data by Open-Meteo.com";
            return { content: [{ type: "text", text: texte }] };
        } catch (erreur) {
            const message = erreur instanceof Error ? erreur.message : "erreur inconnue";
            return {
                content: [{ type: "text", text: `Impossible de récupérer la météo : ${message}` }],
                isError: true,
            };
        }
    }
);

server.registerTool(
    "bulletin_avalanche",
    {
        description:
            "Donne le bulletin d'estimation du risque d'avalanche (BRA, Météo-France) d'un massif. Hors saison (de juin à début novembre), indique qu'aucun bulletin n'est publié.",
        inputSchema: z.object({
            massif: z.string().describe("Nom du massif, par exemple Belledonne"),
        }),
    },
    async ({ massif }) => {
        const trouve = trouverMassif(massif);
        if (!trouve) {
            const connus = MASSIFS.map((m) => m.nom).join(", ");
            return {
                content: [
                    { type: "text", text: `Massif inconnu : ${massif}. Massifs disponibles : ${connus}.` },
                ],
                isError: true,
            };
        }

        try {
            const resultat = await getBra(trouve.id);

            if (resultat.statut === "hors_saison") {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Pas de bulletin d'avalanche pour ${trouve.nom} actuellement.\nMessage de Météo-France : ${resultat.message}`,
                        },
                    ],
                };
            }

            const bulletin = parseBra(resultat.xml);
            return { content: [{ type: "text", text: formaterBulletin(bulletin) }] };

        } catch (erreur) {
            const message = erreur instanceof Error ? erreur.message : "erreur inconnue";
            return {
                content: [{ type: "text", text: `Impossible de récupérer le bulletin : ${message}` }],
                isError: true,
            };
        }
    }
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Serveur MCP montagne démarré");
}

main();