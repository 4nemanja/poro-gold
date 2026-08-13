// Registers the /order slash command with Discord. Run once (and again whenever
// command.js changes):  npm run register
//
// If DISCORD_GUILD_ID is set, the command is registered to that single server
// and shows up instantly — use this while developing. Without it, the command is
// registered globally (can take up to ~1 hour to propagate).

import "dotenv/config";
import { REST, Routes } from "discord.js";
import { orderCommand } from "./command.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error("Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);

try {
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [orderCommand] });
    console.log(`Registered /order to guild ${guildId} (instant).`);
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: [orderCommand] });
    console.log("Registered /order globally (may take up to ~1h to appear).");
  }
} catch (err) {
  console.error("Failed to register command:", err);
  process.exit(1);
}
