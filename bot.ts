
import { config } from "dotenv";
config();

import { join } from "path";
import { GatewayIntentBits } from "discord.js";
import { Elesis } from "./src/Elesis";

// Create the bot client.
const bot = new Elesis({
    // Temporarily use all intents.
    intents: Object.values(GatewayIntentBits).filter((intent) => typeof intent === "number").reduce(
        (prev, intent) => prev | <number>intent, 0
    ),

    // Elesis-esque options.
    commandsDirectory: join(__dirname, process.env.COMMAND_DIRECTORY ?? "./commands"),
    eventsDirectory: join(__dirname, process.env.EVENT_DIRECTORY ?? "./events"),
    scriptsDirectory: join(__dirname, process.env.SCRIPT_DIRECTORY ??  "./scripts"),
    debugDirectory: join(__dirname, process.env.DEBUG_DIRECTORY ??  "./debug"),
});

// Start the bot.
bot.start(process.env.ELESIS_TOKEN);