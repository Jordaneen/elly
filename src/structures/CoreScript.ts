import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { Elesis } from "../Elesis";
import edge from "edge-js";

const acceptedBinaryTypes = [
    "net6.0",
    "net472"
];

export class CoreScript {
    public client: Elesis;
    public location: string;
    public name: string;
    public output: string;

    constructor(client: Elesis, name: string) {
        this.client = client;
        this.location = join(client.options.scriptsDirectory, `/${name}`);
        this.name = name;

        if (!existsSync(this.location)) {
            throw new ReferenceError(`The C# project ${name} does not exist.`);
        }

        // get the csproj
        let csproj = readFileSync(join(this.location, `/${name}.csproj`), "utf-8");
        let binary = acceptedBinaryTypes.find(x => csproj.includes(`<TargetFramework>${x}</TargetFramework>`));
        if (binary) {
            this.output = binary;
        } else {
            throw new ReferenceError(`The C# project ${name} does not have an acceptable output.`);
        }
    }

    func(namespace: string, method: string) {
        let binaryLocation = join(this.location, `/bin/Debug/${this.output}/${this.name}.dll`);

        return edge.func({
            assemblyFile: binaryLocation,
            typeName: namespace,
            methodName: method
        });
    }
}