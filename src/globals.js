
import { Environment } from "./environment.js";

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
        this.member = null;
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
        this.member = new Environment();
        this.member.define("buat", new Variable(mesinSymbol, true, data));
    }

}

export function kePetik(v, thing) {
    if (!thing || (thing.data === null && !thing.member)) return "nihil";

    if (thing.type === logisSymbol) {
        return thing.data ? "benar" : "salah";
    } else if (thing.type === barisSymbol) {
        return '[' + thing.data.reduce((str, val) => str + ", " + kePetik(v, val), "").slice(1) + ' ]';
    } else if (thing.type === stipeSymbol) {
        return `Model<${thing.symbol?.description ? thing.symbol.description : ""}>`;
    } else if (thing.type === mesinSymbol) {
        let underlying = thing.data.returnType?.description;
        return `Mesin<${underlying ? underlying : 'datum'}>`;
    } else if (thing.type === angkaSymbol) {
        return thing.data.toString();
    } else if (thing.type === petikSymbol) {
        return thing.data;
    } else {
        if (!thing?.type) return `nihil`;
        let type = v.environment.get(thing.type.description);
        if (type?.member.has("kePetik")) {
            let res = v.callFunc(type.member.get("kePetik").data, [thing]).data;
            return res;
        }
        return `${thing.type.description}<>`;
    }
}
export class Model extends Stipe {
    constructor(name, params) {
        let sym = Symbol(name);
        super(sym, new Callable(null, (v, args) => {

            let obj = new Value(sym, true);
            obj.member = new Environment();

            let callLine = v.line;

            for (let i = 0; i < args.length; i++) {
                let type = params[i][0];
                let symbol = type.accept(v);
                let name = params[i][1].lexeme;

                let val = new Variable(symbol, type.tetap, args[i].data);
                if (symbol === null) {
                    val.isDatum = true;
                    val.type = args[i].type;
                } else if (args[i].data === null) {
                    // ok
                } else if (args[i].type !== symbol) {
                    v.line = callLine;
                    v.error(`Argumen pembuatan objek tidak sama dengan argumen model, menemukan ${args[i].type?.description}, mengharapkan ${symbol ? symbol.description : "nihil"}`);
                }
                val.member = args[i].member;
                obj.member.define(name, val);
            }

            return obj;
        }, params.map(_ => [null]), sym, true)
        );
    }
}

export class Jenis extends Stipe {
    constructor(name, enums) {
        let sym = Symbol(name);
        super(sym, null);
        enums.forEach((thing, idx) => {
            this.member.define(thing.lexeme, new Value(sym, idx));
        });
        this.member.define("kePetik", makeBuiltInFunc([sym], petikSymbol, (_, [j]) => {
            return new Value(petikSymbol, `${name}<${j.data}>`);
        }))

        this.member.define("SAMA_SAMA",
            makeBuiltInFunc([sym, sym], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data === r.data)));
        this.member.define("SERU_SAMA",
            makeBuiltInFunc([sym, sym], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data !== r.data)));
    }
}

export class Callable {
    constructor(enclosing, block, parameters, returnType, isBuiltIn = false) {
        this.closure = enclosing;
        this.block = block;
        this.parameters = parameters;
        this.returnType = returnType;
        this.isBuiltIn = isBuiltIn;
    }
}

function makeBuiltInFunc(parameters, returnType, funcBody) {
    let lambda = new Callable(null, funcBody, parameters.map((val) => [val]), returnType, true);
    let variable = new Variable(mesinSymbol, true, lambda);
    return variable;
}

function copier(thing) {
    switch (thing.type) {
        case petikSymbol: return new Value(petikSymbol, thing.data);
        case angkaSymbol: return new Value(angkaSymbol, thing.data);
        case logisSymbol: return new Value(logisSymbol, thing.data);
        case mesinSymbol: return new Value(mesinSymbol, thing.data);
        case barisSymbol: return new Value(barisSymbol, thing.data.map((val) => {
            let copy = copier(val);
            let varCopy = new Variable(copy.type, false, copy.data);
            varCopy.member = copy.member;
            return varCopy
        }));
        case stipeSymbol: return NIHIL;
        case modulSymbol: return NIHIL;
        default:
            if (thing.member && thing.member instanceof Environment) {
                let keys = thing.member.memory.keys();
                let valCopy = new Value(thing.type, null);
                let newMember = new Environment();
                for (let i of keys) {
                    let varPrev = thing.member.get(i);
                    let tempCopy = copier(varPrev);
                    let varCopy = new Variable(varPrev.type, varPrev.tetap, tempCopy.data);
                    varCopy.member = tempCopy.member;
                    newMember.define(i, varCopy);
                }
                valCopy.member = newMember;
                valCopy.data = thing.data;
                return valCopy;
            }
            return new Value(thing.type, thing.data);
    }
}


