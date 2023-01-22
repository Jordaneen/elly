import { Elesis } from "../src/Elesis";
import { Util } from "../src/utils/Util";
import { exec } from "child_process";

import edge from "edge-js";
import fs, { existsSync, readFileSync } from "fs";
import sharp from "sharp";
import { join } from "path";
import Tesseract from 'tesseract.js';
import { ActivityType } from "discord.js";
import { cloneDeep, last } from "lodash";

interface GuildMessage {
    text: string
};

var GuildMessagesArray: GuildMessage[] = [];
var LastSentArray: GuildMessage[] = [];

/// FILTERS
const MessageFilters = [
    "] has acquired",
    "] has obtained",
    "] has achieved"
]

/// ALPHABET
const alpha = Array.from(Array(26)).map((_, i) => i + 65);
const alphabet = [
    // Alphanumeric Characters
    ...alpha.map((x) => String.fromCharCode(x)),
    ...alpha.map((x) => String.fromCharCode(x).toLowerCase()),
    ...Array(10).keys(),

    // Acceptable Special Characters
    "[",
    "]",
    ".",
    "-",
    "!",
    "*",
    "(",
    ")",
    " ",
    ":",
    "♡",
    "_"
];

export default async (client: Elesis) => {
    if (process.platform !== "win32") {
        // This is not a windows platform.
        // As we use Windows APIs and .NET scripts, this is compatible on nothing *but* Windows.
        // Edge.js (the .NET handler) does support Mac and etc, however we use Windows APIs.
        client.logger.error("This bot is not running on a Windows platform, so it cannot work at all.", {
            prefix: "PROGRAM"
        });

        // Exit the program.
        return process.exit(-1);
    }

    // Whether the bot is initialized.
    let INITIALIZED = false;

    // Set the status for Elesis.
    client.user?.setPresence({
        status: "online",
        activities: [{
            name: process.env.ELESIS_STATUS,
            type: ActivityType.Playing
        }]
    });

    // Create the debug folder if it doesn't exist.
    if (!existsSync(client.options.debugDirectory)) {
        client.logger.info("The debug directory doesn't exist, so it shall be created.", {
            prefix: "PROGRAM"
        });

        fs.mkdirSync(client.options.debugDirectory);
    }

    // Check if the Elsword process is open.
    exec("tasklist", async (_, stdout) => {
        if (stdout.includes("x2.exe")) {
            client.logger.info("The Elsword process is currently running.", {
                prefix: "PROGRAM"
            });
        } else {
            client.logger.error("Elsword is currently not running properly, so please open it before trying to use this bot!", {
                prefix: "PROGRAM"
            });

            // Exit the program.
            return process.exit(-1);
        }

        // The bot is currently ready.
        client.logger.log("Ready!");

        const result = fs.readFileSync(join(client.options.debugDirectory, "/screenshot.png"));

        // get the screenshot function
        let es = client.scripts.get("ElesisScreen");
        let screenshotWindow = es!.func("ElesisScreen.Main", "CaptureWindow");

        // now
        setInterval(() => {
            screenshotWindow("x2", async (error, result) => {
                if (error) {
                    let message: string[] = [];
                    message.push("Couldn't screenshot Elsword, because an error within the C# Library has occured.");

                    message = [...message, error.message, ...error.stack!.split("\n")];

                    client.logger.error(message, {
                        prefix: "PROGRAM"
                    });

                    return;
                }

                // Process the image.
                const img = await sharp(result as Buffer);
                const metadata = (await img.metadata())!;
                const imgGcd = Util.gcd(metadata.width!, metadata.height!);
                const xGcd = Util.gcd(1280, 720);

                // Assert the screen is at most 1600x900.
                if (metadata.width! < 1600 && metadata.height! < 900) {
                    // I have a 1920x1080 monitor, so it isn't 16:9 on 1920x1080 in windowed,
                    // and Elsword forces the mouse to stay in the window on fullscreen.

                    // I also hate playing in Fullscreen.
                    client.logger.error([
                        "Please do not use a resolution larger than 1600x900 for this program.",
                        "While anything smaller in a 16:9 resolution will be reasonably auto-converted,",
                        "I cannot support anything above 1600x900 for the purposes of being unable to test them."
                    ], {
                        prefix: "PROGRAM"
                    });

                    return
                }

                // Assert the screen is a proper 16:9 screen ratio.
                if ((metadata.width! / imgGcd) !== 16 && (metadata.height! / imgGcd) !== 9) {
                    // This code is made under the circumstance that Elsword is 16:9.
                    client.logger.error([
                        "Elsword is not at a proper and fully visible 16:9 resolution. Please ensure this is the case before restarting the bot!",
                        "If you are sure the game is 16:9, then please make sure all sides of the window are fully visible."
                    ], {
                        prefix: "PROGRAM"
                    });

                    return process.exit(0);
                }

                const practicalGcd = Util.gcd(1600, 900);
                const conversionDivisor = practicalGcd / imgGcd;

                // Get a crop of the Elsword chat under the pretense of 1600x900.
                const crop = {
                    // Calculate the position to cut.
                    left: Math.floor(parseInt(process.env.CHAT_X!) / conversionDivisor),
                    top: Math.floor(parseInt(process.env.CHAT_Y!) / conversionDivisor),

                    // Calculate the height and width of the screenshot.
                    width: Math.floor(parseInt(process.env.CHAT_WIDTH!) / conversionDivisor) + 2,
                    height: Math.floor(parseInt(process.env.CHAT_HEIGHT!) / conversionDivisor) + 1
                };

                // Crop the Elsword chat.
                const chatImgCrop = img.clone().extract(crop)
                const chatImgMetadata = await chatImgCrop.metadata()!;

                // Sharpen the image, and make it more recognizable.
                chatImgCrop.withMetadata({
                    density: 300
                }).sharpen().resize({
                    width: chatImgMetadata.width! * 1.35,
                    kernel: "cubic"
                });
                chatImgCrop.threshold(65);

                // Save it to a file for debugging purposes.
                await chatImgCrop.toFile(join(client.options.debugDirectory, "/chat_screenshot.png"));

                // Read the text in the image.
                const worker = await Tesseract.createWorker();
                await worker.loadLanguage("eng");
                await worker.initialize("eng");
                await worker.setParameters({
                    tessedit_char_whitelist: alphabet.join("")
                });

                const buffer = await chatImgCrop.toBuffer();
                const { data } = await worker.recognize(buffer);

                if (INITIALIZED == false) {
                    // Read the relevant JSON files if they exist.
                    if (existsSync(join(client.options.debugDirectory, "/last_parsed_guildchat.json"))) {
                        GuildMessagesArray = JSON.parse(readFileSync(join(client.options.debugDirectory, "/last_parsed_guildchat.json"), "utf-8"));
                    }

                    if (existsSync(join(client.options.debugDirectory, "/last_sent_guildchat.json"))) {
                        LastSentArray = JSON.parse(readFileSync(join(client.options.debugDirectory, "/last_sent_guildchat.json"), "utf-8"));
                    }

                    // Assign the current text.
                    let newArray: GuildMessage[] = [];
                    let currentMessage: GuildMessage | null = null;
                    for (let line of data.lines) {
                        if (MessageFilters.find(x => line.text.includes(x)) !== null || !line.text.includes(":")) {
                            if (line.text.includes("has logged")) {
                                // append
                                newArray.push({
                                    text: line.text
                                })
                            }

                            if (line.text.endsWith(":\n")) {
                                continue;
                            }

                            if (currentMessage == null && !line.text.includes(":")) {
                                if (line.text.endsWith(":\n")) {
                                    continue;
                                }

                                if (MessageFilters.find(x => line.text.includes(x)) !== null) {
                                    continue;
                                }
                            }
                        }

                        if (line.text.endsWith("-\n")) {
                            if (currentMessage !== null) {
                                // append text
                                currentMessage.text += line.text;
                            } else {
                                currentMessage = {
                                    text: line.text
                                };

                                continue;
                            }
                        } else {
                            if (currentMessage !== null) {
                                // append text, then set it to null
                                currentMessage.text += line.text;

                                newArray.push(currentMessage);
                                currentMessage = null;
                            } else {
                                // add text to array
                                newArray.push({
                                    text: line.text
                                });
                            }
                        }
                    }

                    if (GuildMessagesArray.length == 0) {
                        GuildMessagesArray = newArray;
                    } else {
                        // Merge the current arrays.
                        let duplicateDirectory: ({
                            message: GuildMessage,
                            index: number
                        })[] = [];

                        GuildMessagesArray.forEach((x) => {
                            let messageIndex = newArray.findIndex(y => x.text == y.text);

                            if (messageIndex !== -1) {
                                duplicateDirectory.push({
                                    message: newArray[messageIndex],
                                    index: messageIndex
                                })
                            }
                        });

                        // Filter through the potential duplicates.
                        let noDuplicates: ({
                            message: GuildMessage,
                            index: number
                        })[] = [];
                        let previousIndex = -1;
                        let cutIndex = -1;

                        for (let idx in duplicateDirectory) {
                            let z = noDuplicates.find(x => x.index == duplicateDirectory[idx].index);
                            if (z) {
                                previousIndex = z.index;
                                continue;
                            }

                            let x = duplicateDirectory[idx];
                            if (x.index !== previousIndex + 1) {
                                if (previousIndex == -1) {
                                    // first item
                                    previousIndex = x.index;
                                    continue;
                                }

                                // stop here, this is a duplicate
                                cutIndex = x.index;
                                break;
                            } else {
                                previousIndex = x.index;
                            }
                        }


                        if (cutIndex == -1) {
                            // don't append the new array, they're all likely the same
                        } else {
                            // cut from this index
                            GuildMessagesArray = [...GuildMessagesArray, ...newArray.slice(cutIndex)];
                        }

                        if (GuildMessagesArray.length > 20) {
                            GuildMessagesArray = GuildMessagesArray.slice((GuildMessagesArray.length - 21));
                        }
                    }

                    // Save the array.
                    fs.writeFileSync(join(client.options.debugDirectory, "/last_read_guildchat.json"), JSON.stringify(newArray, null, 4), "utf-8");
                    fs.writeFileSync(join(client.options.debugDirectory, "/last_parsed_guildchat.json"), JSON.stringify(GuildMessagesArray, null, 4), "utf-8");

                    INITIALIZED = true;
                } else {
                    // Assign the current text.
                    let newArray: GuildMessage[] = [];
                    let currentMessage: GuildMessage | null = null;
                    for (let line of data.lines) {
                        if (MessageFilters.find(x => line.text.includes(x)) !== null || !line.text.includes(":")) {
                            if (line.text.includes("has logged")) {
                                // append
                                newArray.push({
                                    text: line.text
                                })
                            }

                            if (line.text.endsWith(":\n")) {
                                continue;
                            }

                            if (currentMessage == null && !line.text.includes(":")) {
                                if (line.text.endsWith(":\n")) {
                                    continue;
                                }

                                if (MessageFilters.find(x => line.text.includes(x)) !== null) {
                                    continue;
                                }
                            }
                        }

                        if (line.text.endsWith("-\n")) {
                            if (currentMessage !== null) {
                                // append text
                                currentMessage.text += line.text;
                            } else {
                                currentMessage = {
                                    text: line.text
                                };

                                continue;
                            }
                        } else {
                            if (currentMessage !== null) {
                                // append text, then set it to null
                                currentMessage.text += line.text;

                                newArray.push(currentMessage);
                                currentMessage = null;
                            } else {
                                // add text to array
                                newArray.push({
                                    text: line.text
                                });
                            }
                        }
                    }

                    // compare the 2 arrays
                    let duplicateDirectory: ({
                        message: GuildMessage,
                        index: number
                    })[] = [];

                    GuildMessagesArray.forEach((x) => {
                        let messageIndex = newArray.findIndex(y => x.text == y.text);

                        if (messageIndex !== -1) {
                            duplicateDirectory.push({
                                message: newArray[messageIndex],
                                index: messageIndex
                            })
                        }
                    });

                    // Filter through the potential duplicates.
                    let noDuplicates: ({
                        message: GuildMessage,
                        index: number
                    })[] = [];
                    let previousIndex = -1;
                    let cutIndex = -1;

                    for (let idx in duplicateDirectory) {
                        let z = noDuplicates.find(x => x.index == duplicateDirectory[idx].index);
                        if (z) {
                            previousIndex = z.index;
                            continue;
                        }

                        let x = duplicateDirectory[idx];
                        if (x.index !== previousIndex + 1) {
                            if (previousIndex == -1) {
                                // first item
                                previousIndex = x.index;
                                continue;
                            }

                            // stop here, this is a duplicate
                            cutIndex = x.index;
                            break;
                        } else {
                            previousIndex = x.index;
                        }
                    }

                    if (cutIndex == -1) {
                        // don't append the new array, they're all likely the same
                        GuildMessagesArray = newArray;
                    } else {
                        // cut from this index
                        GuildMessagesArray = [...GuildMessagesArray, ...newArray.slice(cutIndex)];
                    }

                    if (GuildMessagesArray.length >= 20) {
                        GuildMessagesArray = GuildMessagesArray.slice((GuildMessagesArray.length - 21));
                    }

                    // figure out what what to send, and what not to send.
                    if (LastSentArray.length == 0) {
                        // Send every message in the guild chat.
                        let channel = await client.channels.fetch(process.env.GUILD_CHAT_REDIRECT_CHANNEL!);

                        if (!channel || !channel.isTextBased()) {
                            client.logger.error([
                                "Attempted to post latest guild chat messages to the assigned channel, but it didn't exist, or was not a text-based channel.",
                                "Please provide a valid channel before proceeding!"
                            ], {
                                prefix: "BOT"
                            });

                            return process.exit(-1);
                        }

                        for (let message of GuildMessagesArray) {
                            let txChannel = channel.send(message.text);
                        }

                        // Assign the last sent array.
                        LastSentArray = cloneDeep(GuildMessagesArray);
                    } else {
                        // Compare the two arrays by string similarities.
                        let lastSentToFilter = GuildMessagesArray.filter((x) => {
                            let y = LastSentArray.find(z => Util.similarity(x.text, z.text) >= 0.825);

                            // If their Levenshtein distance is over 0.85, then they're similar *enough*.
                            if (y) {
                                return false;
                            } else {
                                return true;
                            }
                        });

                        if (lastSentToFilter.length == 0) {
                            // Don't send messages.
                            return;
                        } else {
                            LastSentArray = lastSentToFilter;
                        }

                        // Send every message in the guild chat.
                        let channel = await client.channels.fetch(process.env.GUILD_CHAT_REDIRECT_CHANNEL!);

                        if (!channel || !channel.isTextBased()) {
                            client.logger.error([
                                "Attempted to post latest guild chat messages to the assigned channel, but it didn't exist, or was not a text-based channel.",
                                "Please provide a valid channel before proceeding!"
                            ], {
                                prefix: "BOT"
                            });

                            return process.exit(-1);
                        }

                        for (let message of LastSentArray) {
                            let txChannel = channel.send(message.text);
                        }

                        // Assign the last sent array.
                        LastSentArray = cloneDeep(GuildMessagesArray);
                    }

                    // Save the arrays.
                    fs.writeFileSync(join(client.options.debugDirectory, "/last_read_guildchat.json"), JSON.stringify(newArray, null, 4), "utf-8");
                    fs.writeFileSync(join(client.options.debugDirectory, "/last_parsed_guildchat.json"), JSON.stringify(GuildMessagesArray, null, 4), "utf-8");
                    fs.writeFileSync(join(client.options.debugDirectory, "/last_sent_guildchat.json"), JSON.stringify(LastSentArray, null, 4), "utf-8");
                }

                // Save the screenshot to text.
                fs.writeFileSync(join(client.options.debugDirectory, "/screenshot.png"), result as Buffer);
            });
        }, 10000);
    });
};