var Simpl = (function () {
    'use strict';

    // Errors
    class SimplError extends Error {}class SimplErrorEksekusi extends SimplError {}class SimplErrorStruktur extends SimplError {}class SimplErrorTulisan extends SimplError {}

    // Environment defines a scope for all data to live in
    class Environment {

        constructor(environment) {
            this.enclosing = environment;
            this.memory = new Map();
        }

        define(thing, value) {
            this.memory.set(thing, value);
        }

        assign(thing, value) {
            if (this.has(thing)) {
                this.memory.set(thing, value);
            } else if (this.enclosing) {
                this.enclosing.assign(thing, value);
            }

            return null;
        }

        get(thing) {
            if (this.has(thing)) {
                return this.memory.get(thing);
            } else if (this.enclosing) {
                return this.enclosing.get(thing);
            }

            return null;
        }

        has(thing) {
            return this.memory.has(thing);
        }

    }

    const RESERVED_KEYWORDS = [
        "rubah", 
        "kalau", 
        "namun", 
        "slagi", 
        "untuk", 
        "cetak", 
        "henti", 
        "lewat", 
        "dalam", 
        "hasil", 
        "kerja", 
        "datum", 
        "jenis", 
        "model", 
        "error", 
        "tetap", 
        "modul", 
    ];

    const RUBAH = 0,
        KALAU = 1,
        NAMUN = 2,
        SLAGI = 3,
        UNTUK = 4,
        CETAK = 5,
        HENTI = 6,
        LEWAT = 7,
        DALAM = 8,
        HASIL = 9,
        KERJA = 10,
        DATUM = 11,
        JENIS = 12,
        MODEL = 13,
        TETAP = 15,
        MODUL = 16,
        EOF = 17,
        ID = 18,
        LITERAL = 19,
        PLUS = 20,
        MINUS = 21,
        STAR = 22,
        SLASH = 23,
        LPAREN = 24,
        RPAREN = 25,
        GREATER = 26,
        GREATER_EQUAL = 27,
        LESS = 28,
        LESS_EQUAL = 29,
        EQUAL = 30,
        EQUAL_EQUAL = 31,
        DOT = 32,
        LCURLY = 33,
        RCURLY = 34,
        COMMA = 35,
        LSQUARE = 36,
        RSQUARE = 37,
        PIPE = 38,
        AMPERSAND = 39,
        BANG = 40,
        ARROW = 41,
        BANG_EQUAL = 42,
        MODULUS = 43;

    const TOKEN_STRING = [
        "RUBAH", 
        "KALAU", 
        "NAMUN", 
        "SLAGI", 
        "UNTUK", 
        "CETAK", 
        "HENTI", 
        "LEWAT", 
        "DALAM", 
        "HASIL", 
        "KERJA", 
        "DATUM", 
        "JENIS", 
        "MODEL", 
        "ERROR", 
        "TETAP", 
        "MODUL", 
        "EOF",
        "ID",
        "LITERAL",
        "PLUS",
        "MINUS",
        "BINTANG",
        "GARIS_MIRING",
        "LPAREN",
        "RPAREN",
        "LEBIH",
        "LEBIH_SAMA",
        "KURANG",
        "KURANG_SAMA",
        "SAMA",
        "SAMA_SAMA",
        "DOT",
        "LCURLY",
        "RCURLY",
        "COMMA",
        "LSQUARE",
        "RSQUARE",
        "PIPA",
        "AMPERSAN",
        "SERU",
        "ARROW",
        "SERU_SAMA",
        "MODULUS",
    ];

    const RESERVED_NAMES = [
        "petik", "angka", "logis", "mesin", "baris", "stipe", "modul"
    ];

    const petikSymbol = Symbol("petik"),
                 angkaSymbol = Symbol("angka"),
                 logisSymbol = Symbol("logis"),
                 mesinSymbol = Symbol("mesin"),
                 barisSymbol = Symbol("baris"),
                 stipeSymbol = Symbol("stipe"),
                 modulSymbol = Symbol("modul");

    class Value {
        constructor(type, data) {
            this.type = type;
            this.data = data;
        }
    }

    class Variable extends Value {
        constructor(type, tetap, data) {
            super(type, data);
            this.tetap = tetap;
            this.isDatum = false;
        }
    }

    class Stipe extends Variable {
        constructor(type, data) {
            super(stipeSymbol, true, data);
            this.symbol = type;
            this.operators = new Environment();
            this.member = null;
        }

        operate(visitor, op, right, left) {
            let opLexeme = TOKEN_STRING[op] + (left ? "" : "_UNARY");
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
                        };

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
                                v.error("Nilai dari petik bukanlah sebuah angka, konversi gagal.");
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

    let Model$1 = class Model extends Stipe {
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
                        if (args[i].data === null) ; else if (symbol === null) {
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
    };

    let Jenis$1 = class Jenis extends Stipe {
        constructor(name, enums) {
            let sym = Symbol(name);
            super(sym, null);
            this.member = new Environment();
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
    };

    class Callable {
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
                } else if (args[i].data === null) ; else if (args[i].type !== type) {
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
                    if (err instanceof Hasil$1) {
                        result = err.value;
                        break;
                    } else if (err instanceof Henti$1 || err instanceof Lewat$1) {
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
            case stipeSymbol: return new Value(null, null);
            case modulSymbol: return new Value(null, null);
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


    const GLOBAL_ENV = (() => { 
        let env = new Environment();
        env.define("petik", new PetikTipe());
        env.define("angka", new AngkaTipe());
        env.define("logis", new LogisTipe());
        env.define("baris", new BarisTipe());
        env.define("mesin", new MesinTipe());

        env.define("jarak", makeBuiltInFunc([angkaSymbol, angkaSymbol], barisSymbol, 
            (v, [from, to])=>new Value(barisSymbol, 
                Array(Math.abs(Math.floor(to.data-from.data)))
                    .fill(0)
                    .map((val, idx)=>new Value(angkaSymbol, from.data+((to.data>from.data)?1:-1)*idx))))
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

    let Henti$1 = class Henti {};
    let Lewat$1 = class Lewat {};
    let Hasil$1 = class Hasil {
        constructor(value) {
            this.value = value;
        }
    };

    const location = {
        GLOBAL: 1,
        SLAGI: 2,
        UNTUK: 3,
        MESIN: 4,
    };
    const MAX_LOOP_ALLOWED = 100000;
    const MAX_STACK_SIZE = 500;

    // Implements all Expressions and Statements Visitor
    class Interpreter {
        constructor() {
            this.globalEnvironment = GLOBAL_ENV;
            this.line = 0;
            this.environment = new Environment(this.globalEnvironment);
            this.tree = null;
            this.state = location.GLOBAL;
            this.stack = [];
            this.output = [];
        }

        // EXPRESSION VISITORS

        visitLiteralExpr(literalExpr) {
            let lit = literalExpr.token;
            this.line = lit.line;
            switch(typeof lit.value) {
                case "string": 
                    return new Value(petikSymbol, lit.value);
                case "number": 
                    return new Value(angkaSymbol, lit.value);
                case "boolean":
                    return new Value(logisSymbol, lit.value);
                default:
                    return new Value(null, null);
            }
        }

        visitArrayExpr(arrayExpr) {
            let value = new Value(barisSymbol, []);

            for (let expr of arrayExpr.contents) {
                let v = this.validvalue(expr.accept(this));
                // value.data.push(v);
                let result = new Value(v.type, v.data);
                result.member = v.member;
                value.data.push(new Value(v.type, v.data));
            }

            return value;
        }

        visitIndexExpr(indexExpr) {
            // a real TODO would've been to implement real iterables
            let iterable = indexExpr.iterable.accept(this);
            if (iterable.type === petikSymbol) {
                iterable = new Value(barisSymbol, iterable.data.split("").map(str=>new Value(petikSymbol, str)));
            }
            if (iterable.type !== barisSymbol) {
                this.error(`'${iterable.type.description}' bukan baris/petik, tidak bisa di-indeks`);
            }

            let index = indexExpr.index.accept(this);
            if (index.type !== angkaSymbol) {
                this.error(`Ekspresi di dalam indeks harus bertipe angka. Menemukan ${index.type.description}`);
            }

            if (index.data >= iterable.data.length) {
                this.error(`Indeks tidak boleh lebih besar atau sama dengan ukuran baris: ${index.data} >= ${iterable.data.length}`);
            }

            while (index.data < 0) index.data += iterable.data.length;
            return iterable.data[index.data];
        }

        visitLambdaExpr(lambdaExpr) {
            // let type = lambdaExpr.returnValue.accept(this);
            let params = lambdaExpr.params.map(val=>[val[0].accept(this), val[0].tetap, val[1].lexeme]);
            if (params.length > 1
                && params.some(param=>params.reduce((count, anotherParam)=>param[2]===anotherParam[2] ? count+1:count, 0) > 1 ? true : false)) {
                    this.error("Parameter mesin tidak boleh mempunyai nama yang sama.");
                }
            let retType = null;
            if (lambdaExpr.returnType) {
                retType = lambdaExpr.returnType.accept(this);
            }
            let lambda = new Callable(this.environment, lambdaExpr.block, params, retType);
            return new Value(mesinSymbol, lambda);
        }

        visitCallExpr(callExpr) {
            this.stack.push(this.line);
            if (this.stack.length > MAX_STACK_SIZE) 
                this.error(`Rekursi melebihi batas: Lebih dari ${MAX_STACK_SIZE}`);
            this.state = location.MESIN;
            let callable = callExpr.callable.accept(this);

            if (callable.type !== mesinSymbol && callable.type !== stipeSymbol) {
                this.error(`Hanya bisa 'memanggil' mesin atau model, malah menemukan ${callable.type.description}. `);
            }

            if (!callable.data?.callFunc) {
                this.error(`Mesin tidak terdefinisi, tidak bisa dipanggil.`);
            }
            this.line = this.stack[this.stack.length-1];
            let result = callable.data.callFunc(this, callExpr.args.map(val=>this.validvalue(val.accept(this))));
            this.stack.pop();
            if (this.stack.length == 0) this.state = location.GLOBAL;
            return result;
        }

        visitBinaryExpr(binaryExpr) {
            let leftValue = this.validvalue(binaryExpr.left.accept(this));
            let rightValue = this.validvalue(binaryExpr.right.accept(this));

            this.line = binaryExpr.op.line;

            let isNull = this.nullCheck(leftValue, rightValue);
            if (isNull) {
                this.error(`Tidak bisa mengoperasikan nilai Nihil.`);
            }
            this.typeCheck(leftValue, rightValue, `Pada operasi biner ${binaryExpr.op.lexeme}`);

            let result = this.environment.get(leftValue.type.description) // get Model
                .operate(this, binaryExpr.op.type, rightValue, leftValue); // dispatch the operation

            return result;
        }

        visitUnaryExpr(unaryExpr) {
            let rightValue = this.validvalue(unaryExpr.right.accept(this));

            this.line = unaryExpr.op.line;

            let isNull = this.nullCheck(rightValue);
            if (isNull) {
                this.error(`Tidak bisa mengoperasikan nilai Nihil.`);
            }

             let result = this.environment.get(rightValue.type.description) // get Model
                .operate(this, unaryExpr.op.type, rightValue); // dispatch the operation

            return result;
        }

        visitGroupingExpr(groupingExpr) {
            return groupingExpr.expr.accept(this);
        }

        visitIdentifierExpr(identifierExpr) {
            let value =  this.environment.get(identifierExpr.token.lexeme);
            this.line = identifierExpr.token.line;
            if (!value) this.error(`'${identifierExpr.token.lexeme}' tidak dapat ditemukan.`);
            return value;
        }

        visitMemberExpr(memberExpr) {
            let main = memberExpr.main.accept(this);
            let name = memberExpr.member.token.lexeme;
            this.line = memberExpr.member.token.line;
            if (!main.member) {
                this.error(`Nilai tidak mempunyai atribut sama sekali.`);
            } else if (!main.member.has(name)) {
                this.error(`atribut .${name} tidak dapat ditemukan.`);
            }
            return main.member.get(name);
        }

        // STATEMENT VISITORS

        // this is needed for interpreting generics TODO!
        visitTypeStmt(typeStmt) {
            if (typeStmt.type === null) return null;
            let type =  typeStmt.type.accept(this);
            if (type.type !== stipeSymbol) this.error(`'${type.type.description}' bukan sebuah Model/Tipe Valid.`);
            return type.symbol;
        }

        visitCetakStmt(cetakStmt) {
            let result = cetakStmt.expr.accept(this);
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
                    return `${thing.type.description}<>`;
                }
            };

            this.output.push(kePetik(result));

        }

        visitKerjaStmt(kerjaStmt) {
            kerjaStmt.expr.accept(this);
        }

        visitDatumStmt(datumStmt) {
            let type = datumStmt.type.accept(this);
            let name = this.validName(datumStmt.name.lexeme);
            this.line = datumStmt.name.line;

            let variable = new Variable(type, datumStmt.type.tetap);

            let value = this.validvalue(datumStmt.expr.accept(this));

            if (value.data === null) value.type = variable.type; // if nihil, ok

            if (type === null) {
                variable.isDatum = true;
                variable.type = value.type;
            } else this.typeCheck(variable, value, `Pada pembuatan variabel '${name}'`);

            variable.data = value.data; 
            variable.member = value.member;

            this.environment.define(name, variable);
        }

        visitRubahStmt(rubahStmt) {
            let variable = rubahStmt.variable.accept(this); // is a reference to the variable data
            if (variable.tetap) {
                this.error(`Variabel tetap tidak dapat di-rubah.`);
            }
            let value = this.validvalue(rubahStmt.value.accept(this));
            if (value.data === null) value.type = variable.type; // if nihil, ok

            if (variable.isDatum)
                variable.type = value.type;
            else this.typeCheck(variable, value, `Pada perubahan variabel.`);

            variable.data = value.data; // reference modifying (THANK GOD FOR THIS I LOVE YOU GARBAGE COLLECTOR)
            variable.member = value.member;
        }

        visitBlockStmt(blockStmt) {
            let blockEnv = new Environment(this.environment);
            this.environment = blockEnv;
            try {
                for (let stmt of blockStmt.statements) {
                    stmt.accept(this);
                }
            } catch (err) {
                this.environment = blockEnv.enclosing; // close the environment first
                throw err;
            }
            this.environment = blockEnv.enclosing;
        }

        visitKalauStmt(kalauStmt) {
            // condition may be null for 'namun', accept the thenBlock if it is
            let condition = kalauStmt.condition?.accept(this);
            if (condition === null || condition === undefined || condition.data || condition.member) {
                kalauStmt.thenBlock.accept(this);
            } else {
                kalauStmt.elseKalau?.accept(this); // kalau may not have namun
            }
        }

        visitHentiStmt() {
            if (this.state !== location.GLOBAL)
                throw new Henti$1(); // throws exception to escape from deep recursion
            else this.error("Tidak ada pengulangan untuk dihentikan.");
        }

        
        visitLewatStmt() {
            if (this.state !== location.GLOBAL)
                throw new Lewat$1(); // throws exception to escape from deep recursion
            else this.error("Tidak ada pengulangan untuk dilewatkan.");
        }

        visitHasilStmt(hasilStmt) {
            if (this.stack.length == 0) {
                this.error("Tidak bisa menghasilkan diluar blok mesin.");
            }
            throw new Hasil$1(hasilStmt.expr.accept(this));
        }

        visitSlagiStmt(slagiStmt) {
            const checkTruthy = (v) => v.data || v.member;
            let lastEnv = this.environment;
            let howManyLoop = 0;
            while (checkTruthy(slagiStmt.condition.accept(this))) {
                howManyLoop++;
                if (howManyLoop > MAX_LOOP_ALLOWED) 
                    this.error(`Pengulangan melebihi batas: lebih dari ${MAX_LOOP_ALLOWED}.`);
                this.environment = new Environment(lastEnv);
                try {
                    for (let stmt of slagiStmt.block.statements) {
                        this.state = location.SLAGI;
                        stmt.accept(this); 
                        this.state = location.SLAGI;
                    }
                } catch (err) {
                    if (err instanceof Henti$1) {
                        break;
                    } else if (err instanceof Lewat$1) {
                        continue;
                    } else throw err;
                }
            }
            this.environment = lastEnv;
            if (this.stackNum !== 0) this.state = location.MESIN;
            else this.state = location.GLOBAL;
        }

        visitUntukStmt(untukStmt) {
            let name = this.validName(untukStmt.varName.lexeme, false);
            let type = untukStmt.varType.accept(this);
            
            let iter = untukStmt.iterable.accept(this);
            if (iter.type === petikSymbol) {
                iter = new Value(barisSymbol, iter.data.split("").map(str=>new Value(petikSymbol, str)));
            }
            if (iter.type !== barisSymbol) {
                this.error(`Pernyataan 'untuk' harus mengiterasi sebuah baris atau petik, bukan ${iter.type.description}`);
            }

            for (let idx = 0; idx < iter.data.length; idx++) {
                let i = iter.data[idx];
                let val = new Variable(i.type, untukStmt.type?.tetap ? true : false, i.data);
                if (type === null) {
                    val.isDatum = true;
                } else if (i.type !== type) this.error(`Tipe data tidak sama pada indeks ke-${idx}: ${i.type.description} != ${type.description}.`);

                let untukEnv = new Environment(this.environment);
                untukEnv.define(name, val);
                this.environment = untukEnv;
                try {
                    // didn't 'accept' the block, just uses it directly
                    for (let stmt of untukStmt.block.statements) {
                        this.state = location.UNTUK;
                        stmt.accept(this); 
                        this.state = location.UNTUK;
                    }
                } catch (err) {
                    this.environment = untukEnv.enclosing;
                    if (err instanceof Lewat$1) {
                        continue;
                    } else if (err instanceof Henti$1) {
                        if (this.stackNum !== 0) this.state = location.MESIN;
                        else this.state = location.GLOBAL;
                        return;
                    } else {
                        throw err;
                    }
                }
                this.environment = untukEnv.enclosing;
            }
            if (this.stackNum !== 0) this.state = location.MESIN;
            else this.state = location.GLOBAL;
        }

        visitJenisStmt(jenisStmt) {
            let name = this.validName(jenisStmt.name.lexeme);
            this.line = jenisStmt.name.line;
            this.environment.define(name, new Jenis$1(name, jenisStmt.enums));
        }

        visitSimplStmt(simpl) {
            for (let stmt of simpl.statements) {
                stmt.accept(this);
            }
        }

        visitModelStmt(modelStmt) {
            let name = this.validName(modelStmt.name.lexeme);
            this.line = modelStmt.name.line;
            this.environment.define(name, new Model$1(name, modelStmt.contents));
        }

        visitModulStmt(modulStmt) {
            let name = this.validName(modulStmt.name.lexeme, false);
            this.line = modulStmt.name.line;
            let variable = this.environment.get(name);
            if (variable) {
                if (variable.type !== stipeSymbol) {
                    this.error(`Modul hanya bisa _ditambahkan_ pada tipe. '${name}' bukan merupakan tipe.`);
                }
                if (variable.member) {
                    this.error(`Tipe '${name}' sudah memiliki modul sendiri, tidak bisa definisi ulang.`);
                }
            }

            let lastEnv = this.environment;
            this.environment = new Environment(this.globalEnvironment);
            if (variable) this.environment.define(name, variable);
            for (let stmt of modulStmt.statements) {
                stmt.accept(this);
            }

            [this.environment, lastEnv] = [lastEnv, this.environment];

            if (variable) {
                variable.member = lastEnv;
            } else {
                let res = new Variable(modulSymbol, true, null);
                res.member = lastEnv;
                this.environment.define(name, res);
            }
        }

        // UTILITIES

        typeCheck(a, b, message) {
            if (a.type !== b.type) {
                this.error(`Tipe data tidak sama: ${a.type.description} != ${b.type.description}. ` + message);
            }
        }

        nullCheck(...args) {
            for (let i of args) {
                if (i.data === null || i.type === null) return i;
            }
            return false;
        }

        validvalue(v) {
            if (v.type !== stipeSymbol) return v;
            this.error("stipe tidak dapat menjadi nilai.");
        }

        validName(n, checkExisted = true) {
            if (RESERVED_NAMES.some(v=>v===n)) {
                this.error(`Nama sistem (${n}) tidak boleh didefinisi ulang.`);
            } else if (checkExisted && this.environment.has(n)) {
                this.error(`Variabel dengan nama '${n}' sudah ada. Tidak bisa didefinisi ulang.`);
            }
            return n;
        }

        error(message) {
            throw new SimplErrorEksekusi(`Error Eksekusi [Pada baris ke-${this.line}] ${message}`);
        }

        interpret(tree) {
            this.line = 0;
            this.output = [];
            this.tree = tree;
            tree.accept(this);
            return this.output;
        }
    }

    class Token {
        constructor(type, lexeme, value, line) {
            this.type = type;
            this.lexeme = lexeme;
            this.value = value;
            this.line = line;
        }

        toString() {
            return `< [${this.line}] ${TOKEN_STRING[this.type]}, ${this.lexeme} >`;
        }
    }

    class Lexer {
        constructor() {
            this.init();
        }

        init() {
            this.text = null;
            this.charStart = 0;
            this.charIndex = 0;
            this.lineIndex = 1;
            this.tokens = [];
            this.errors = [];
        }

        isAtEnd() {
            return this.charIndex >= this.text.length;
        }

        advance() {
            if (this.isAtEnd()) return;
            if (this.see() === "\n") this.lineIndex++;
            this.charIndex++;
        }

        see() {
            return this.text[this.charIndex];
        }

        peek(num = 1) {
            return this.isAtEnd() ? null : this.text[this.charIndex+num];
        }

        isAlpha(char) {
            return /^[a-zA-Z_]$/.test(char);
        }

        isNumeric(char) {
            return /^[0-9]$/.test(char);
        }

        isAlphaNumeric(char) {
            return this.isAlpha(char) || this.isNumeric(char) || char === "?";
        }

        skipWhitespaces() {
            while (!this.isAtEnd() && /\s/.test(this.see())) {
                this.advance();
                this.charStart++;
            }
        }

        parseLexeme() {
            return this.text.slice(this.charStart, this.charIndex);
        }

        scanTokens(text) {
            this.init();
            this.text = text;
            let tokens = [];

            while (!this.isAtEnd()) {
                let token = this.scan();
                this.charStart = this.charIndex;
                if (token) tokens.push(token);
            }

            tokens.push(new Token(EOF, null, null, this.lineIndex));

            this.tokens = tokens;
            return this.tokens;
        }

        id() {
            while(!this.isAtEnd() && this.isAlphaNumeric(this.see())) this.advance();
            
            let lexeme = this.parseLexeme();

            let reservedIndex = RESERVED_KEYWORDS.findIndex((val)=>val===lexeme);
            if (reservedIndex != -1) {
                return new Token(reservedIndex, lexeme, null, this.lineIndex);
            }

            let isLogis = ["benar", "salah"].some((val)=>val===lexeme);
            if (isLogis) {
                return new Token(LITERAL, lexeme, "benar" === lexeme ? true : false, this.lineIndex);
            }

            if (lexeme === "nihil") {
                return new Token(LITERAL, lexeme, null, this.lineIndex);
            }

            return new Token(
                ID, 
                lexeme,
                null,
                this.lineIndex
            )
        }

        number() {
            let isFloat = false;
            while(!this.isAtEnd() && this.isNumeric(this.see())) {
                this.advance();
                if (this.see() === '.') {
                    if (isFloat) break;
                    isFloat = true;
                    this.advance();
                }
            }
            let value = parseFloat(isFloat ? this.parseLexeme() : this.parseLexeme() + ".");
            return new Token(LITERAL, this.parseLexeme(), value, this.lineIndex);
        }

        string() {
            this.advance();
            while(!this.isAtEnd() && this.see() !== '"') this.advance();
            this.advance();
            let lexeme = this.parseLexeme();
            return new Token(LITERAL, lexeme, lexeme.slice(1, lexeme.length-1), this.lineIndex);
        }

        comment() {
            while(!this.isAtEnd() && this.see() !== '\n') {
                this.advance();
                this.charStart++;
            }
            this.advance();
            this.charStart++;
        }

        makeToken(type) {
            this.advance();
            return new Token(type, this.parseLexeme(), null, this.lineIndex);
        }

        scan() {
            this.skipWhitespaces();
            if(this.see() === '#') {
                this.comment();
                this.skipWhitespaces();
            }


            if(this.isAlpha(this.see())) return this.id();
            if(this.isNumeric(this.see())) return this.number();

            switch(this.see()) {
                case "+": return this.makeToken(PLUS);
                case "-": return this.makeToken(MINUS);
                case "/": return this.makeToken(SLASH);
                case "*": return this.makeToken(STAR);
                case "(": return this.makeToken(LPAREN);
                case ")": return this.makeToken(RPAREN);
                case ".": return this.makeToken(DOT);
                case ",": return this.makeToken(COMMA);
                case "{": return this.makeToken(LCURLY);
                case "}": return this.makeToken(RCURLY);
                case "[": return this.makeToken(LSQUARE);
                case "]": return this.makeToken(RSQUARE);
                case "|": return this.makeToken(PIPE);
                case "&": return this.makeToken(AMPERSAND);
                case "%": return this.makeToken(MODULUS);
                case "!": 
                    if (this.peek() === "=") {
                        this.advance();
                        return this.makeToken(BANG_EQUAL);
                    }
                    return this.makeToken(BANG);

                case ">": 
                    if (this.peek() === "=") {
                        this.advance();
                        return this.makeToken(GREATER_EQUAL)                    
                    }
                    return this.makeToken(GREATER);
                case "<": 
                    if (this.peek() === "=") {
                        this.advance();
                        return this.makeToken(LESS_EQUAL)
                    }
                    return this.makeToken(LESS);

                case "=": 
                    if (this.peek() === "=" && this.peek(2) === ">") {
                        return this.makeToken(EQUAL);
                    } else if (this.peek() === "=") {
                        this.advance();
                        return this.makeToken(EQUAL_EQUAL);
                    } else if (this.peek() === ">") {
                        this.advance();
                        return this.makeToken(ARROW);
                    }
                    return this.makeToken(EQUAL);

                case '"': return this.string();
            }
            if (this.isAtEnd()) return;

            throw new SimplErrorTulisan(`Error Tulisan [Pada Baris ke-${this.lineIndex}] karakter tidak valid: Menemukan '${this.see()}'.`);
        }

        debugPrintTokens(tokens) {
            for (let tok of tokens) {
                console.log(tok.toString());
            }
        }
    }

    class ExprBase {
        accept(visitor) {
            return this.visit(visitor);
        }
    }

    class Binary extends ExprBase {
     // Expr.ExprBase left, Token op, Expr.ExprBase right
        constructor (left, op, right) {
            super();
            this.left = left;
            this.op = op;
            this.right = right;
        }

        visit(visitor) {
            return visitor.visitBinaryExpr(this);
        }
    }

    class Unary extends ExprBase {
     // Token op, Expr.ExprBase right
        constructor (op, right) {
            super();
            this.op = op;
            this.right = right;
        }

        visit(visitor) {
            return visitor.visitUnaryExpr(this);
        }
    }

    class Literal extends ExprBase {
     // Token token
        constructor (token) {
            super();
            this.token = token;
        }

        visit(visitor) {
            return visitor.visitLiteralExpr(this);
        }
    }

    class Grouping extends ExprBase {
     // Expr.ExprBase expr
        constructor (expr) {
            super();
            this.expr = expr;
        }

        visit(visitor) {
            return visitor.visitGroupingExpr(this);
        }
    }

    class Member extends ExprBase {
     // Expr.ExprBase main, Expr.Identifier member
        constructor (main, member) {
            super();
            this.main = main;
            this.member = member;
        }

        visit(visitor) {
            return visitor.visitMemberExpr(this);
        }
    }

    class Identifier extends ExprBase {
     // Token token
        constructor (token) {
            super();
            this.token = token;
        }

        visit(visitor) {
            return visitor.visitIdentifierExpr(this);
        }
    }

    class Lambda extends ExprBase {
     // Array<Stmt.Types-Token> params, Stmt.Type returnType, Stmt.Block block
        constructor (params, returnType, block) {
            super();
            this.params = params;
            this.returnType = returnType;
            this.block = block;
        }

        visit(visitor) {
            return visitor.visitLambdaExpr(this);
        }
    }

    class Call extends ExprBase {
     // Expr.ExprBase callable, Expr.ExprBase args
        constructor (callable, args) {
            super();
            this.callable = callable;
            this.args = args;
        }

        visit(visitor) {
            return visitor.visitCallExpr(this);
        }
    }

    let Array$1 = class Array extends ExprBase {
     // Array<Expr.ExprBase> contents
        constructor (contents) {
            super();
            this.contents = contents;
        }

        visit(visitor) {
            return visitor.visitArrayExpr(this);
        }
    };

    class Index extends ExprBase {
     // Expr.ExprBase iterable, Expr.ExprBase index
        constructor (iterable, index) {
            super();
            this.iterable = iterable;
            this.index = index;
        }

        visit(visitor) {
            return visitor.visitIndexExpr(this);
        }
    }

    class StmtBase {
        accept(visitor) {
            return this.visit(visitor);
        }
    }

    class Cetak extends StmtBase {
     // Expr.ExprBase expr
        constructor (expr) {
            super();
            this.expr = expr;
        }

        visit(visitor) {
            return visitor.visitCetakStmt(this);
        }
    }

    class Datum extends StmtBase {
     // Stmt.Type type, Token name, Expr.ExprBase expr
        constructor (type, name, expr) {
            super();
            this.type = type;
            this.name = name;
            this.expr = expr;
        }

        visit(visitor) {
            return visitor.visitDatumStmt(this);
        }
    }

    class Type extends StmtBase {
     // Expr.ExprBase type, bool tetap, Array<Stmt.Type> contents
        constructor (type, tetap, contents) {
            super();
            this.type = type;
            this.tetap = tetap;
            this.contents = contents;
        }

        visit(visitor) {
            return visitor.visitTypeStmt(this);
        }
    }

    class Kerja extends StmtBase {
     // Expr.ExprBase expr
        constructor (expr) {
            super();
            this.expr = expr;
        }

        visit(visitor) {
            return visitor.visitKerjaStmt(this);
        }
    }

    class Block extends StmtBase {
     // Array<Stmt.StmtBase> statements
        constructor (statements) {
            super();
            this.statements = statements;
        }

        visit(visitor) {
            return visitor.visitBlockStmt(this);
        }
    }

    class Kalau extends StmtBase {
     // Expr.ExprBase condition, Stmt.Block thenBlock, Stmt.Kalau elseKalau
        constructor (condition, thenBlock, elseKalau) {
            super();
            this.condition = condition;
            this.thenBlock = thenBlock;
            this.elseKalau = elseKalau;
        }

        visit(visitor) {
            return visitor.visitKalauStmt(this);
        }
    }

    class Untuk extends StmtBase {
     // Stmt.Type varType, Token varName, Expr.Base iterable, Stmt.Block block
        constructor (varType, varName, iterable, block) {
            super();
            this.varType = varType;
            this.varName = varName;
            this.iterable = iterable;
            this.block = block;
        }

        visit(visitor) {
            return visitor.visitUntukStmt(this);
        }
    }

    class Slagi extends StmtBase {
     // Expr.ExprBase condition, Stmt.Block block
        constructor (condition, block) {
            super();
            this.condition = condition;
            this.block = block;
        }

        visit(visitor) {
            return visitor.visitSlagiStmt(this);
        }
    }

    class Henti extends StmtBase {
        constructor () {
            super();
        }

        visit(visitor) {
            return visitor.visitHentiStmt(this);
        }
    }

    class Lewat extends StmtBase {
        constructor () {
            super();
        }

        visit(visitor) {
            return visitor.visitLewatStmt(this);
        }
    }

    class Rubah extends StmtBase {
     // Expr.ExprBase variable, Expr.ExprBase value
        constructor (variable, value) {
            super();
            this.variable = variable;
            this.value = value;
        }

        visit(visitor) {
            return visitor.visitRubahStmt(this);
        }
    }

    class Hasil extends StmtBase {
     // Expr.ExprBase expr
        constructor (expr) {
            super();
            this.expr = expr;
        }

        visit(visitor) {
            return visitor.visitHasilStmt(this);
        }
    }

    class Jenis extends StmtBase {
     // Token name, Array<Token> enums
        constructor (name, enums) {
            super();
            this.name = name;
            this.enums = enums;
        }

        visit(visitor) {
            return visitor.visitJenisStmt(this);
        }
    }

    class Model extends StmtBase {
     // Token name, Array<Stmt.Type-Token> contents
        constructor (name, contents) {
            super();
            this.name = name;
            this.contents = contents;
        }

        visit(visitor) {
            return visitor.visitModelStmt(this);
        }
    }

    let Simpl$1 = class Simpl extends StmtBase {
     // Array<Stmt.StmtBase> statements
        constructor (statements) {
            super();
            this.statements = statements;
        }

        visit(visitor) {
            return visitor.visitSimplStmt(this);
        }
    };

    class Modul extends StmtBase {
     // Token name, Array<Stmt.StmtBase> statements
        constructor (name, statements) {
            super();
            this.name = name;
            this.statements = statements;
        }

        visit(visitor) {
            return visitor.visitModulStmt(this);
        }
    }

    class Parser {
        constructor() {
            this.init();
        }

        init() {
            this.tokens = [];
            this.tokenIndex = 0;
            this.tree = null;
        }

        see() {
            return this.tokens[this.tokenIndex];
        }

        peek() {
            return this.tokenIndex+1 >= this.tokens.length ? null : this.tokens[this.tokenIndex+1];
        }

        check(type) {
            return this.tokens[this.tokenIndex].type === type;
        }

        isAtEnd() {
            return this.tokenIndex >= this.tokens.length;
        }

        match(...args) {
            if(this.isAtEnd()) return false;

            for (let i of args) {
                if (this.check(i)) {
                    this.tokenIndex++;
                    return true;
                }
            }
            return false;
        }

        eat(expected, errMsg) {
            if (this.match(expected)) return
            this.error(errMsg);
        }

        previous() {
            return this.tokens[this.tokenIndex - 1];
        }

        blockStmt() {
            let statements= [];
            while(!this.match(RCURLY)) {
                statements.push(this.statement());
            }
            return new Block(statements);
        }

        functionCallExpr(callable) {
            let args = [];

            if (this.check(RPAREN)) ; else {
                do {
                    let expr = this.expression();
                    args.push(expr);
                } while(this.match(COMMA))
            }

            this.eat(RPAREN, "Mengharapkan ')' setelah pemanggilan mesin.");

            return new Call(callable, args);
        }

        lambda() {
            let params = [];
            this.eat(LPAREN, "Mengharapkan '(' setelah '=>' untuk deklarasi Lamda.");

            if (this.match(ID, DATUM)) {
                let type = this.typeStmt();
                this.eat(ID, "Mengharapkan Nama parameter setelah deklarasi Tipe parameter dalam Lamda.");
                let name = this.previous();
                params.push([type, name]);
                    
                while(this.match(COMMA)) {
                    if(!this.match(ID, DATUM))
                        this.error("Mengharapkan Tipe parameter setelah koma dalam Lamda.");
                    let type = this.typeStmt();
                    this.eat(ID, "Mengharapkan Nama parameter setelah deklarasi Tipe parameter dalam Lamda.");
                    let name = this.previous();
                    params.push([type, name]);
                }
            }
            // deepPrint(params);
            this.eat(RPAREN, "Mengharapkan ')' setelah deklarasi parameter Lamda.");
            let returnType = null;
            if (this.match(ID, DATUM)) {
                returnType = this.typeStmt();
            } if (this.match(LITERAL)) {
                if (this.previous().value !== null) {
                    this.error("Mengharapkan Tipe Hasil yang valid.");
                }
                returnType = null;
            }
            this.eat(LCURLY, "Mengharapkan Blok { } untuk Lamda.");
            let block = this.blockStmt();

            return new Lambda(params, returnType, block);
        }

        arrayExpr() {
            if (this.match(RSQUARE)) {
                return new Array$1([]);
            }

            let contents = [];
            do {
                if (this.check(RSQUARE)) break;
                let expr = this.expression();
                contents.push(expr);
            } while (this.match(COMMA))

            this.eat(RSQUARE, "Mengharapkan ']' untuk menutup 'baris'.");

            return new Array$1(contents);
        }

        arrayIndex(iterable) {
            let index = this.expression();

            this.eat(RSQUARE, "Mengharapkan ']' untuk menutup indeks." );

            return new Index(iterable, index);
        }

        primary() {
            if (this.match(LPAREN)) {
                let expr = this.expression();
                this.eat(RPAREN, "Mengharapkan ')' untuk mengakhiri ekspresi kurung");
                return new Grouping(expr);
            } else if (this.match(LITERAL)){
                return new Literal(this.previous());
            } else if (this.match(ID)) {
                return this.identifier();
            } else if (this.match(ARROW)) {
                return this.lambda();
            } else if (this.match(LSQUARE)) {
                return this.arrayExpr();
            }
            
            this.error("Mengharapkan Ekspresi valid.");
        }

        valuable() {
            let result = this.primary();

            while(true) {
                if (this.match(LPAREN)) {
                    result = this.functionCallExpr(result);
                } else if (this.match(LSQUARE)) {
                    result = this.arrayIndex(result);
                } else if (this.match(DOT)) {
                    result = this.member(result);
                } else {
                    break;
                }
            }

            return result;
        }

        unary() {
            if (this.match(PLUS, MINUS, BANG)) {
                let op = this.previous();
                let right = this.unary();
                return new Unary(op, right);
            } else {
                return this.valuable();
            }
        }

        identifier() {
            return new Identifier(this.previous());
        }

        member(parent) {
            this.eat(ID, "Mengharapkan Nama member setelah '.'.");
            let id = this.identifier();
            return new Member(parent, id);
        }  

        factor() {
            let expr = this.unary();

            while(this.match(STAR, SLASH)) {
                let op = this.previous();
                let right = this.unary();
                expr = new Binary(expr, op, right);
            }

            return expr;
        }

        term() {
            let expr = this.factor();

            while (this.match(MODULUS, PLUS, MINUS)) {
                let op = this.previous();
                let right = this.factor();
                expr = new Binary(expr, op, right);
            }

            return expr;
        }

        equality() {
            let expr = this.term();

            while(this.match(GREATER, GREATER_EQUAL, LESS, LESS_EQUAL, EQUAL_EQUAL, BANG_EQUAL)) {
                let op = this.previous();
                let right = this.term();
                expr = new Binary(expr, op, right);
            }

            return expr;
        }
        
        andTerm() {
            let expr = this.equality();

            while(this.match(AMPERSAND)) {
                let op = this.previous();
                let right = this.equality();
                expr = new Binary(expr, op, right);
            }

            return expr;
        }

        orTerm() {
            let expr = this.andTerm();

            while(this.match(PIPE)) {
                let op = this.previous();
                let right = this.equality();
                expr = new Binary(expr, op, right);
            }

            return expr;
        }

        expression() {
            return this.orTerm();
        }

        cetakStmt() {
            let expr = this.expression();
            return new Cetak(expr);
        }

        typeStmt() {
            if (this.previous().type === DATUM) {
                let tetap = false;
                if (this.match(TETAP)) {
                    tetap = true;
                }
                return new Type(null, tetap, null);
            }

            let type = this.identifier();
            // while (this.match(TokenType.DOT)) {
            //     type = this.member(type);
            // }

            let contents = null;
            // if (this.match(TokenType.LESS)) {
            //     this.eat(TokenType.ID, "Mengharapkan Tipe setelah '<' di dalam < spesifikasi Tipe >.");
            //     let innerType = this.typeStmt();
            //     contents.push(innerType);

            //     // while(this.match(TokenType.COMMA)) {
            //     //     this.eat(TokenType.ID, "Mengharapkan Tipe setelah ',' di dalam < spesifikasi Tipe >.");
            //     //     innerType = this.typeStmt();
            //     //     contents.push(innerType);
            //     // }

            //     this.eat(TokenType.GREATER, "Mengharapkan '>' setelah spesifikasi Tipe.");
            // }

            let tetap = false;
            if (this.match(TETAP)) {
                tetap = true;
            }
            return new Type(type, tetap, contents);
        }

        datumStmt() {
            let type = this.typeStmt();
            this.eat(ID, "Mengharapkan Nama setelah Tipe pada deklarasi variabel.");
            let id = this.previous();
            this.eat(EQUAL, "Mengharapkan '=' setelah Nama variabel.");
            let expr = this.expression();
            return new Datum(type, id, expr);
        }

        kalauStmt() {
            if (this.check(LCURLY)) {
                this.error("Mengharapkan ekspresi setelah 'kalau'.");
            }
            let condition = this.expression();
            this.eat(LCURLY, "Mengharapkan blok { } setelah kondisi untuk pernyataan 'kalau'.");
            let block = this.blockStmt();
            let elseKalau = null;

            if (this.match(NAMUN)) {
                if (this.match(KALAU)) {
                    elseKalau = this.kalauStmt();
                } else if (this.match(LCURLY)) {
                    let elseCond = null;
                    let elseBlock = this.blockStmt();
                    elseKalau = new Kalau(elseCond, elseBlock);
                } else {
                    this.error("Mengharapkan sebuah 'kalau' atau blok { } setelah 'namun'.");
                }
            }

            return new Kalau(condition, block, elseKalau);

        }

        untukStmt() {
            if(!this.match(ID, DATUM))
                this.error("Mengharapkan Tipe variabel untuk diinisialisasi setelah 'untuk'.");
            let varType = this.typeStmt();
            this.eat(ID, "Mengharapkan Nama variabel setelah Tipe dalam pernyataan 'untuk'.");
            let varName = this.previous();
            this.eat(DALAM, "Mengharapkan 'dalam' setelah deklarasi variabel pada pernyataan 'untuk'.");

            let iterable = this.expression();

            this.eat(LCURLY, "Mengharapkan Blok { } setelah kondisi pada pernyataan 'untuk'.");
            let block = this.blockStmt();

            return new Untuk(varType, varName, iterable, block);
        }

        slagiStmt() {
            let condition = this.expression();

            this.eat(LCURLY, "Mengharapkan Blok { } setelah kondisi pada pernyataan 'slagi'.");
            let block = this.blockStmt();

            return new Slagi(condition, block);
        }

        rubahStmt() {
            let id = this.valuable();
            this.eat(EQUAL, "Mengharapkan '=' setelah variable yang ingin di-'rubah'.");
            let expr = this.expression();
            return new Rubah(id, expr);
        }

        jenisStmt() {
            this.eat(ID, "Mengharapkan Nama Jenis setelah 'jenis'.");
            let id = this.previous();
            this.eat(LPAREN, "Mengharapkan '(' setelah deklarasi Nama Jenis.");
            if (this.check(RPAREN)) {
                this.error("Isian Jenis tidak boleh kosong.", false);
            }   
            let enums = [];
            do {
                this.eat(ID, "Mengharapkan macam jenis dalam 'jenis'.");
                let enumb = this.previous();
                enums.push(enumb);
            } while(this.match(COMMA))

            this.eat(RPAREN, "Mengharapkan ')' untuk mengakhiri deklarasi 'jenis'.");

            return new Jenis(id, enums);
        }

        modelStmt() {
            this.eat(ID, "Mengharapkan Nama Model setelah 'model'.");
            let id = this.previous();

            this.eat(LPAREN, "Mengharapkan '(' setelah Nama Model dalam 'model'.");
            if (this.check(RPAREN)) {
                this.error("Model tidak boleh tanpa isian.", false);
            }
            
            let contents = [];
            do {
                if(!this.match(ID, DATUM))
                    this.error("Mengharapkan Tipe member dalam deklarasi 'Model'.");
                let type = this.typeStmt();
                this.eat(ID, "Mengharapkan Nama member dalam deklarasi 'model'.");
                let memberName = this.previous();

                contents.push([type, memberName]);
            } while(this.match(COMMA))

            this.eat(RPAREN, "Mengharapkan ')' untuk mengakhiri deklarasi 'model'.");

            return new Model(id, contents);
        }

        modulStmt() {
            this.eat(ID, "Mengharapkan Nama modul setelah deklarasi.");
            let token = this.previous();
            this.eat(LCURLY, "Mengharapkan '{' setelah Nama modul.");
            let statements = [];
            while(!this.match(RCURLY)) {
                statements.push(this.statement());
            }
            return new Modul(token, statements);
        }

        statement() {
            if(this.match(CETAK)) {
                return this.cetakStmt();
            } else if (this.match(ID, DATUM)) {
                return this.datumStmt();
            } else if (this.match(KERJA)) {
                return new Kerja(this.expression());
            } else if (this.match(KALAU)) {
                return this.kalauStmt();
            } else if (this.match(LCURLY)) {
                return this.blockStmt();
            } else if (this.match(UNTUK)){
                return this.untukStmt();
            } else if (this.match(SLAGI)) {
                return this.slagiStmt();
            } else if (this.match(HENTI)) {
                return new Henti();
            } else if (this.match(LEWAT)) {
                return new Lewat();
            } else if (this.match(RUBAH)) {
                return this.rubahStmt();
            } else if (this.match(HASIL)) {
                return new Hasil(this.expression());
            } else if (this.match(JENIS)) {
                return this.jenisStmt();
            } else if (this.match(MODEL)) {
                return this.modelStmt();
            } else if (this.match(MODUL)) {
                return this.modulStmt();
            } else {
                this.error(`Pernyataan tidak bisa diawali '${this.see().lexeme}'.`, false);
            }
        }

        error(errmsg, found = true) {
            throw new SimplErrorStruktur(`Error Struktur [Pada baris ke-${this.see().line}] ` + errmsg + ((found) ? ` Menemukan '${this.see().lexeme }'.` : ""));
        }

        parse(tokens) {
            this.init();
            this.tokens = tokens;
            let treeList = [];
            while(!this.match(EOF)) {
                treeList.push(this.statement());
            }
            this.tree = new Simpl$1(treeList);
            return this.tree;
        }
    }

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

    function run(code) {
        return new Simpl().runCode(code);
    }

    return run;

})();
