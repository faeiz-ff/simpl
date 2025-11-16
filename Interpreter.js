import { SimplErrorEksekusi } from "./SimplError.js";
import { Environment } from "./Environment.js";
import * as Value from "./Value.js";

export class Henti {}
export class Lewat {}
export class Hasil {
    constructor(value) {
        this.value = value;
    }
}

const location = {
    GLOBAL: 1,
    SLAGI: 2,
    UNTUK: 3,
    MESIN: 4,
}

// Implements all Expressions and Statements Visitor
export class Interpreter {
    constructor() {
        this.globalEnvironment = Value.GLOBAL_ENV;
        this.init();
    }

    init() {
        this.tree = null;
        this.line = 0;
        this.environment = new Environment(this.globalEnvironment);
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
                return new Value.Value(Value.petikSymbol, lit.value);
            case "number": 
                return new Value.Value(Value.angkaSymbol, lit.value);
            case "boolean":
                return new Value.Value(Value.logisSymbol, lit.value);
            default:
                return new Value.Value(null, null);
        }
    }

    visitArrayExpr(arrayExpr) {
        let value = new Value.Value(Value.barisSymbol, []);

        let lastType = null;
        for (let expr of arrayExpr.contents) {
            let v = expr.accept(this);
            // value.data.push(v);
            if (lastType && lastType !== v.type) {
                this.error(`Elemen-elemen dalam baris harus mempunyai tipe yang sama: ${lastType.description} != ${v.type.description}`);
            } else if (!lastType) {
                lastType = v.type;
            }
            let result = new Value.Value(v.type, v.data);
            result.member = v.member;
            value.data.push(new Value.Value(v.type, v.data));
        }

        return value;
    }

    visitIndexExpr(indexExpr) {
        // a real TODO would've been to implement real iterables
        let iterable = indexExpr.iterable.accept(this);
        if (iterable.type === Value.petikSymbol) {
            iterable = new Value.Value(Value.barisSymbol, iterable.data.split("").map(str=>new Value.Value(Value.petikSymbol, str)));
        }
        if (iterable.type !== Value.barisSymbol) {
            this.error(`${iterable.type.description} bukan baris/petik, tidak bisa di-indeks`);
        }

        let index = indexExpr.index.accept(this);
        if (index.type !== Value.angkaSymbol) {
            this.error(`Ekspresi di dalam indeks harus bertipe angka. Menemukan ${index.type.description}`);
        }

        if (index.data >= iterable.data.length) {
            this.error(`Indeks tidak boleh lebih besar atau sama dengan ukuran baris: ${index.data} >= ${iterable.data.length}`);
        }
        let i = index.data;

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
        let lambda = new Value.Callable(this.environment, lambdaExpr.block, params, retType);
        return new Value.Value(Value.mesinSymbol, lambda);
    }

    visitCallExpr(callExpr) {
        this.stack.push(this.line);
        this.state = location.MESIN;
        let callable = callExpr.callable.accept(this);

        if (callable.type !== Value.mesinSymbol && callable.type !== Value.stipeSymbol) {
            this.error(`Hanya bisa 'memanggil' mesin atau model, malah menemukan '${callable.type.description}' `)
        }

        if (!callable.data?.callFunc) {
            this.error(`Mesin tidak terdefinisi, tidak bisa dipanggil.`);
        }
        this.line = this.stack[this.stack.length-1];
        let result = callable.data.callFunc(this, callExpr.args.map(val=>val.accept(this)));
        this.stack.pop();
        if (this.stack.length == 0) this.state = location.GLOBAL;
        return result;
    }

    visitBinaryExpr(binaryExpr) {
        let leftValue = binaryExpr.left.accept(this);
        let rightValue = binaryExpr.right.accept(this);

        this.line = binaryExpr.op.line;

        let isNull = this.nullCheck(leftValue, rightValue);
        if (isNull) {
            this.error(`Tidak bisa mengoperasikan nilai Nihil.`);
        }
        this.typeCheck(leftValue, rightValue, `Pada operasi biner ${binaryExpr.op.lexeme}`)

        let result = this.environment.get(leftValue.type.description) // get Model
            .operate(this, binaryExpr.op.type, rightValue, leftValue); // dispatch the operation

        return result;
    }

    visitUnaryExpr(unaryExpr) {
        let rightValue = unaryExpr.right.accept(this);

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
        if (!value) this.error(`${identifierExpr.token.lexeme} tidak dapat ditemukan.`);
        return value;
    }

    visitMemberExpr(memberExpr) {
        let main = memberExpr.main.accept(this);
        let name = memberExpr.member.token.lexeme;
        this.line = memberExpr.member.token.line;
        if (!main.member) {
            this.error(`Nilai tidak mempunyai atribut .${name}.`);
        } else if (!main.member.has(name)) {
            this.error(`atribut .${name} tidak dapat ditemukan.`)
        }
        return main.member.get(name);
    }

    // STATEMENT VISITORS

    // this is needed for interpreting generics TODO!
    visitTypeStmt(typeStmt) {
        let type =  typeStmt.type.accept(this);
        if (type.type !== Value.stipeSymbol) this.error(`${type.type.description} bukan sebuah Model/Tipe Valid.`);
        return type.symbol;
    }

    visitCetakStmt(cetakStmt) {
        let result = cetakStmt.expr.accept(this);
        const kePetik = (thing) => {
            if (thing.type === Value.logisSymbol) {
                return thing.data ? "benar" : "salah";
            } else if (thing.type === Value.barisSymbol) {
                return '[' + thing.data.reduce((str, val)=>str+", "+kePetik(val), "").slice(1) + ' ]';
            } else if (thing.type === Value.stipeSymbol) {
                return `Model<${thing.symbol.description}>`;
            } else if (thing.type === Value.mesinSymbol) {
                let underlying = thing.data.returnType?.description;
                return `Mesin<${underlying? underlying : 'datum'}>`;
            } else if (thing.type === Value.angkaSymbol) {
                return thing.data.toString();
            } else if (thing.type === Value.petikSymbol) {
                return thing.data;
            } else {
                if (!thing?.type) return `nihil`;
                return `${thing.type.description}<>`;
            }
        }

        this.output.push(kePetik(result));

    }

    visitKerjaStmt(kerjaStmt) {
        kerjaStmt.expr.accept(this);
    }

    visitDatumStmt(datumStmt) {
        let type = datumStmt.type.accept(this);
        let name = datumStmt.name.lexeme;
        this.line = datumStmt.name.line;

        if (this.environment.has(name)) {
            this.error(`Variabel dengan nama '${name}' sudah ada. Tidak bisa didefinisi ulang.`);
        } else if (Value.RESERVED_NAMES.some(v=>v===name)) {
            this.error(`Nama sistem (${name}) tidak boleh didefinisi ulang.`);
        }

        let variable = new Value.Variable(type, datumStmt.type.tetap);

        let value = datumStmt.expr.accept(this);

        if (value.data === null) value.type = variable.type; // if nihil, ok

        this.typeCheck(variable, value, `Pada pembuatan variabel '${name}'`);

        variable.data = value.data; 
        variable.member = value.member;

        this.environment.define(name, variable);
    }

    visitRubahStmt(rubahStmt) {
        let variable = rubahStmt.variable.accept(this); // is a reference to the variable data
        if (variable.tetap) {
            this.error(`Variabel tetap tidak dapat di-rubah.`);
        }
        let value = rubahStmt.value.accept(this);
        if (value.data === null) value.type = variable.type; // if nihil, ok

        this.typeCheck(variable, value, `Pada perubahan variabel.`);

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
            if (err instanceof Lewat || err instanceof Henti) {
                return;
            }
            throw err; // rethrows to the nearest Slagi/Untuk statement
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
            throw new Henti(); // throws exception to escape from deep recursion
        else this.error("Tidak ada pengulangan untuk dihentikan.");
    }

    
    visitLewatStmt() {
        if (this.state !== location.GLOBAL)
            throw new Lewat(); // throws exception to escape from deep recursion
        else this.error("Tidak ada pengulangan untuk dilewatkan.");
    }

    visitHasilStmt(hasilStmt) {
        if (this.stack.length == 0) {
            this.error("Tidak bisa menghasilkan diluar blok mesin.");
        }
        throw new Hasil(hasilStmt.expr.accept(this));
    }

    visitSlagiStmt(slagiStmt) {
        const checkTruthy = (v) => v.data || v.member;
        let lastEnv = this.environment;
        while (checkTruthy(slagiStmt.condition.accept(this))) {
            this.environment = new Environment(lastEnv);
            try {
                for (let stmt of slagiStmt.block.statements) {
                    this.state = location.SLAGI;
                    stmt.accept(this); 
                    this.state = location.SLAGI;
                }
            } catch (err) {
                if (err instanceof Henti) {
                    break;
                } else if (err instanceof Lewat) {
                    continue;
                } else throw err;
            }
        }
        this.environment = lastEnv;
        if (this.stackNum !== 0) this.state = location.MESIN;
        else this.state = location.GLOBAL;
    }

    visitUntukStmt(untukStmt) {
        let name = untukStmt.varName.lexeme;
        let type = untukStmt.varType.accept(this);
        
        let iter = untukStmt.iterable.accept(this);
        if (iter.type === Value.petikSymbol) {
            iter = new Value.Value(Value.barisSymbol, iter.data.split("").map(str=>new Value.Value(Value.petikSymbol, str)));
        }
        if (iter.type !== Value.barisSymbol) {
            this.error(`Pernyataan 'untuk' harus mengiterasi sebuah baris atau petik, bukan ${iter.type.description}`);
        }

        for (let idx = 0; idx < iter.data.length; idx++) {
            let i = iter.data[idx];
            if (i.type !== type) this.error(`Tipe data tidak sama pada indeks ke-${idx}: ${i.type.description} != ${type.description}.`);

            let untukEnv = new Environment(this.environment);
            untukEnv.define(name, new Value.Variable(type, untukStmt.varType.tetap, i.data));
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
                if (err instanceof Lewat) {
                    continue;
                } else if (err instanceof Henti) {
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
        let name = jenisStmt.name.lexeme;
        this.environment.define(name, new Value.Jenis(name, jenisStmt.enums));
    }

    visitSimplStmt(simpl) {
        for (let stmt of simpl.statements) {
            stmt.accept(this);
        }
    }

    visitModelStmt(modelStmt) {
        let name = modelStmt.name.lexeme;
        this.line = modelStmt.name.token;
        this.environment.define(name, new Value.Model(name, modelStmt.contents));
    }

    visitModulStmt(modulStmt) {
        let name = modulStmt.name.lexeme;
        this.line = modulStmt.name.line;
        let variable = this.environment.get(name);
        if (variable) {
            if (variable.type !== Value.stipeSymbol) {
                this.error(`Modul hanya bisa _ditambahkan_ pada tipe. ${name} bukan merupakan tipe.`);
            }
            if (variable.member) {
                this.error(`Tipe ${name} sudah memiliki modul sendiri, tidak bisa definisi ulang.`);
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
            let res = new Value.Variable(Value.modulSymbol, true, null);
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
            if (i.data === null) return i;
        }
        return false;
    }

    error(message) {
        throw new SimplErrorEksekusi(`Error Eksekusi [Pada baris ke-${this.line}] ${message}`);
    }

    interpret(tree) {
        this.init();
        this.tree = tree;
        tree.accept(this);
        return this.output;
    }
}