import { Lexer } from "./Lexer.js";
import { Parser } from "./Parser.js";

// Simpl: Indonesian Mock Programming Language

class Simpl {

    runCode(code) {
        console.log(code);
        let lexer = new Lexer();
        let tokens = lexer.scanTokens(code);
        let parser = new Parser();
        let tree = parser.parse(tokens);
        console.log(tree);
    }

    static error(what, line) {
        console.log(`error: [line ${line}] ${what}`);
    }
}

let simp = new Simpl();
simp.runCode("angka fib) = fibnacci(10) + 120");
