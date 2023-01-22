import { Command } from "./commands/Command";

/**
 * A category made for commands.
 */
export class CommandCategory {
    /**
     * The name of the category.
     */
    public name: string;

    /**
     * The commands in the category.
    */
    public commands: Command[];

    /**
     * The subcategories within the category.
     */
    public subcategories: CommandCategory[];

    /**
     * The parent of this category.
     */
    public parent?: CommandCategory;

    constructor(name: string, parent?: CommandCategory) {
        this.name = name;
        this.commands = [];
        this.subcategories = [];
        this.parent = parent;
    }
}
