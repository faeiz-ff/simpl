
import { Environment } from "./Environment.js";
import { Henti, Lewat, Hasil } from "./Interpreter.js";
import * as TokenType from "./TokenType.js";

export const RESERVED_NAMES = [
    "petik", "angka", "logis", "mesin", "baris", "stipe", "modul"
]

export const petikSymbol = Symbol("petik"),
             angkaSymbol = Symbol("angka"),
             logisSymbol = Symbol("logis"),
             mesinSymbol = Symbol("mesin"),
             barisSymbol = Symbol("baris"),
             stipeSymbol = Symbol("stipe"),
             modulSymbol = Symbol("modul");

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
        this.isDatum = false;
    }
}

export class Stipe extends Variable {
    constructor(type, data) {
        super(stipeSymbol, true, data);
        this.symbol = type;
        this.operators = new Environment();
        this.member = null;
    }

    operate(visitor, op, right, left) {
        let opLexeme = TokenType.TOKEN_STRING[op] + (left ? "" : "_UNARY");
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
                        v.error(`Jumlah argumen tidak sama dengan parameter mesin: ${args.length} != 1.`);
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
        this.operators.define("LEBIH", 
            makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data>r.data)));
        this.operators.define("KURANG", 
            makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data<r.data)));
        this.operators.define("SAMA_SAMA", 
            makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data===r.data)));
        this.operators.define("LEBIH_SAMA",
            makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data>=r.data)));
        this.operators.define("KURANG_SAMA",
            makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data<=r.data)));
        this.operators.define("SERU_SAMA",
            makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data!==r.data)));
        this.operators.define("AMPERSAN",
            makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data&&r.data)));
        this.operators.define("PIPA",
            makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data||r.data)));

        this.operators.define("SERU_UNARY",
            makeBuiltInFunc([petikSymbol], logisSymbol, (v, [r]) => new Value(logisSymbol, !Boolean(r.data))));

        this.member = new Environment();

        this.member.define("pisah", makeBuiltInFunc([petikSymbol, petikSymbol], barisSymbol, (v, [d, sep])=>{
            return new Value(barisSymbol, d.data.split(sep.data).map(val=>new Value(petikSymbol, val)));
        }));
        this.member.define("bersih", makeBuiltInFunc([petikSymbol], petikSymbol, (v, [d])=> {
            return new Value(petikSymbol, d.data.trim())
        }));
        this.member.define("ganti", makeBuiltInFunc([petikSymbol, petikSymbol, petikSymbol], petikSymbol,
            (v, [d, what, rep]) => new Value(petikSymbol, d.data.replaceAll(what.data, rep.data))
        ));
    }
}

class AngkaTipe extends Stipe {
    constructor() {
        super(angkaSymbol, {
            callFunc: (v, args) => {
                if (args.length !== 1) {
                    v.error(`Jumlah argumen tidak sama dengan parameter mesin: ${args.length} != 1.`);
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
                        v.error(`Tipe yang dapat diterima hanyalah petik, angka, dan logis. Mendapatkan ${args[0].type.description}.`);
                        return;
                }
            }
        });
        this.init();
    }

    init() {
        this.operators.define("PLUS", 
            makeBuiltInFunc([angkaSymbol, angkaSymbol], angkaSymbol, (v, [r, l]) => new Value(angkaSymbol, l.data+r.data)));
        this.operators.define("MINUS",
            makeBuiltInFunc([angkaSymbol, angkaSymbol], angkaSymbol, (v, [r, l]) => new Value(angkaSymbol, l.data-r.data)));
        this.operators.define("BINTANG",  
            makeBuiltInFunc([angkaSymbol, angkaSymbol], angkaSymbol, (v, [r, l]) => new Value(angkaSymbol, l.data*r.data)));
        this.operators.define("GARIS_MIRING",
            makeBuiltInFunc([angkaSymbol, angkaSymbol], angkaSymbol, (v, [r, l]) => new Value(angkaSymbol, l.data/r.data)));
        this.operators.define("MODULUS", 
            makeBuiltInFunc([angkaSymbol, angkaSymbol], angkaSymbol, (v, [r, l]) => new Value(angkaSymbol, l.data%r.data)));

        this.operators.define("LEBIH", 
            makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data>r.data)));
        this.operators.define("KURANG", 
            makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data<r.data)));
        this.operators.define("SAMA_SAMA", 
            makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data===r.data)));
        this.operators.define("LEBIH_SAMA",
            makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data>=r.data)));
        this.operators.define("KURANG_SAMA",
            makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data<=r.data)));
        this.operators.define("SERU_SAMA",
            makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data!==r.data)));
        this.operators.define("AMPERSAN",
            makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data&&r.data)));
        this.operators.define("PIPA",
            makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data||r.data)));
        this.operators.define("SERU_UNARY",
            makeBuiltInFunc([angkaSymbol], logisSymbol, (v, [r]) => new Value(logisSymbol, !Boolean(r.data))));
        this.operators.define("PLUS_UNARY",
            makeBuiltInFunc([angkaSymbol], angkaSymbol, (v, [r]) => new Value(angkaSymbol, +r.data)));
        this.operators.define("MINUS_UNARY",
            makeBuiltInFunc([angkaSymbol], angkaSymbol, (v, [r]) => new Value(angkaSymbol, -r.data)));

        this.member = new Environment();
    }
}