const PetikTipe = (() => {
    let tipe = new Stipe(petikSymbol, new Callable(null, (v, args) => new Value(petikSymbol, kePetik(v, args[0])),
        [[null]], petikSymbol, true));

    tipe.member.define("PLUS",
        makeBuiltInFunc([petikSymbol, petikSymbol], petikSymbol, (_, [r, l]) => new Value(petikSymbol, l.data + r.data)));
    tipe.member.define("LEBIH",
        makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data > r.data)));
    tipe.member.define("KURANG",
        makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data < r.data)));
    tipe.member.define("SAMA_SAMA",
        makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data === r.data)));
    tipe.member.define("LEBIH_SAMA",
        makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data >= r.data)));
    tipe.member.define("KURANG_SAMA",
        makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data <= r.data)));
    tipe.member.define("SERU_SAMA",
        makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data !== r.data)));
    tipe.member.define("AMPERSAN",
        makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data && r.data)));
    tipe.member.define("PIPA",
        makeBuiltInFunc([petikSymbol, petikSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data || r.data)));

    tipe.member.define("SERU_UNER",
        makeBuiltInFunc([petikSymbol], logisSymbol, (_, [r]) => new Value(logisSymbol, !Boolean(r.data))));

    tipe.member.define("kePetik",
        makeBuiltInFunc([petikSymbol], petikSymbol, (v, [p]) => new Value(petikSymbol, kePetik(v, p))));

    tipe.member.define("pisah", makeBuiltInFunc([petikSymbol, petikSymbol], barisSymbol, (_, [d, sep]) => {
        return new Value(barisSymbol, d.data.split(sep.data).map(val => new Value(petikSymbol, val)));
    }));
    tipe.member.define("bersih", makeBuiltInFunc([petikSymbol], petikSymbol, (_, [d]) => {
        return new Value(petikSymbol, d.data.trim())
    }));
    tipe.member.define("ganti", makeBuiltInFunc([petikSymbol, petikSymbol, petikSymbol], petikSymbol,
        (_, [d, what, rep]) => new Value(petikSymbol, d.data.replaceAll(what.data, rep.data))
    ));
    tipe.member.define("besar", makeBuiltInFunc([petikSymbol], petikSymbol, (_, [p]) => {
        return new Value(petikSymbol, p.data.toUpperCase())
    }));
    tipe.member.define("kecil", makeBuiltInFunc([petikSymbol], petikSymbol, (_, [p]) => {
        return new Value(petikSymbol, p.data.toLowerCase())
    }));
    tipe.member.define("format", makeBuiltInFunc([petikSymbol, barisSymbol], petikSymbol, (v, [p, b]) => {
        // THERES ANOTHER ONE ON TULISF MESIN GLOBAL
        let strTemp = p.data;
        let finalized = "";
        let formator = b.data.map(value=>kePetik(v, value));

        for (let i = 0; i < strTemp.length; i++) {
            let ch = strTemp[i];
            if ( ch !== "{") finalized += ch;
            else {
                if (i+1 < strTemp.length && strTemp[i+1] !== "}") {
                    finalized += "{"; continue;
                } 
                i++;
                if (formator.length === 0) {
                    v.error("Baris dalam format tidak mempunyai cukup elemen.")
                }
                finalized += formator.shift();
            }
        }
        if (formator.length !== 0) {
            v.error("Baris dalam format mempunyai terlalu banyak elemen.")
        }
        return new Value(petikSymbol, finalized);

    }));

    return tipe;
})();


