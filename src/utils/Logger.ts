import chalk from "chalk";
import { Client } from "discord.js";

export interface LoggerOptions {
    prefix?: string;
    defaultColor?: string;
}

export class Logger {
    /**
     * The client that instantiated this logger.
     * @type {Client}
     */
    public client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    log(message: string | string[], options: LoggerOptions = {
        prefix: "BOT"
    }): void {
        const bgColor = BACKGROUND_COLORS[options.defaultColor ?? "info"];
        let toLogMessage = "";

        // Build the message (easier to read)
        let dateMessage = new Intl.DateTimeFormat("en-US", { dateStyle: "short", timeStyle: "long" }).format(new Date());
        toLogMessage += chalk.hex("#474747").italic(dateMessage);
        toLogMessage += "  ";

        if (options.prefix !== undefined) {
            toLogMessage += chalk.bold.white(options.prefix);
            toLogMessage += "  ";
        }

        // Add the prefix.
        toLogMessage += bgColor.bold.hex("#FFFFFF")(` ${(options.defaultColor ?? "info").toUpperCase()} `);

        if (Array.isArray(message)) {
            // Get the total length of the current message.
            let length = dateMessage.length + ((options.defaultColor ?? "info").length + 2) + 2;

            if (options.prefix !== undefined) {
                length += ((options!.prefix.length ?? 0) + 2);
            }

            message.forEach((m, i) => {
                if (i == 0) {
                    toLogMessage += ` ${m}`;
                } else {
                    toLogMessage += `\n${"".padStart(length)} ${m}`;
                }
            })
        } else {
            toLogMessage += ` ${message}`;
        }

        // Log the message.
        console.log(toLogMessage);
    }

    error(message: string | string[], options: LoggerOptions = {}): void {
        this.log(message, { ...options, defaultColor: "error" });
    }

    warn(message: string | string[], options: LoggerOptions = {}): void {
        this.log(message, { ...options, defaultColor: "warn" });
    }

    info(message: string | string[], options: LoggerOptions = {}): void {
        this.log(message, { ...options, defaultColor: "info" });
    }

    debug(message: string | string[], options: LoggerOptions = {}): void {
        this.log(message, { ...options, defaultColor: "debug" });
    }
}

export const COLORS: Record<string, ReturnType<typeof chalk["hex"]>> = {
    info: chalk.hex("#A0B6FE"),
    error: chalk.hex("#F99494"),
    warning: chalk.hex("#C4C28A"),
    debug: chalk.hex("#B5B5B4"),
};
export const BACKGROUND_COLORS: Record<string, ReturnType<typeof chalk["hex"]>> = {
    info: chalk.bgHex("#A0B6FE"),
    error: chalk.bgHex("#F99494"),
    warning: chalk.bgHex("#C4C28A"),
    debug: chalk.bgHex("#B5B5B4"),
};