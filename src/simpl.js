import { Interpreter } from "./interpreter.js";
import { Lexer } from "./lexer.js";
import { Parser } from "./parser.js";
import { SimplError, SimplErrorEksekusi } from "./simpl-error.js";

// Simpl: Indonesian Mini Programming Language !!

class Simpl {
    constructor() {
        this.lexer = new Lexer();
        this.parser = new Parser();
        this.interpreter = new Interpreter();
    }

    runCode(text) {
        // console.log(text.split("\n").reduce((codeStr, line, idx) => codeStr + `${idx + 1}.\t${line}\n`, ''));
        const textLines = text.split("\n");
        try {
            let tokens = this.lexer.scanTokens(text);
            let pohon = this.parser.parse(tokens);
            let output = this.interpreter.interpret(pohon);
            return output.join("\n");
        } catch (err) {
            if (err instanceof SimplError) {
                const errorCode = textLines[err.line - 1];
                let errorText = (errorCode ? `ERROR! Pada baris ke-${err.line}\n>> ` + errorCode + '\n' : "") + err.message;
                if (err instanceof SimplErrorEksekusi) {
                    errorText += (err.output ? "\nOutput dari kode:\n" : "") + err.output;
                }
                return errorText;
            } else {
                return `[Pada baris ke-${this.interpreter.line}] Uh Oh, ini error sistem. Mohon laporkan agar diperbaiki. [ ${err} ]`;
            }
        }

    }
}

export default function run(code) {
    return new Simpl().runCode(code);
}
