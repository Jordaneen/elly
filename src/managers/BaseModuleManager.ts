import { Collection } from "discord.js";
import { cloneDeep } from "lodash";
import { Elesis } from "../Elesis";

export class BaseModuleManager<I> {
    /**
     * The client that instantiated this manager.
     */
    public client: Elesis;

    /**
     * A collection of all the structures that belong to this manager.
     */
    public cache: Collection<string, I>;

    constructor(client: Elesis) {
        this.client = client;
        this.cache = new Collection<string, I>();
    }
    
    /**
     * Validates whether a structure in the manager exists.
     * @param key The key of the structure to validate.
     */
    has(key: string): boolean {
        return this.cache.has(key);
    }

    /**
     * Gets a structure from this manager.
     * @param key The key of the structure to get.
     */
    get(key: string): I | undefined {
        return this.cache.get(key);
    }

    /**
     * Clones a structure from this manager.
     * @param key The key of the structure to clone.
     */
    clone(key: string): I | undefined {
        return cloneDeep(this.cache.get(key));
    }

}