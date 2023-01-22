import { Client, IntentsBitField, Routes, SlashCommandBuilder } from "discord.js";
import { REST } from "@discordjs/rest";
import { CommandManager } from "./managers/CommandManager";
import { EventManager } from "./managers/EventManager";
import { ElesisOptions } from "./utils/ElesisOptions";
import { Logger } from "./utils/Logger";
import { CoreManager } from "./managers/CoreManager";

export class Elesis extends Client {
    /**
     * The manager for all the commands this bot has to offer.
     */
    public commands: CommandManager;
    public events: EventManager;
    public scripts: CoreManager;
    public logger: Logger;

    public options: Omit<ElesisOptions, 'intents'> & { intents: IntentsBitField };

    constructor(options: ElesisOptions) {
        super(options);

        // Adjust options
        this.options = {
            ...options,
            intents: new IntentsBitField(options.intents)
        };

        this.commands = new CommandManager(this);
        this.events = new EventManager(this);
        this.scripts = new CoreManager(this);
        this.logger = new Logger(this);
    }

    async start(token?: string): Promise<string> {
        const slashCommands = []; 
        
        // Handle all the commands and events first.
        await this.commands.loadAll(this.options.commandsDirectory);
        await this.events.loadAll(this.options.eventsDirectory);
        await this.scripts.loadAll(this.options.scriptsDirectory);

        // Build all commands.
        for (const command of this.commands.cache.values()) {
            const slashBuilder = command.build(new SlashCommandBuilder());
            slashBuilder.setName(command.label.toLowerCase());
            slashBuilder.setDescription(command.description);

            // Add the command to the array.
            slashCommands.push(slashBuilder.toJSON());
        }

        // Start the client.
        const resp = await this.login(token);

        // Register all the commands.
        await new REST({ version: "9" }).setToken(token || "").put(
            Routes.applicationCommands(this.user?.id || ""),
            { body: slashCommands },
        );

        // Return the response of the login.
        return resp;
    }
}