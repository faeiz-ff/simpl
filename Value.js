
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

export class Stipe extends Variable {
    constructor(type, data) {
        super(stipeSymbol, true, data);
        this.symbol = type;
        this.operators = new Environment();
        this.member = new Environment();
        this.method = new Environment();
    }

    operate(visitor, op, right, left) {
        let opLexeme = TokenType.TOKEN_STRING[op];
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
}

class PetikTipe extends Stipe {
    constructor() {
        super(petikSymbol, 
              {
                callFunc: (v,args) => {
                    if (args.length !== 1) {
                        v.error("Jumlah argumen tidak sama dengan parameter mesin:" + ` ${args.length} != 1.`);
                    }

                    const kePetik = (thing) => {
                        if (thing.type === logisSymbol) {
                            return thing.data ? "benar" : "salah";
                        } else if (thing.type === barisSymbol) {
                            return '[' + thing.data.reduce((str, val)=>str+" "+kePetik(val)+",", "") + ' ]'
                        } else if (thing.type === stipeSymbol) {
                            return `Model:${thing.symbol.description}`;
                        } else if (thing.type === mesinSymbol) {
                            return `Mesin<>`;
                        } else if (thing.type === angkaSymbol || thing.type === petikSymbol) {
                            return thing.data !== null ? thing.data.toString() : "nihil";
                        } else {
                            return `Objek<${thing.symbol.description}>` + thing;
                        }
                    }

                    return new Value(petikSymbol, kePetik(args[0]));
              }
            
        });
        this.init();
    }

    init() {
        // BINARY / UNARY OPERATORS
        this.operators.define("PLUS", 
            makeBuiltInFunc([petikSymbol, petikSymbol], petikSymbol, (v, [r, l]) => new Value(petikSymbol, l.data+r.data)));
        this.operators.define("GREATER", 
            makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data>r.data)));
        this.operators.define("LESS", 
            makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data<r.data)));
        this.operators.define("EQUAL_EQUAL", 
            makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data===r.data)));
        this.operators.define("GREATER_EQUAL",
            makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data>=r.data)));
        this.operators.define("LESS_EQUAL",
            makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data<=r.data)));
        this.operators.define("BANG_EQUAL",
            makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data!=r.data)));
        this.operators.define("AMPERSAND",
            makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data&&r.data)));
        this.operators.define("PIPE",
            makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data||r.data)));
        this.operators.define("BANG",
            makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, !Boolean(r.data))));
    }
}

class AngkaTipe extends Stipe {
    constructor() {
        super(angkaSymbol, {
            callFunc: (v, args) => {
                if (args.length !== 1) {
                    v.error("Jumlah argumen tidak sama dengan parameter mesin:" + ` ${args.length} != 1.`);
                }

                switch (args[0].type) {
                    case petikSymbol:
                        if (isNaN(Number(args[0].data))) {
                            v.error("Nilai dari petik bukanlah sebuah angka, konversi gagal.")
                        }
                        return new Value(angkaSymbol, Number(args[0].data));
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
        this.operators.define("PLUS", 
            makeBuiltInFunc([angkaSymbol, angkaSymbol], angkaSymbol, (v, [r, l={data:0}]) => new Value(angkaSymbol, l.data+r.data)));
        this.operators.define("MINUS",
            makeBuiltInFunc([angkaSymbol, angkaSymbol], angkaSymbol, (v, [r, l={data:0}]) => new Value(angkaSymbol, l.data-r.data)));
        this.operators.define("STAR",  
            makeBuiltInFunc([angkaSymbol, angkaSymbol], angkaSymbol, (v, [r, l]) => new Value(angkaSymbol, l.data*r.data)));
        this.operators.define("SLASH",
            makeBuiltInFunc([angkaSymbol, angkaSymbol], angkaSymbol, (v, [r, l]) => new Value(angkaSymbol, l.data/r.data)));
        this.operators.define("MODULUS", 
            makeBuiltInFunc([angkaSymbol, angkaSymbol], angkaSymbol, (v, [r, l]) => new Value(angkaSymbol, l.data%r.data)));

        this.operators.define("GREATER", 
            makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data>r.data)));
        this.operators.define("LESS", 
            makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data<r.data)));
        this.operators.define("EQUAL_EQUAL", 
            makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data===r.data)));
        this.operators.define("GREATER_EQUAL",
            makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data>=r.data)));
        this.operators.define("LESS_EQUAL",
            makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data<=r.data)));
        this.operators.define("BANG_EQUAL",
            makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data!=r.data)));
        this.operators.define("AMPERSAND",
            makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data&&r.data)));
        this.operators.define("PIPE",
            makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data||r.data)));
        this.operators.define("BANG",
            makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, !Boolean(r.data))));
    }
}

class LogisTipe extends Stipe {
    constructor() {
        super(logisSymbol, {
            callFunc: (v, args) => {
                if (args.length !== 1) {
                    v.error("Jumlah argumen tidak sama dengan parameter mesin:" + ` ${args.length} != 1.`);
                }

                return new Value(logisSymbol, Boolean(args[0].data));
            }
        });
        this.init();
    }

