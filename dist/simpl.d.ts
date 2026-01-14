declare module "simpl-interpreter" {
    export class Simpl {
        constructor(opts: {
            keepMemory?: boolean,
        });
        runCode(code: string): string;
    }
}
