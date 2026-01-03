
import { Environment } from "./environment.js";
import * as TokenType from "./token-type.js";

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

export const NIHIL = new Value(null, null);

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
            result = visitor.callFunc(operatorFunc.data, [right, left]);
        } else { // Unary, safe because valid unary op is just + - ! in the parser
            result = visitor.callFunc(operatorFunc.data, [right]);
        }
        return result;
    }
}

class PetikTipe extends Stipe {
    constructor() {
        super(petikSymbol, new Callable(null, (v,args) => {
          const kePetik = (thing) => {
            if (thing.type === logisSymbol) {
              return thing.data ? "benar" : "salah";
            } else if (thing.type === barisSymbol) {
              return '[' + thing.data.reduce((str, val)=>str+", "+kePetik(val), "").slice(1) + ' ]';
            } else if (thing.type === stipeSymbol) {
              return `Model<${thing.symbol.description}>`;
            } else if (thing.type === mesinSymbol) {
              let underlying = thing.data.returnType?.description;
              return `Mesin<${underlying? underlying : 'datum'}>`;
            } else if (thing.type === angkaSymbol) {
              return thing.data.toString();
            } else if (thing.type === petikSymbol) {
              return '"' + thing.data + '"';
            } else {
              if (!thing?.type) return `nihil`;
              let type = v.environment.get(thing.type.description);
              if (type?.member.has("kePetik")) {
                v.stack.push(v.line);
                let res = v.callFunc(type.member.get("kePetik").data, [thing]).data;
                v.stack.pop();
                return res;
              }
              return `${thing.type.description}<>`;
            }
          }
          return new Value(petikSymbol, kePetik(args[0]));
        },  [[null]], petikSymbol, true)
        );
        this.init();
    }

    init() {
        // BINARY / UNARY OPERATORS
        this.operators.define("PLUS", 
            makeBuiltInFunc([petikSymbol, petikSymbol], petikSymbol, (_, [r, l]) => new Value(petikSymbol, l.data+r.data)));
        this.operators.define("LEBIH", 
            makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data>r.data)));
        this.operators.define("KURANG", 
            makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data<r.data)));
        this.operators.define("SAMA_SAMA", 
            makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data===r.data)));
        this.operators.define("LEBIH_SAMA",
            makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data>=r.data)));
        this.operators.define("KURANG_SAMA",
            makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data<=r.data)));
        this.operators.define("SERU_SAMA",
            makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data!==r.data)));
        this.operators.define("AMPERSAN",
            makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data&&r.data)));
        this.operators.define("PIPA",
            makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data||r.data)));

        this.operators.define("SERU_UNARY",
            makeBuiltInFunc([petikSymbol], logisSymbol, (_, [r]) => new Value(logisSymbol, !Boolean(r.data))));

        this.member = new Environment();

        this.member.define("pisah", makeBuiltInFunc([petikSymbol, petikSymbol], barisSymbol, (_, [d, sep])=>{
            return new Value(barisSymbol, d.data.split(sep.data).map(val=>new Value(petikSymbol, val)));
        }));
        this.member.define("bersih", makeBuiltInFunc([petikSymbol], petikSymbol, (_, [d])=> {
            return new Value(petikSymbol, d.data.trim())
        }));
        this.member.define("ganti", makeBuiltInFunc([petikSymbol, petikSymbol, petikSymbol], petikSymbol,
            (_, [d, what, rep]) => new Value(petikSymbol, d.data.replaceAll(what.data, rep.data))
        ));
        this.member.define("besar", makeBuiltInFunc([petikSymbol], petikSymbol, (_, [p]) => {
            return new Value(petikSymbol, p.data.toUpperCase())
        }));
        this.member.define("kecil", makeBuiltInFunc([petikSymbol], petikSymbol, (_, [p]) => {
            return new Value(petikSymbol, p.data.toLowerCase())
        }));
    }
}

