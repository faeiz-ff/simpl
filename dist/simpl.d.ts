declare module "bahasa-simpl" {
    export class Simpl {
        constructor(opts?: {
            keepMemory?: boolean,
        });
        runCode(code: string): string;
    }
}