class LogisTipe extends Stipe {
    constructor() {
        super(logisSymbol, {
            callFunc: (v, args) => {
                if (args.length !== 1) {
                    v.error(`Jumlah argumen tidak sama dengan parameter mesin: ${args.length} != 1.`);
                }

                return new Value(logisSymbol, Boolean(args[0].data) || Boolean(args[0].data.member));
            }
        });
        this.init();
    }

    init() {
        this.operators.define("SAMA_SAMA", 
            makeBuiltInFunc([logisSymbol, logisSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data===r.data)));
        this.operators.define("SERU_SAMA",
            makeBuiltInFunc([logisSymbol, logisSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data!==r.data)));

        this.operators.define("AMPERSAN",
            makeBuiltInFunc([logisSymbol, logisSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data&&r.data)));
        this.operators.define("PIPA",
            makeBuiltInFunc([logisSymbol, logisSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data||r.data)));
        this.operators.define("SERU_UNARY",
            makeBuiltInFunc([logisSymbol], logisSymbol, (v, [r]) => new Value(logisSymbol, !Boolean(r.data))));
        
        this.member = true;
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

        this.operators.define("MINUS_UNARY",
            makeBuiltInFunc([barisSymbol], barisSymbol, (v, [r]) => {
                let newBaris = copier(r);
                newBaris.data.pop();
                return newBaris;
            }));

        this.operators.define("SAMA_SAMA",
            makeBuiltInFunc([barisSymbol, barisSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, ((a,b)=>{
                if (a.length !== b.length) return false;
                for (let i = 0; i < a.length; i++) {
                    if (a[i].data !== b[i].data) return false;
                }
                return true;
            })(l.data,r.data)))
        );

        this.operators.define("SERU_SAMA", 
            makeBuiltInFunc([barisSymbol, barisSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, ((a,b)=>{
                if (a.length !== b.length) return true;
                for (let i = 0; i < a.length; i++) {
                    if (a[i].data !== b[i].data) return true;
                }
                return false;
            })(l.data,r.data)))
        );

        this.operators.define("AMPERSAN",
            makeBuiltInFunc([barisSymbol, barisSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data&&r.data)));
        this.operators.define("PIPA",
            makeBuiltInFunc([barisSymbol, barisSymbol], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data||r.data)));
        this.operators.define("SERU_UNARY",
            makeBuiltInFunc([barisSymbol], logisSymbol, (v, [r]) => new Value(logisSymbol, !Boolean(r.data))));

        this.member = new Environment();

        this.member.define("hapus", makeBuiltInFunc([barisSymbol, angkaSymbol], barisSymbol, (v, [b, i]) => {
            if (b.data.length <= i.data) {
                v.error(`Indeks tidak boleh lebih besar atau sama dengan ukuran baris, ${i.data} >= ${b.data.length}`);
            }

            while (i.data < 0) i.data += b.data.length;
            return new Value(barisSymbol, b.data.filter((val, idx)=>idx!==i.data));
        }));
    }
}

class MesinTipe extends Stipe {
    constructor() {
        super(mesinSymbol);
        this.member = true;
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
                    
                    let val = new Variable(symbol, type.tetap, args[i].data);
                    if (args[i].data === null) {
                        // okay?
                    } else if (symbol === null) {
                        val.isDatum = true;
                        val.type = args[i].type;
                    } else if (symbol !== args[i].type) {
                        v.line = callLineNum;
                        v.error(`Tipe member tidak sama dengan argumen. ${symbol.description} != ${args[i].type.description}`);
                    }
                    val.member = args[i].member;
                    obj.member.define(name, val);
                }

