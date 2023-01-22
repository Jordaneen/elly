import { ClientOptions } from "discord.js";

export interface ElesisOptions extends ClientOptions {
    commandsDirectory: string;
    eventsDirectory: string;
    scriptsDirectory: string;
    debugDirectory: string;
}