const AngkaTipe = (() => {
    let tipe = new Stipe(angkaSymbol, new Callable(null, (v, args) => {
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

    tipe.member.define("PLUS",
        makeBuiltInFunc([angkaSymbol, angkaSymbol], angkaSymbol, (_, [r, l]) => new Value(angkaSymbol, l.data + r.data)));
    tipe.member.define("MINUS",
        makeBuiltInFunc([angkaSymbol, angkaSymbol], angkaSymbol, (_, [r, l]) => new Value(angkaSymbol, l.data - r.data)));
    tipe.member.define("BINTANG",
        makeBuiltInFunc([angkaSymbol, angkaSymbol], angkaSymbol, (_, [r, l]) => new Value(angkaSymbol, l.data * r.data)));
    tipe.member.define("GARIS_MIRING",
        makeBuiltInFunc([angkaSymbol, angkaSymbol], angkaSymbol, (_, [r, l]) => new Value(angkaSymbol, l.data / r.data)));
    tipe.member.define("MODULUS",
        makeBuiltInFunc([angkaSymbol, angkaSymbol], angkaSymbol, (_, [r, l]) => new Value(angkaSymbol, l.data % r.data)));

    tipe.member.define("LEBIH",
        makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data > r.data)));
    tipe.member.define("KURANG",
        makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data < r.data)));
    tipe.member.define("SAMA_SAMA",
        makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data === r.data)));
    tipe.member.define("LEBIH_SAMA",
        makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data >= r.data)));
    tipe.member.define("KURANG_SAMA",
        makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data <= r.data)));
    tipe.member.define("SERU_SAMA",
        makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data !== r.data)));
    tipe.member.define("AMPERSAN",
        makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data && r.data)));
    tipe.member.define("PIPA",
        makeBuiltInFunc([angkaSymbol, angkaSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data || r.data)));
    tipe.member.define("SERU_UNER",
        makeBuiltInFunc([angkaSymbol], logisSymbol, (_, [r]) => new Value(logisSymbol, !Boolean(r.data))));
    tipe.member.define("PLUS_UNER",
        makeBuiltInFunc([angkaSymbol], angkaSymbol, (_, [r]) => new Value(angkaSymbol, +r.data)));
    tipe.member.define("MINUS_UNER",
        makeBuiltInFunc([angkaSymbol], angkaSymbol, (_, [r]) => new Value(angkaSymbol, -r.data)));

    tipe.member.define("kePetik",
        makeBuiltInFunc([angkaSymbol], petikSymbol, (v, [a]) => new Value(petikSymbol, kePetik(v, a))));

    tipe.member.define("bulat", makeBuiltInFunc([angkaSymbol], angkaSymbol, (_, [a]) => {
        return new Value(angkaSymbol, Math.round(a.data));
    }));
    tipe.member.define("bulatAtas", makeBuiltInFunc([angkaSymbol], angkaSymbol, (_, [a]) => {
        return new Value(angkaSymbol, Math.ceil(a.data))
    }));
    tipe.member.define("bulatBawah", makeBuiltInFunc([angkaSymbol], angkaSymbol, (_, [a]) => {
        return new Value(angkaSymbol, Math.floor(a.data))
    }));

    return tipe;
})();


const LogisTipe = (() => {
    let tipe = new Stipe(logisSymbol, new Callable(null, (_, args) => {
        if (args[0].type === barisSymbol && args[0].data.length === 0) {
            return new Value(logisSymbol, false);
        }
        return new Value(logisSymbol, Boolean(args[0].data) || Boolean(args[0].data?.member?.size));
    }, [[null]], logisSymbol, true)
    );

    tipe.member.define("SAMA_SAMA",
        makeBuiltInFunc([logisSymbol, logisSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data === r.data)));
    tipe.member.define("SERU_SAMA",
        makeBuiltInFunc([logisSymbol, logisSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data !== r.data)));
    tipe.member.define("AMPERSAN",
        makeBuiltInFunc([logisSymbol, logisSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data && r.data)));
    tipe.member.define("PIPA",
        makeBuiltInFunc([logisSymbol, logisSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data || r.data)));
    tipe.member.define("SERU_UNER",
        makeBuiltInFunc([logisSymbol], logisSymbol, (_, [r]) => new Value(logisSymbol, !Boolean(r.data))));

    tipe.member.define("kePetik",
        makeBuiltInFunc([logisSymbol], petikSymbol, (v, [l]) => new Value(petikSymbol, kePetik(v, l))));

    return tipe;
})();