class AngkaTipe extends Stipe {
    constructor() {
        super(angkaSymbol, new Callable(null, (v, args) => {
          if (typeof args[0].data === "number") {
            return new Value(angkaSymbol, args[0].data);
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
              v.error(`Tipe yang dapat diterima hanyalah petik, angka, logis, dan jenis. Mendapatkan ${args[0].type.description}.`);
              return;
          }
        }, [[null]], angkaSymbol, true)
        );
        this.init();
    }

    init() {
        this.operators.define("PLUS", 
            makeBuiltInFunc([angkaSymbol, angkaSymbol], angkaSymbol, (_, [r, l]) => new Value(angkaSymbol, l.data+r.data)));
        this.operators.define("MINUS",
            makeBuiltInFunc([angkaSymbol, angkaSymbol], angkaSymbol, (_, [r, l]) => new Value(angkaSymbol, l.data-r.data)));
        this.operators.define("BINTANG",  
            makeBuiltInFunc([angkaSymbol, angkaSymbol], angkaSymbol, (_, [r, l]) => new Value(angkaSymbol, l.data*r.data)));
        this.operators.define("GARIS_MIRING",
            makeBuiltInFunc([angkaSymbol, angkaSymbol], angkaSymbol, (_, [r, l]) => new Value(angkaSymbol, l.data/r.data)));
        this.operators.define("MODULUS", 
            makeBuiltInFunc([angkaSymbol, angkaSymbol], angkaSymbol, (_, [r, l]) => new Value(angkaSymbol, l.data%r.data)));

        this.operators.define("LEBIH", 
            makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data>r.data)));
        this.operators.define("KURANG", 
            makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data<r.data)));
        this.operators.define("SAMA_SAMA", 
            makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data===r.data)));
        this.operators.define("LEBIH_SAMA",
            makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data>=r.data)));
        this.operators.define("KURANG_SAMA",
            makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data<=r.data)));
        this.operators.define("SERU_SAMA",
            makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data!==r.data)));
        this.operators.define("AMPERSAN",
            makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data&&r.data)));
        this.operators.define("PIPA",
            makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data||r.data)));
        this.operators.define("SERU_UNARY",
            makeBuiltInFunc([angkaSymbol], logisSymbol, (_, [r]) => new Value(logisSymbol, !Boolean(r.data))));
        this.operators.define("PLUS_UNARY",
            makeBuiltInFunc([angkaSymbol], angkaSymbol, (_, [r]) => new Value(angkaSymbol, +r.data)));
        this.operators.define("MINUS_UNARY",
            makeBuiltInFunc([angkaSymbol], angkaSymbol, (_, [r]) => new Value(angkaSymbol, -r.data)));

        this.member = new Environment();

        this.member.define("bulat", makeBuiltInFunc([angkaSymbol], angkaSymbol, (_, [a]) => {
            return new Value(angkaSymbol, Math.round(a.data));
        }));
        this.member.define("bulatAtas", makeBuiltInFunc([angkaSymbol], angkaSymbol, (_, [a]) => {
            return new Value(angkaSymbol, Math.ceil(a.data))
        }));
        this.member.define("bulatBawah", makeBuiltInFunc([angkaSymbol], angkaSymbol, (_, [a]) => {
            return new Value(angkaSymbol, Math.floor(a.data))
        }));
    }
}

class LogisTipe extends Stipe {
    constructor() {
        super(logisSymbol, new Callable(null, (_, args) => {
                return new Value(logisSymbol, Boolean(args[0].data) || Boolean(args[0].data.member));
            }, [[null]], logisSymbol, true)
        );
        this.init();
    }

    init() {
        this.operators.define("SAMA_SAMA", 
            makeBuiltInFunc([logisSymbol, logisSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data===r.data)));
        this.operators.define("SERU_SAMA",
            makeBuiltInFunc([logisSymbol, logisSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data!==r.data)));
        this.operators.define("AMPERSAN",
            makeBuiltInFunc([logisSymbol, logisSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data&&r.data)));
        this.operators.define("PIPA",
            makeBuiltInFunc([logisSymbol, logisSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data||r.data)));
        this.operators.define("SERU_UNARY",
            makeBuiltInFunc([logisSymbol], logisSymbol, (_, [r]) => new Value(logisSymbol, !Boolean(r.data))));
        
        this.member = new Environment();
    }
}

