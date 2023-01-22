import { Elesis } from "../Elesis";
import { ModuleManager } from "./ModuleManager";

export type Event = (client: Elesis, ...args: any[]) => void;

export class EventManager extends ModuleManager<Event> {
    constructor(client: Elesis) {
        super(client);
    }
    
    async load(key: string, filePath: string): Promise<void>  {
        const event: Event = (await import(filePath)).default;

        // Handle the event.
        this.client.on(key, async(...args: any[]) => await event(this.client, ...args));
    }
}