                obj.member.define("objek", obj);
                return obj;
            }
        });
    }
}

export class Jenis extends Stipe {
    constructor(name, enums) {
        let sym = Symbol(name);
        super(sym, null);
        enums.forEach(thing => {
            this.member.define(thing.lexeme, new Value(sym, Symbol(thing.lexeme)));
        });
        this.init(sym);
    }

    init(sym) {
        this.operators.define("SAMA_SAMA", 
            makeBuiltInFunc([sym, sym], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data===r.data)));
        this.operators.define("SERU_SAMA",
            makeBuiltInFunc([sym, sym], logisSymbol, (v, [r, l]) => new Value(logisSymbol, l.data!==r.data)));
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
            let val = new Variable(type, tetap, args[i].data);

            if (type === null) {
                val.isDatum = true;
                val.type = args[i].type;
            } else if (args[i].data === null) {

            } else if (args[i].type !== type) {
                visitor.line = callLineNum;
                visitor.error(`Tipe argumen tidak sama dengan parameter. ${args[i].type} != ${type.description}`);
            }
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

// this approach is too slow. Will fix later...

function makeBuiltInFunc(parameters, returnType, funcBody) {
    let lambda = new Callable(null, null, parameters.map((val)=>[val]), returnType);
    lambda.callFunc = (v, args) => {
        if (args.length != parameters.length) {
            v.error("Jumlah Argumen tidak sama dengan parameter:" + ` Seharusnya ${parameters.length} dan bukan ${args.length}.`);
        } 
        for (let i = 0; i < args.length; i++) {
            if (parameters[i] === null) continue;
            if (args[i].type !== parameters[i]) {
                v.error("Tipe argumen tidak sama dengan tipe parameter." + ` Seharusnya ${parameters[i].type.description} dan bukan ${args[i].description}`);
            }
        }
        return funcBody(v, args);
    };
    let variable = new Variable(mesinSymbol, true, lambda);
    return variable;
}

function copier(thing) {
    switch(thing.type) {
        case petikSymbol: return new Value(petikSymbol, thing.data);
        case angkaSymbol: return new Value(angkaSymbol, thing.data);
        case logisSymbol: return new Value(logisSymbol, thing.data);
        case mesinSymbol: return new Value(mesinSymbol, thing.data);
        case barisSymbol: return new Value(barisSymbol, thing.data.map((val)=>copier(val)));
        case stipeSymbol: return null;
        case modulSymbol: return null;
        default:
            if (thing.member && thing.member instanceof Environment) {
                let keys = thing.member.memory.keys();
                let valCopy = new Value(thing.type, null);
                let newMember = new Environment();
                for (let i of keys) {
                    if (i === "objek") continue;
                    newMember.define(i, copier(thing.member.get(i)));
                }
                newMember.define("objek", valCopy);
                valCopy.member = newMember;

                return valCopy;
            }
            return new Value(null, null);
    }
}


export const GLOBAL_ENV = (() => { 
    let env = new Environment();
    env.define("petik", new PetikTipe());
    env.define("angka", new AngkaTipe());
    env.define("logis", new LogisTipe());
    env.define("baris", new BarisTipe());
    env.define("mesin", new MesinTipe());

    env.define("jarak", makeBuiltInFunc([angkaSymbol, angkaSymbol], barisSymbol, 
        (v, [from, to])=>new Value(barisSymbol, 
            Array(to.data-from.data)
                .fill(0)
                .map((val, idx)=>new Value(angkaSymbol, from.data+idx))))
    );

    env.define("nihil?", makeBuiltInFunc([null], logisSymbol, (v, [d]) => new Value(logisSymbol, d.data === null)));
    env.define("ukuran", makeBuiltInFunc([null], angkaSymbol,(v, [d]) => d.type === barisSymbol || d.type === petikSymbol 
        ? new Value(angkaSymbol, d.data.length)
        : v.error(`Ukuran hanya terdapat untuk tipe petik atau baris. Menemukan tipe ${d.type.description}.`)
    ));

    env.define("salin", makeBuiltInFunc([null], null, (v, [d]) => copier(d)));
    env.define("tipe", makeBuiltInFunc([null], petikSymbol, (v, [d]) => (d.type?.description) 
        ? new Value(petikSymbol, d.type.description)
        : new Value(petikSymbol, "datum")
    ));
    return env;
})();