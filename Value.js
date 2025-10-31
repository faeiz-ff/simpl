
import { Environment } from "./Environment.js";
import { Henti, Lewat, Hasil } from "./Interpreter.js";
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
    constructor(type, data) {
        super(stipeSymbol, true, data);
        this.symbol = type;
        this.operators = new Environment();
        this.member = new Environment();
    }

    operate(visitor, op, right, left) {
        let opLexeme = TokenType.TOKEN_STRING[op]
        let operatorFunc = this.operators.get(opLexeme);
        if (!operatorFunc)
            visitor.error(`operator ${opLexeme} tidak terdefinisi untuk Model ${right.type.description}.`);

        let result = null;
        if (left) { // Binary
            result = operatorFunc.data.callFunc(visitor, [right, left]);
        } else { // Unary, safe because valid unary op is just + - ! in the parser
            result = operatorFunc.data.callFunc(visitor, [right]);
        }

        return result;
    }

x
}

class PetikTipe extends Model {
    constructor() {
        super(petikSymbol, {
            callFunc: (v,args) => {
                if (args.length !== 1) {
                    v.error("Jumlah argumen tidak sama dengan parameter fungsi." + ` ${args.length} != 1`);
                }
                if (args[0].type === stipeSymbol) {
                    return new Value(petikSymbol, args[0].symbol.description);
                }

                return new Value(petikSymbol, args[0].data.toString());
            }
        });
        this.init();
    }

    init() {
        this.operators.define("PLUS", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(petikSymbol, l.data + r.data)}));

        this.operators.define("GREATER", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(logisSymbol, l.data > r.data)}));
        this.operators.define("LESS", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(logisSymbol, l.data < r.data)}));
        this.operators.define("EQUAL_EQUAL", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(logisSymbol, l.data === r.data)}));
        this.operators.define("GREATER_EQUAL", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(logisSymbol, l.data >= r.data)}));
        this.operators.define("LESS_EQUAL", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(logisSymbol, l.data <= r.data)}));
        this.operators.define("BANG_EQUAL", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(logisSymbol, l.data !== r.data)}));

        this.operators.define("AMPERSAND", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(logisSymbol, l.data && r.data)}));
        this.operators.define("PIPE", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(logisSymbol, l.data || r.data)}));
        this.operators.define("BANG", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(logisSymbol, !Boolean(r.data))}));
    }
}

class AngkaTipe extends Model {
    constructor() {
        super(angkaSymbol, {
            callFunc: (v, args) => {
                if (args.length !== 1) {
                    v.error("Jumlah argumen tidak sama dengan parameter fungsi." + ` ${args.length} != 1`);
                }

                switch (args[0].type) {
                    case petikSymbol:
                        if (isNaN(Number(args[0].data))) {
                            v.error("Nilai dari petik bukanlah sebuah angka, konversi gagal.")
                        }
                        return new Value (angkaSymbol, Number(args[0].data));
                    case angkaSymbol:
                        return new Value(angkaSymbol, args[0].data);
                    case logisSymbol:
                        return new Value(angkaSymbol, Number(args[0].data));
                    default:
                        v.error("Tipe yang dapat diterima hanyalah petik, angka, dan logis." + ` Mendapatkan ${args[0].type.description}.`);
                        return;
                }
            }
        });
        this.init();
    }

    init() {
        this.operators.define("PLUS", new Variable(mesinSymbol, true, {callFunc: (v, [r, l={data:0}]) => new Value(angkaSymbol, l.data+r.data)}));
        this.operators.define("MINUS", new Variable(mesinSymbol, true, {callFunc: (v, [r, l={data:0}]) => new Value(angkaSymbol, l.data-r.data)}));
        this.operators.define("STAR", new Variable(mesinSymbol, true, {callFunc: (v, [r, l]) => new Value(angkaSymbol, l.data*r.data)}));
        this.operators.define("SLASH", new Variable(mesinSymbol, true, {callFunc: (v, [r, l]) => new Value(angkaSymbol, l.data/r.data)}));

        this.operators.define("GREATER", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(logisSymbol, l.data > r.data)}));
        this.operators.define("LESS", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(logisSymbol, l.data < r.data)}));
        this.operators.define("EQUAL_EQUAL", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(logisSymbol, l.data === r.data)}));
        this.operators.define("GREATER_EQUAL", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(logisSymbol, l.data >= r.data)}));
        this.operators.define("LESS_EQUAL", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(logisSymbol, l.data <= r.data)}));
        this.operators.define("BANG_EQUAL", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(logisSymbol, l.data !== r.data)}));

        this.operators.define("AMPERSAND", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(logisSymbol, l.data && r.data)}));
        this.operators.define("PIPE", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(logisSymbol, l.data || r.data)}));
        this.operators.define("BANG", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(logisSymbol, !Boolean(r.data))}));
    }
}

