import { join } from "path";
import { lstatSync, readdirSync } from "fs";
import { Elesis } from "../Elesis";
import { BaseModuleManager } from "./BaseModuleManager";

/**
 * A basic manager for handling all things related to a single type of structure as modules.
 */
export class ModuleManager<I> extends BaseModuleManager<I> {
    constructor(client: Elesis) {
        super(client);
    }

    /**
     * Individually loads a structure for this manager.
     * @param path The path of the item.
     */
    async load(key: string, filePath: string): Promise<void> {
        const module: I = await import(filePath);

        // Add the module to the cache.
        this.cache.set(key, module);
    }

    /**
     * Externally loads all the possible structure for this manager.
     * @param directory A directory to load all the structures from.
     */
    async loadAll(directory: string): Promise<void> {
        // Iterate through the directory for all the possible modules..
        for (const file of readdirSync(directory)) {
            // Get the stats for the path.
            const lstat = lstatSync(join(directory, file));

            if (lstat.isFile()) {
                // This is likely a file, so we'll try to load it.
                await this.load(file.split(".")[0], join(directory, file));
            } else if (lstat.isDirectory()) {
                // This is likely a directory, so we'll try to load all the files in it.
                await this.loadAll(join(directory, file));
            }
        }
    }
}