class BarisTipe extends Stipe {
    constructor() {
        super(barisSymbol);
        this.init();
    }

    init () {
        this.operators.define("PLUS", 
            makeBuiltInFunc([barisSymbol, barisSymbol], barisSymbol, (_, [r,l]) => 
                new Value(barisSymbol, Array(...l.data, ...r.data))
            ));

        this.operators.define("MINUS_UNARY",
            makeBuiltInFunc([barisSymbol], barisSymbol, (_, [r]) =>
                new Value(barisSymbol, r.data.slice(0,r.length))
            ));

        this.operators.define("SAMA_SAMA",
            makeBuiltInFunc([barisSymbol, barisSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, ((a,b)=>{
                if (a.length !== b.length) return false;
                for (let i = 0; i < a.length; i++) {
                    if (a[i].data !== b[i].data) return false;
                }
                return true;
            })(l.data,r.data)))
        );

        this.operators.define("SERU_SAMA", 
            makeBuiltInFunc([barisSymbol, barisSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, ((a,b)=>{
                if (a.length !== b.length) return true;
                for (let i = 0; i < a.length; i++) {
                    if (a[i].data !== b[i].data) return true;
                }
                return false;
            })(l.data,r.data)))
        );

        this.operators.define("AMPERSAN",
            makeBuiltInFunc([barisSymbol, barisSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data&&r.data)));
        this.operators.define("PIPA",
            makeBuiltInFunc([barisSymbol, barisSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data||r.data)));
        this.operators.define("SERU_UNARY",
            makeBuiltInFunc([barisSymbol], logisSymbol, (_, [r]) => new Value(logisSymbol, !Boolean(r.data))));

        this.member = new Environment();

        this.member.define("hapus", makeBuiltInFunc([barisSymbol, angkaSymbol], barisSymbol, (v, [b, i]) => {
            if (b.data.length <= i.data) {
                v.error(`Indeks tidak boleh lebih besar atau sama dengan ukuran baris, ${i.data} >= ${b.data.length}`);
            }

            while (i.data < 0) i.data += b.data.length;
            b.data = b.data.filter((_, idx) => idx !== i.data)
            return b;
        }));

        this.member.define("potongan", makeBuiltInFunc([barisSymbol, angkaSymbol, angkaSymbol], barisSymbol, (v, [b, fr, to]) => {
            if (fr.data >= b.data.length || fr.data < 0 || to.data <= fr.data || to.data > b.data.length) {
                v.error(`Indeks tidak valid, ${fr.data}:${to.data}, dengan ukuran baris ${b.data.length}`);
            }
            return new Value(barisSymbol, b.data.slice(fr.data, to.data));
      }));
        this.member.define("tumpuk", makeBuiltInFunc([barisSymbol, null], null, (_, [b, d])=>{
            b.data.push(d);
            return b;
        }));
        this.member.define("tumpah", makeBuiltInFunc([barisSymbol], null, (_, [b])=>{
            b.data.pop();
            return b;
        }))
        this.member.define("masuk", makeBuiltInFunc([barisSymbol, null, angkaSymbol], null, (v, [b, d, idx]) => {
            if (idx.data > b.data.length) {
              v.error(`Indeks tidak valid, ${idx.data}, dengan ukuran baris ${b.data.length}`);
            }
            b.data.splice(idx.data, 0, d);
            return b;
        }));
        this.member.define("petakan", makeBuiltInFunc([barisSymbol, mesinSymbol], barisSymbol, (v, [b, m]) => {
            let newBaris = new Value(barisSymbol, []);
            for (let datum of b.data) {
                let result = v.callFunc(m.data, [datum]);
                newBaris.data.push(result);
            }
            return newBaris;
        }));
        this.member.define("saring", makeBuiltInFunc([barisSymbol, mesinSymbol], barisSymbol, (v, [b, m]) => {
            let newBaris = new Value(barisSymbol, []);
            for (let datum of b.data) {
                let result = v.callFunc(m.data, [datum]);
                if (result.data === true) {
                    newBaris.data.push(datum);
                }
            }
            return newBaris;
        }));
        this.member.define("reduksi", makeBuiltInFunc([barisSymbol, mesinSymbol, null], null, (v, [b, m, d]) => {
            for (let datum of b.data) {
                let result = v.callFunc(m.data, [d, datum]);
                d = result;
            }
            return d;
        }))
    }
}

