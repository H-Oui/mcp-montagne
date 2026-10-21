import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { SOMMETS, trouverSommet } from "./sommets.js";
import { getMeteoSommet } from "./meteo.js";

const server = new McpServer({ name: "mcp-montagne", version: "1.0.0" });

server.registerTool(
    "meteo_sommet",
    {
        description:
            "Donne la météo actuelle à l'altitude d'un sommet de randonnée : température, vent, rafales, couverture nuageuse et altitude de l'isotherme 0 °C.",
        inputSchema: z.object({
            sommet: z.string().describe("Nom du sommet, par exemple Chamechaude"),
        }),
    },
    async ({ sommet }) => {
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
            const meteo = await getMeteoSommet(trouve);
            const texte =
                JSON.stringify(meteo, null, 2) + "\n\nSource : Weather data by Open-Meteo.com";
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

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Serveur MCP montagne démarré");
}

main();