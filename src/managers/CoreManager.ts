import { readdirSync, lstatSync } from "fs";
import { join } from "path";
import { Elesis } from "../Elesis";
import { ModuleManager } from "./ModuleManager";
import { CoreScript } from "../structures/CoreScript";

export class CoreManager extends ModuleManager<CoreScript> {
    constructor(client: Elesis) {
        super(client);
    }

    /**
     * Individually loads a structure for this manager.
     * @param path The path of the item.
     */
    async load(key: string): Promise<void> {
        this.cache.set(key, new CoreScript(this.client, key));
    }

    async loadAll(directory: string): Promise<void> {
        // Iterate through the directory for all the possible modules..
        for (const file of readdirSync(directory)) {
            // Get the stats for the path.
            const lstat = lstatSync(join(directory, file));

            // Load the directory, and ONLY directories.
            if (lstat.isDirectory()) {
                await this.load(file);
            }
        }
    }
}