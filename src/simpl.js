import { Interpreter } from "./interpreter.js";
import { Lexer } from "./lexer.js";
import { Parser } from "./parser.js";
import { SimplError } from "./simpl-error.js";

// Simpl: Indonesian Mini Programming Language !!

class Simpl {
    constructor() {
        this.lexer = new Lexer();
        this.parser = new Parser();
        this.interpreter = new Interpreter();
    }

    runCode(text) {
        // console.log(text.split("\n").reduce((codeStr, line, idx) => codeStr + `${idx + 1}.\t${line}\n`, ''));
        try {
            let tokens = this.lexer.scanTokens(text);
            let pohon = this.parser.parse(tokens);
            let output = this.interpreter.interpret(pohon);
            return output.join("\n");
        } catch (err) {
            if (err instanceof SimplError) {
                return err.message;
            } else {
                return `[Pada baris ke-${this.interpreter.line}] Uh Oh, ini error sistem. Mohon laporkan agar diperbaiki. [ ${err} ]`;
            }
        }
        
    }
}

export default function run(code) {
    return new Simpl().runCode(code);
}