const BarisTipe = (() => {
    let tipe = new Stipe(barisSymbol);

    const valueToVariableDatum = (d) => {
        let input = new Variable(d.type, false, d.data);
        input.member = d.member;
        input.isDatum = true;
        return input;
    }

    tipe.member.define("PLUS",
        makeBuiltInFunc([barisSymbol, barisSymbol], barisSymbol, (_, [r, l]) =>
            new Value(barisSymbol, Array(...l.data, ...r.data))
        ));

    tipe.member.define("MINUS_UNER",
        makeBuiltInFunc([barisSymbol], barisSymbol, (_, [r]) =>
            new Value(barisSymbol, r.data.slice(0, r.length))
        ));

    tipe.member.define("SAMA_SAMA",
        makeBuiltInFunc([barisSymbol, barisSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, ((a, b) => {
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) {
                if (a[i].data !== b[i].data) return false;
            }
            return true;
        })(l.data, r.data)))
    );

    tipe.member.define("SERU_SAMA",
        makeBuiltInFunc([barisSymbol, barisSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, ((a, b) => {
            if (a.length !== b.length) return true;
            for (let i = 0; i < a.length; i++) {
                if (a[i].data !== b[i].data) return true;
            }
            return false;
        })(l.data, r.data)))
    );

    tipe.member.define("AMPERSAN",
        makeBuiltInFunc([barisSymbol, barisSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data && r.data)));
    tipe.member.define("PIPA",
        makeBuiltInFunc([barisSymbol, barisSymbol], logisSymbol, (_, [r, l]) => new Value(logisSymbol, l.data || r.data)));
    tipe.member.define("SERU_UNER",
        makeBuiltInFunc([barisSymbol], logisSymbol, (_, [r]) => new Value(logisSymbol, !Boolean(r.data))));

    tipe.member.define("kePetik",
        makeBuiltInFunc([barisSymbol], petikSymbol, (v, [p]) => new Value(petikSymbol, kePetik(v, p))));

    tipe.member.define("hapus", makeBuiltInFunc([barisSymbol, angkaSymbol], barisSymbol, (v, [b, i]) => {
        if (b.data.length <= i.data) {
            v.error(`Indeks tidak boleh lebih besar atau sama dengan ukuran baris, ${i.data} >= ${b.data.length}`);
        }

        while (i.data < 0) i.data += b.data.length;
        b.data = b.data.filter((_, idx) => idx !== i.data)
        return b;
    }));

    tipe.member.define("potongan", makeBuiltInFunc([barisSymbol, angkaSymbol, angkaSymbol], barisSymbol, (v, [b, fr, to]) => {
        if (fr.data >= b.data.length || fr.data < 0 || to.data <= fr.data || to.data > b.data.length) {
            v.error(`Indeks tidak valid, ${fr.data} sampai ${to.data}, dengan ukuran baris ${b.data.length}`);
        }
        return new Value(barisSymbol, b.data.slice(fr.data, to.data));
    }));
    tipe.member.define("tumpuk", makeBuiltInFunc([barisSymbol, null], null, (_, [b, d]) => {
        b.data.push(valueToVariableDatum(d));
        return b;
    }));
    tipe.member.define("tumpah", makeBuiltInFunc([barisSymbol], null, (_, [b]) => {
        b.data.pop();
        return b;
    }))
    tipe.member.define("masuk", makeBuiltInFunc([barisSymbol, null, angkaSymbol], null, (v, [b, d, idx]) => {
        if (idx.data > b.data.length) {
            v.error(`Indeks tidak valid, ${idx.data}, dengan ukuran baris ${b.data.length}`);
        }
        b.data.splice(idx.data, 0, valueToVariableDatum(d));
        return b;
    }));
    tipe.member.define("petakan", makeBuiltInFunc([barisSymbol, mesinSymbol], barisSymbol, (v, [b, m]) => {
        let newBaris = new Value(barisSymbol, []);
        for (let datum of b.data) {
            let result = v.callFunc(m.data, [datum]);
            newBaris.data.push(valueToVariableDatum(result));
        }
        return newBaris;
    }));
    tipe.member.define("saring", makeBuiltInFunc([barisSymbol, mesinSymbol], barisSymbol, (v, [b, m]) => {
        let newBaris = new Value(barisSymbol, []);
        for (let datum of b.data) {
            let result = v.callFunc(m.data, [datum]);
            if (result.data === true) {
                newBaris.data.push(valueToVariableDatum(datum));
            }
        }
        return newBaris;
    }));
    tipe.member.define("reduksi", makeBuiltInFunc([barisSymbol, mesinSymbol, null], null, (v, [b, m, d]) => {
        for (let datum of b.data) {
            let result = v.callFunc(m.data, [d, datum]);
            d = result;
        }
        return d;
    }));

    tipe.member.define("punya?", makeBuiltInFunc([barisSymbol, null], logisSymbol, (v, [b, d]) => {
        let type = v.environment.get(d.type?.description);
        if (!type)
            v.error(`Tipe tidak ditemukan atau tidak valid`);
        let equalFunc;
        if (type.member?.has("SAMA_SAMA")) {
            equalFunc = type.member.get("SAMA_SAMA");
        } else {
            v.error(`model ${d.type.description} tidak mempunyai mesin SAMA_SAMA di dalam modulnya.`);
        }
        for (let datum of b.data) {
            if (datum.type !== d.type) continue;
            let isEqual = v.callFunc(equalFunc.data, [datum, d]);
            if (isEqual.data) return new Value(logisSymbol, true);
        }
        return new Value(logisSymbol, false);
    }))

    return tipe;
})();