    init() {
        this.operators.define("EQUAL_EQUAL", 
            makeBuiltInFunc([logisSymbol, logisSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data===r.data)));
        this.operators.define("BANG_EQUAL",
            makeBuiltInFunc([logisSymbol, logisSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data!=r.data)));

        this.operators.define("AMPERSAND",
            makeBuiltInFunc([logisSymbol, logisSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data&&r.data)));
        this.operators.define("PIPE",
            makeBuiltInFunc([logisSymbol, logisSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data||r.data)));
        this.operators.define("BANG",
            makeBuiltInFunc([logisSymbol, logisSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, !Boolean(r.data))));
    }
}

class BarisTipe extends Stipe {
    constructor() {
        super(barisSymbol);
        this.init();
    }

    init () {
        this.operators.define("PLUS", 
            makeBuiltInFunc([barisSymbol, barisSymbol], barisSymbol, (v, [r,l]) => new Value(barisSymbol, Array(...l.data, ...r.data))));

        this.operators.define("EQUAL_EQUAL",
            makeBuiltInFunc([barisSymbol, barisSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, ((a,b)=>{
                if (a.length !== b.length) return false;
                for (let i = 0; i < a.length; i++) {
                    if (a[i].data !== b[i].data) return false;
                }
                return true;
            })(l.data,r.data)))
        );

        this.operators.define("BANG_EQUAL", 
            makeBuiltInFunc([barisSymbol, barisSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, ((a,b)=>{
                if (a.length !== b.length) return true;
                for (let i = 0; i < a.length; i++) {
                    if (a[i].data !== b[i].data) return true;
                }
                return false;
            })(l.data,r.data)))
        );

        this.operators.define("AMPERSAND",
            makeBuiltInFunc([barisSymbol, barisSymbol], barisSymbol, (v, [r, l]) => new Value(barisSymbol, l.data&&r.data)));
        this.operators.define("PIPE",
            makeBuiltInFunc([barisSymbol, barisSymbol], barisSymbol, (v, [r, l]) => new Value(barisSymbol, l.data||r.data)));
        this.operators.define("BANG",
            makeBuiltInFunc([barisSymbol, barisSymbol], barisSymbol, (v, [r, l]) => new Value(barisSymbol, !Boolean(r.data))));
    }
}

class MesinTipe extends Stipe {
    constructor() {
        super(mesinSymbol);
    }
}

export class Model extends Stipe {
    constructor(name, params) {
        let sym = Symbol(name);
        super(sym, {
            callFunc: (v, args) => {
                if (args.length !== params.length) {
                    v.error("Jumlah argumen tidak sama dengan parameter mesin:" + ` ${args.length} != ${params.length}.`);
                }
                // for call error info
                let callLineNum = v.line;

                let obj = new Value(sym, true);
                obj.member = new Environment();

                for (let i = 0; i < args.length; i++) {
                    let type = params[i][0];
                    let symbol = type.accept(v);
                    let name = params[i][1].lexeme;
                    if (args[i].data === null) {
                        
                    } else if (symbol !== args[i].type) {
                        v.line = callLineNum;
                        v.error(`Tipe member tidak sama dengan argumen.`);
                    }
                    let val = new Variable(symbol, type.tetap, args[i].data)
                    obj.member.define(name, val);
                }

                obj.member.define("objek", obj);

                return obj;
            }
        });
    }
}

export class Callable {
    constructor(enclosing, block, parameters, returnType) {
        this.closure = enclosing;
        this.block = block;
        this.parameters = parameters;
        this.returnType = returnType;
    }

    // call with arguments (of value)
    callFunc (visitor, args) {
        // this function may go into the interpreter idk
        if (args.length !== this.parameters.length) {
            visitor.error("Jumlah argumen tidak sama dengan parameter mesin:" + ` ${args.length} != ${this.parameters.length}.`);
        }
        
        // for asserting _call_ error.
        let callLineNum = visitor.line;

        let visitorEnv = visitor.environment;
        let funcEnv = new Environment(this.closure);
        visitor.environment = funcEnv;
        for(let i = 0; i < args.length; i++) {
            let [type, tetap, name] = this.parameters[i];

            if (args[i].data === null) {

            } else if (args[i].type !== type) {
                visitor.line = callLineNum;
                visitor.error(`Tipe argumen tidak sama dengan parameter. ${args[i].type} != ${type.description}`);
            }
            let val = new Variable(type, tetap, args[i].data);
            val.member = args[i].member;
            funcEnv.define(name, val);
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
                    visitor.error("Tidak bisa menghentikan atau melewatkan mesin. ");
                } else throw err;
            }
        }
        visitor.environment = visitorEnv;
        return result;
    }
}

function makeBuiltInFunc(parameters, returnType, funcBody) {
    let lambda = new Callable(null, null, parameters.map((val)=>[val]), returnType);
    lambda.callFunc = (v, args) => {
        if (args.length != parameters.length) {
            v.error("Jumlah Argumen tidak sama dengan parameter:" + `${args.length} != ${parameters.length}.`);
        } 
        for (let i = 0; i < args.length; i++) {
            if (args[i].type !== parameters[i]) {
                v.error("tipe argumen tidak sama dengan tipe parameter." + `${args[i].type.description} != ${parameters[i].description}`);
            }
        }
        return funcBody(v, args);
    };
    let variable = new Variable(mesinSymbol, true, lambda);
    return variable;
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