class LogisTipe extends Model {
    constructor() {
        super(logisSymbol, {
            callFunc: (v, args) => {
                if (args.length !== 1) {
                    v.error("Jumlah argumen tidak sama dengan parameter fungsi." + ` ${args.length} != 1`);
                }

                return new Value(logisSymbol, Boolean(args[0].data));
            }
        });
        this.init();
    }

    init() {
        this.operators.define("EQUAL_EQUAL", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(logisSymbol, l.data === r.data)}));
        this.operators.define("BANG_EQUAL", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(logisSymbol, l.data !== r.data)}));

        this.operators.define("AMPERSAND", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(logisSymbol, l.data && r.data)}));
        this.operators.define("PIPE", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(logisSymbol, l.data || r.data)}));
        this.operators.define("BANG", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(logisSymbol, !Boolean(r.data))}));
    }
}

class BarisTipe extends Model {
    constructor() {
        super(barisSymbol, {
            callFunc: (v, args) =>  {
                if (args.length !== 1) {
                    v.error("Jumlah argumen tidak sama dengan parameter fungsi." + ` ${args.length} != 1`);
                }

                switch (args[0].type) {
                    case petikSymbol:
                        return new Value(barisSymbol, args[0].data.map((char)=> new Value(petikSymbol, char)));
                    default:
                        return new Value(barisSymbol, [args[0].data] );
                }
            }
        });
        this.init();
    }

    init () {
        this.operators.define("PLUS", new Variable(mesinSymbol, true, {callFunc: (v, [r, l]) => new Value(barisSymbol, Array(...l.data, ...r.data))}));

        this.operators.define("EQUAL_EQUAL", new Variable(mesinSymbol, true, {callFunc: (v, [r, l]) => new Value(logisSymbol, ((a,b)=>{
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) {
                if (a[i].data !== b[i].data) return false;
            }
            return true;
        })(l.data,r.data))}));

        this.operators.define("BANG_EQUAL", new Variable(mesinSymbol, true, {callFunc: (v, [r, l]) => new Value(logisSymbol, ((a,b)=>{
            if (a.length !== b.length) return true;
            for (let i = 0; i < a.length; i++) {
                if (a[i].data !== b[i].data) return true;
            }
            return false;
        })(l.data,r.data))}));

        this.operators.define("AMPERSAND", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(logisSymbol, l.data && r.data)}));
        this.operators.define("PIPE", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(logisSymbol, l.data || r.data)}));
        this.operators.define("BANG", new Variable(mesinSymbol, true, {callFunc: (v,[r,l]) => new Value(logisSymbol, !Boolean(r.data))}));
    }
}

class MesinTipe extends Model {
    constructor() {
        super(mesinSymbol);
    }
}

export class Callable {
    constructor(enclosing, block, parameters, returnType) {
        // possible problems, nested functions VVVVV
        this.closure = enclosing;
        this.block = block;
        this.parameters = parameters;
        this.returnType = returnType;
    }

    // call with arguments (of value)
    callFunc (visitor, args) {
        if (args.length !== this.parameters.length) {
            visitor.error("Jumlah argumen tidak sama dengan parameter fungsi." + ` ${args.length} != ${this.parameters.length}`);
        }

        let visitorEnv = visitor.environment;
        let funcEnv = new Environment(this.closure);
        visitor.environment = funcEnv;

        for(let i = 0; i < args.length; i++) {
            let type = this.parameters[i][0]; // Stmt.type;
            let symbol = type.accept(visitor); 
            let name = this.parameters[i][1].lexeme;
            funcEnv.define(name, new Variable(symbol, type.tetap, args[i].data));
        }

        let result = new Value(null, null);

        for(let stmt of this.block.statements) {
            try {
                stmt.accept(visitor);
            } catch (err) {
                if (err instanceof Hasil) {
                    result = err.value;
                    break;
                } else if (err instanceof Henti || err instanceof Lewat) {
                    visitor.error("Tidak bisa menghentikan atau melewatkan fungsi. ");
                } else throw err;
            }
        }

        visitor.environment = visitorEnv;
        return result;
    }
}

export const GLOBAL_ENV = (() => { 
    let env = new Environment();
    env.define("petik", new PetikTipe());
    env.define("angka", new AngkaTipe());
    env.define("logis", new LogisTipe());
    env.define("baris", new BarisTipe());
    env.define("mesin", new MesinTipe());
    return env;
})();