const MesinTipe = (() => {
    let tipe = new Stipe(mesinSymbol);

    tipe.member.define("kePetik",
        makeBuiltInFunc([mesinSymbol], petikSymbol, (v, [m]) => new Value(petikSymbol, kePetik(v, m))));

    return tipe;
})();


export const GLOBAL_ENV = (() => {
    let env = new Environment();
    env.define("petik", PetikTipe);
    env.define("angka", AngkaTipe);
    env.define("logis", LogisTipe);
    env.define("baris", BarisTipe);
    env.define("mesin", MesinTipe);

    env.define("tulisf", makeBuiltInFunc([null, barisSymbol], null, (v, [d, b]) => {
        // THERES ANOTHER ONE ON PETIK.FORMAT
        let strTemp = kePetik(v, d);
        let finalized = "";
        let formator = b.data.map(value=>kePetik(v, value));

        for (let i = 0; i < strTemp.length; i++) {
            let ch = strTemp[i];
            if ( ch !== "{") finalized += ch;
            else {
                if (i+1 < strTemp.length && strTemp[i+1] !== "}") {
                    finalized += "{"; continue;
                } 
                i++;
                if (formator.length === 0) {
                    v.error("Baris dalam tulisf tidak mempunyai cukup elemen.")
                }
                finalized += formator.shift();
            }
        }
        if (formator.length !== 0) {
            v.error("Baris dalam tulisf mempunyai terlalu banyak elemen.")
        }
        v.output.push(finalized);
        return d;
    }))

    env.define("tulis", makeBuiltInFunc([null], null, (v, [d]) => {
        v.output.push(kePetik(v, d));
        return d;
    }))

    env.define("jarak", makeBuiltInFunc([angkaSymbol, angkaSymbol], barisSymbol,
        (_, [from, to]) => new Value(barisSymbol,
            Array(Math.abs(Math.floor(to.data - from.data)))
                .fill(0)
                .map((_, idx) => new Value(angkaSymbol, from.data + ((to.data > from.data) ? 1 : -1) * idx))))
    );

    env.define("nihil?", makeBuiltInFunc([null], logisSymbol, (_, [d]) => new Value(logisSymbol, d.data === null)));
    env.define("ukuran", makeBuiltInFunc([null], angkaSymbol, (_, [d]) => d.type === barisSymbol || d.type === petikSymbol
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
    mtkModul.member.define("acak", makeBuiltInFunc([angkaSymbol, angkaSymbol], angkaSymbol, (_, [a, b]) => {
        let width = Math.abs(a.data - b.data);
        let range = Math.random() * width;
        let final = range + Math.min(a.data, b.data);
        return new Value(angkaSymbol, final);
    }));
    mtkModul.member.define("akar2", makeBuiltInFunc([angkaSymbol], angkaSymbol, (_, [a]) => {
        return new Value(angkaSymbol, Math.sqrt(a.data));
    }));
    mtkModul.member.define("min", makeBuiltInFunc([angkaSymbol, angkaSymbol], angkaSymbol, (_, [a, b]) => {
        return new Value(angkaSymbol, Math.min(a.data, b.data));
    }));
    mtkModul.member.define("maks", makeBuiltInFunc([angkaSymbol, angkaSymbol], angkaSymbol, (_, [a, b]) => {
        return new Value(angkaSymbol, Math.max(a.data, b.data));
    }));

    const fpb = (a, b) => {
        [a, b] = [Math.max(a, b), Math.min(a, b)];
        while (b > 0) {
            [a, b] = [b, a % b];
        }
        return a
    }

    mtkModul.member.define("fpb", makeBuiltInFunc([angkaSymbol, angkaSymbol], angkaSymbol, (_, [a, b]) => {
        let fpbVal = fpb(a.data, b.data);
        return new Value(angkaSymbol, fpbVal);
    }));

    mtkModul.member.define("kpk", makeBuiltInFunc([angkaSymbol, angkaSymbol], angkaSymbol, (_, [a, b]) => {
        let fpbVal = fpb(a.data, b.data);
        return new Value(angkaSymbol, a.data * b * data / fpbVal);
    }));

    env.define("mtk", mtkModul);
    return env;
})();
