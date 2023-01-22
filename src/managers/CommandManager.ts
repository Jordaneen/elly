import { join } from "path";
import { lstatSync, readdirSync } from "fs";
import { Elesis } from "../Elesis";
import { BaseModuleManager } from "./BaseModuleManager";
import { CommandCategory } from "../structures/CommandCategory";
import { Command } from "../structures/commands/Command";

export class CommandManager extends BaseModuleManager<Command> {
    constructor(client: Elesis) {
        super(client);
    }

    async load(name: string, filePath: string, category?: CommandCategory): Promise<void> {
        const commandExports = await import(filePath);
        const command = new commandExports[Object.keys(commandExports)[0]]();

        // Set command details.
        command.label = name;

        if (category) {
            // Set the command's category.
            command.category = category;
        }

        // Add the command to the cache.
        this.cache.set(name, command);
    }

    async loadAll(directory: string, category?: CommandCategory): Promise<void> {
        // Iterate through the directory for all the possible commands..
        for (const file of readdirSync(directory)) {
            // Get the stats for the path.
            const lstat = lstatSync(join(directory, file));

            if (lstat.isFile()) {
                // This is likely a file, so we'll try to load it.
                await this.load(file.split(".")[0], join(directory, file), category);
            } else {
                // This is likely a directory, so we'll try to load all the files in it.
                // Create a category for this directory.
                const directoryCategory = new CommandCategory(file, category);

                if (category) {
                    // Set the categories parent
                    directoryCategory.parent = category;

                    // Add the category to the parent's children.
                    category.subcategories.push(directoryCategory);
                }

                // Load all the files.
                await this.loadAll(join(directory, file), directoryCategory);
            }
        }
    }
}