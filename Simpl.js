import { Interpreter } from "./Interpreter.js";
import { Lexer } from "./Lexer.js";
import { Parser } from "./Parser.js";
import { SimplError } from "./SimplError.js";

// Simpl: Indonesian Mini Programming Language !!

export class Simpl {
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
            return output.reduce((out, line)=>out+">> "+line+"\n", "");
        } catch (err) {
            if (err instanceof SimplError) {
                return err.message;
            } else if (err instanceof RangeError) {
                return `[Pada baris ke-${this.interpreter.line}] batas limit rekursi tercapai. Ini adalah batasan bahasa, saya minta maaf atas ketidaknyamanannya. :(`
            } else {
                return `[Pada baris ke-${this.interpreter.line}] Uh Oh, ini error sistem. Mohon laporkan agar diperbaiki. [ ${err} ]`;
            }
        }
        
    }
}



let simp = new Simpl();


console.log(simp.runCode
(`
    slagi benar {
        cetak 10
    }
`), '\n');