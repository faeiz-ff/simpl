import { Interpreter } from "./Interpreter.js";
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
        let inter = new Interpreter();
        if (tree) {
          inter.interpret(tree);
        }
    }

    static error(what, line) {
        console.log(`error: [line ${line}] ${what}`);
    }
}

// debug thing, i copypasted this from AI
function deepPrint(value, indent = 0, visited = new WeakSet()) {
  const pad = '  '.repeat(indent);

  if (value === null) {
    console.log(`${pad}null`);
    return;
  }

  const type = typeof value;

  if (type !== 'object') {
    console.log(`${pad}${String(value)}`);
    return;
  }

  if (visited.has(value)) {
    console.log(`${pad}[Circular]`);
    return;
  }
  visited.add(value);

  if (Array.isArray(value)) {
    console.log(`${pad}[`);
    for (const item of value) {
      deepPrint(item, indent + 1, visited);
    }
    console.log(`${pad}]`);
    return;
  }

  // determine constructor name
  const ctorName = value.constructor && value.constructor !== Object
    ? value.constructor.name
    : 'Object';

  console.log(`${pad}${ctorName} {`);
  const keys = Reflect.ownKeys(value);
  for (const key of keys) {
    const val = value[key];
    process.stdout.write(`${pad}  ${String(key)}: `);
    if (typeof val === 'object' && val !== null) {
      console.log();
      deepPrint(val, indent + 2, visited);
    } else {
      console.log(val);
    }
  }
  console.log(`${pad}}`);
}



let simp = new Simpl();
simp.runCode
(`
  logis real = salah
  cetak real
`);