class MesinTipe extends Stipe {
    constructor() {
        super(mesinSymbol);
        this.member = new Environment();
    }
}
 
export class Model extends Stipe {
    constructor(name, params) {
        let sym = Symbol(name);
        super(sym, new Callable(null, (v, args) => {

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
                    }
                    val.member = args[i].member;
                    obj.member.define(name, val);
                }

                return obj;
            },  params.map(_=>[null]), sym, true)
        );
    }
}

export class Jenis extends Stipe {
    constructor(name, enums) {
        let sym = Symbol(name);
        super(sym, null);
        this.member = new Environment();
        enums.forEach((thing, idx) => {
            this.member.define(thing.lexeme, new Value(sym, idx));
        });
        this.init(sym);
    }

    init(sym) {
        this.operators.define("SAMA_SAMA", 
            makeBuiltInFunc([sym, sym], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data===r.data)));
        this.operators.define("SERU_SAMA",
            makeBuiltInFunc([sym, sym], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data!==r.data)));
    }
}

export class Callable {
    constructor(enclosing, block, parameters, returnType, isBuiltIn=false) {
        this.closure = enclosing;
        this.block = block;
        this.parameters = parameters;
        this.returnType = returnType;
        this.isBuiltIn = isBuiltIn;
    }
}

function makeBuiltInFunc(parameters, returnType, funcBody) {
    let lambda = new Callable(null, funcBody, parameters.map((val)=>[val]), returnType, true);
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
        case stipeSymbol: return NIHIL;
        case modulSymbol: return NIHIL;
        default:
            if (thing.member && thing.member instanceof Environment) {
                let keys = thing.member.memory.keys();
                let valCopy = new Value(thing.type, null);
                let newMember = new Environment();
                for (let i of keys) {
                    newMember.define(i, copier(thing.member.get(i)));
                }
                valCopy.member = newMember;

                return valCopy;
            }
            return NIHIL;
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
        (_, [from, to])=>new Value(barisSymbol, 
            Array(Math.abs(Math.floor(to.data-from.data)))
                .fill(0)
                .map((_, idx)=>new Value(angkaSymbol, from.data+((to.data>from.data)?1:-1)*idx))))
    );

    env.define("nihil?", makeBuiltInFunc([null], logisSymbol, (_, [d]) => new Value(logisSymbol, d.data === null)));
    env.define("ukuran", makeBuiltInFunc([null], angkaSymbol,(_, [d]) => d.type === barisSymbol || d.type === petikSymbol 
        ? new Value(angkaSymbol, d.data.length)
        : v.error(`Ukuran hanya terdapat untuk tipe petik atau baris. Menemukan tipe ${d.type.description}.`)
    ));

    env.define("salin", makeBuiltInFunc([null], null, (_, [d]) => copier(d)));
    env.define("tipe", makeBuiltInFunc([null], petikSymbol, (_, [d]) => (d.type?.description) 
        ? new Value(petikSymbol, d.type.description)
        : new Value(petikSymbol, "datum")
    ));

    let mtkModul = new Variable(modulSymbol, true, null);
    mtkModul.member = new Environment();
    mtkModul.member.define("acak", makeBuiltInFunc([angkaSymbol, angkaSymbol], angkaSymbol, (_, [a,b]) => {
        let width = Math.abs(a.data-b.data);
        let range = Math.random() * width;
        let final = range + Math.min(a.data,b.data);
        return new Value(angkaSymbol, final);
    }));
    mtkModul.member.define("akar2", makeBuiltInFunc([angkaSymbol], angkaSymbol, (_, [a]) => {
        return new Value(angkaSymbol, Math.sqrt(a.data));
    }));

    env.define("mtk", mtkModul);
    return env;
})();
