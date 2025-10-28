
import { Environment } from "./Environment.js";
import { SimplErrorOperasi } from "./SimplError.js";
import * as TokenType from "./TokenType.js";

export const RESERVED_NAMES = [
    "petik", "angka", "logis", "mesin", "baris", "datum", "benar", "salah",
]

export const petikSymbol = Symbol("petik"),
             angkaSymbol = Symbol("angka"),
             logisSymbol = Symbol("logis"),
             mesinSymbol = Symbol("mesin"),
             barisSymbol = Symbol("baris"),
             stipeSymbol = Symbol("stipe");

export class Value {
    constructor(type, data) {
        this.type = type;
        this.data = data;
    }
}

export class Variable extends Value {
    constructor(type, tetap, data) {
        super(type, data);
        this.tetap = tetap;
    }
}

export class Model extends Variable {
    constructor(type) {
        super(stipeSymbol, true, type);
        this.operators = new Environment();
        this.environment = new Environment();
    }

    operate(visitor, op, right, left) {
        let opLexeme = TokenType.TOKEN_STRING[op]
        let operatorFunc = this.operators.get(opLexeme);
        if (!operatorFunc)
            throw new SimplErrorOperasi(`operator ${opLexeme} tidak terdefinisi untuk Model ${right.type.description}.`);

        let result = null;
        if (left) { // Binary
            result = operatorFunc.callFunc(visitor, right, left);
        } else { // Unary, safe because valid unary op is just + - !
            result = operatorFunc.callFunc(visitor, right);
        }

        return result;
    }
}

class PetikTipe extends Model {
    constructor() {
        super(petikSymbol);
        this.init();
    }

    init() {
        this.operators.define("PLUS", {callFunc: (v, r, l) => new Value(petikSymbol, l.data+r.data)});

        this.operators.define("GREATER", {callFunc: (v, r, l) => new Value(logisSymbol, l.data>r.data)});
        this.operators.define("LESS", {callFunc: (v, r, l) => new Value(logisSymbol, l.data<r.data)});
        this.operators.define("EQUAL_EQUAL", {callFunc: (v, r, l) => new Value(logisSymbol, l.data===r.data)});
        this.operators.define("GREATER_EQUAL", {callFunc: (v, r, l) => new Value(logisSymbol, l.data>=r.data)});
        this.operators.define("LESS_EQUAL", {callFunc: (v, r, l) => new Value(logisSymbol, l.data<=r.data)});

        this.operators.define("AMPERSAND", {callFunc: (v, r, l) => new Value(logisSymbol, l.data && r.data)});
        this.operators.define("PIPE", {callFunc: (v, r, l) => new Value(logisSymbol, l.data || r.data)});
        this.operators.define("BANG", {callFunc: (v, r, l) => new Value(logisSymbol, !Boolean(r.data))});
    }
}

class AngkaTipe extends Model {
    constructor() {
        super(angkaSymbol);
        this.init();
    }

    init() {
        this.operators.define("PLUS", {callFunc: (v, r, l=0) => new Value(angkaSymbol, l.data+r.data)});
        this.operators.define("MINUS", {callFunc: (v, r, l=0) => new Value(angkaSymbol, l.data-r.data)});
        this.operators.define("STAR", {callFunc: (v, r, l) => new Value(angkaSymbol, l.data*r.data)});
        this.operators.define("SLASH", {callFunc: (v, r, l) => new Value(angkaSymbol, l.data/r.data)});

        this.operators.define("GREATER", {callFunc: (v, r, l) => new Value(logisSymbol, l.data>r.data)});
        this.operators.define("LESS", {callFunc: (v, r, l) => new Value(logisSymbol, l.data<r.data)});
        this.operators.define("EQUAL_EQUAL", {callFunc: (v, r, l) => new Value(logisSymbol, l.data===r.data)});
        this.operators.define("GREATER_EQUAL", {callFunc: (v, r, l) => new Value(logisSymbol, l.data>=r.data)});
        this.operators.define("LESS_EQUAL", {callFunc: (v, r, l) => new Value(logisSymbol, l.data<=r.data)});

        this.operators.define("AMPERSAND", {callFunc: (v, r, l) => new Value(logisSymbol, l.data && r.data)});
        this.operators.define("PIPE", {callFunc: (v, r, l) => new Value(logisSymbol, l.data || r.data)});
        this.operators.define("BANG", {callFunc: (v, r, l) => new Value(logisSymbol, !Boolean(r.data))});
    }
}

class LogisTipe extends Model {
    constructor() {
        super(logisSymbol);
        this.init();
    }

    init() {
        this.operators.define("EQUAL_EQUAL", {callFunc: (v, r, l) => new Value(logisSymbol, l.data===r.data)});

        this.operators.define("AMPERSAND", {callFunc: (v, r, l) => new Value(logisSymbol, Boolean(l && r.data))});
        this.operators.define("PIPE", {callFunc: (v, r, l) => new Value(logisSymbol, Boolean(l || r.data))});
        this.operators.define("BANG", {callFunc: (v, r, l) => new Value(logisSymbol, !Boolean(r.data))});
    }
}

export class Callable {
    constructor(enclosing, block, parameters) {
        // possible problems, nested functions VVVVV
        this.closure = enclosing;
        this.block = block;
        this.parameters = parameters;
    }

    // call with arguments (of value)
    callFunc (visitor, ...args) {

    }
}

export const GLOBAL_ENV = (() => { 
    let env = new Environment();
    env.define("petik", new PetikTipe());
    env.define("angka", new AngkaTipe());
    env.define("logis", new LogisTipe());
    return env;
})();