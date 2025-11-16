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
        console.log(text.split("\n").reduce((codeStr, line, idx) => codeStr + `${idx + 1}.\t${line}\n`, ''));
        try {
            let tokens = this.lexer.scanTokens(text);
            let tree = this.parser.parse(tokens);
            let output = this.interpreter.interpret(tree);
            return output.reduce((out, line)=>out+"\n"+line, "");
        } catch (err) {
            if (err instanceof SimplError) {
                return err.message;
            } else {
                return `[${this.interpreter.line}] Uh Oh, ini error sistem. Mohon laporkan agar diperbaiki. [ ${err} ]`;
            }
        }
        
    }
}



let simp = new Simpl();


console.log(simp.runCode
(`
    cetak - ""
`), '\n');