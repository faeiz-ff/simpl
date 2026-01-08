import { SimplErrorEksekusi } from "./simpl-error.js";
import { Environment } from "./environment.js";
import * as Value from "./globals.js";
import * as TokenType from "./token-type.js";

export class Henti { }
export class Lewat { }
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
const MAX_STACK_SIZE = 500;

// Implements all Expressions and Statements Visitor
export class Interpreter {
    constructor() {
        this.globalEnvironment = Value.GLOBAL_ENV;
        this.line = 0;
        this.environment = new Environment(this.globalEnvironment);
        this.tree = null;
        this.state = location.GLOBAL;
        this.stack = [];
        this.output = [];
        this.objectStack = null;
        this.exprWillBeCalled = false;
    }

    // EXPRESSION VISITORS

    visitLiteralExpr(literalExpr) {
        let lit = literalExpr.token;
        this.line = lit.line;
        switch (typeof lit.value) {
            case "string":
                return new Value.Value(Value.petikSymbol, lit.value);
            case "number":
                return new Value.Value(Value.angkaSymbol, lit.value);
            case "boolean":
                return new Value.Value(Value.logisSymbol, lit.value);
            default:
                return Value.NIHIL;
        }
    }

    visitArrayExpr(arrayExpr) {
        let value = new Value.Value(Value.barisSymbol, []);

        for (let expr of arrayExpr.contents) {
            let v = this.validValue(expr.accept(this));
            let newVar = new Value.Variable(v.type, false, v.data);
            newVar.member = v.member;
            newVar.isDatum = true;
            value.data.push(newVar);
        }

        return value;
    }

    visitIndexExpr(indexExpr) {
        // a real TODO would've been to implement real iterables
        let iterable = indexExpr.iterable.accept(this);
        if (iterable.type === Value.petikSymbol) {
            iterable = new Value.Value(Value.barisSymbol, iterable.data.split("").map(str => new Value.Value(Value.petikSymbol, str)));
        }
        if (iterable.type !== Value.barisSymbol) {
            this.error(`'${iterable.type.description}' bukan baris/petik, tidak bisa di-indeks`);
        }

        let index = indexExpr.index.accept(this);
        if (index.type !== Value.angkaSymbol) {
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
        let params = lambdaExpr.params.map(val => [val[0].accept(this), val[0].tetap, val[1].lexeme]);

        const check_duplicate_name = (p) => {
            let mapped = new Map();
            for (let name of p) {
                if (mapped.has(name)) return true;
                mapped.set(name, true);
            }
            return false;
        }

        if (params.length > 1
            && check_duplicate_name(params.map(p => p[2]))) {
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

        this.exprWillBeCalled = true;
        let callable = callExpr.callable.accept(this);
        this.exprWillBeCalled = false;

        if (callable.type !== Value.mesinSymbol && callable.type !== Value.stipeSymbol) {
            this.error(`Hanya bisa 'memanggil' mesin atau model, malah menemukan ${callable.type.description}. `)
        }

        if (!callable.data?.block) {
            this.error(`Mesin tidak terdefinisi, tidak bisa dipanggil.`);
        }

        let args = [];

        if (this.objectStack) {
            args = [this.objectStack];
            this.objectStack = null;
        }

        args = [...args, ...callExpr.args.map(val => this.validValue(val.accept(this)))];

        let result = this.callFunc(callable.data, args);
        return result;
    }

    callFunc(callable, args) {
        // args.forEach((val,idx)=>{
        //     console.log(idx, val);
        // });
        this.stack.push(this.line);
        if (this.stack.length > MAX_STACK_SIZE)
            this.error(`Rekursi melebihi batas: Lebih dari ${MAX_STACK_SIZE}`);

        let prevState = this.state;
        this.line = this.stack[this.stack.length - 1];
        this.state = location.MESIN;

        if (args.length !== callable.parameters.length) {
            this.error(`Jumlah argumen tidak sama dengan parameter mesin. Menemukan ${args.length}, harusnya ${callable.parameters.length}.`);
        }

        // for asserting _call_ error.
        let callLineNum = this.line;

        for (let i = 0; i < args.length; i++) {
            let type = callable.parameters[i][0];

            if (type === null) continue;
            if (args[i].type !== type) {
                this.line = callLineNum;
                this.error(`Tipe argumen tidak sama dengan parameter. Menemukan ${args[i].type.description}, harusnya ${type.description}`);
            }
        }

        if (callable.isBuiltIn) {
            this.stack.pop();
            this.state = prevState;
            return callable.block(this, args);
        }

        let visitorEnv = this.environment;
        let funcEnv = new Environment(callable.closure);
        this.environment = funcEnv;

        for (let i = 0; i < args.length; i++) {
            let [type, tetap, name] = callable.parameters[i];
            if (type === null) {
                type = args[i].type;
            }
            let variable = new Value.Variable(type, tetap, args[i].data);
            variable.member = args[i].member;

            this.environment.define(name, variable);
        }

        let result = Value.NIHIL;
        for (let stmt of callable.block.statements) {
            try {
                stmt.accept(this);
            } catch (err) {
                if (err instanceof Hasil) {
                    result = err.value;
                    break;
                } else if (err instanceof Henti || err instanceof Lewat) {
                    this.error("Tidak bisa menghentikan atau melewatkan mesin. ");
                } else throw err;
            }
        }
        this.stack.pop();
        this.state = prevState;
        this.environment = visitorEnv;
        return result;
    }


    visitBinaryExpr(binaryExpr) {
        let leftValue = this.validValue(binaryExpr.left.accept(this));
        let rightValue = this.validValue(binaryExpr.right.accept(this));

        this.line = binaryExpr.op.line;

        let isNull = this.nullCheck(leftValue, rightValue);
        if (isNull) {
            this.error(`Tidak bisa mengoperasikan nilai Nihil.`);
        }
        this.typeCheck(leftValue, rightValue, `Pada operasi biner ${binaryExpr.op.lexeme}`)

        let type = this.environment.get(leftValue.type.description)
        let result = this.operate(type, binaryExpr.op.type, rightValue, leftValue); 

        return result;
    }

    visitUnaryExpr(unaryExpr) {
        let rightValue = this.validValue(unaryExpr.right.accept(this));

        this.line = unaryExpr.op.line;

        let isNull = this.nullCheck(rightValue);
        if (isNull) {
            this.error(`Tidak bisa mengoperasikan nilai Nihil.`);
        }

        let type = this.environment.get(rightValue.type.description) 
        let result = this.operate(type, unaryExpr.op.type, rightValue); 

        return result;
    }

    operate(type, op, right, left) {
        let opLexeme = TokenType.TOKEN_STRING[op] + (left ? "" : "_UNER");
        let operatorFunc = type.member.get(opLexeme);
        if (!operatorFunc)
            this.error(`operator ${opLexeme} tidak terdefinisi untuk Model ${right.type.description}.`);

        let result = null;
        if (left) { // Binary
            result = this.callFunc(operatorFunc.data, [right, left]);
        } else { // Unary, safe because valid unary op is just + - ! in the parser
            result = this.callFunc(operatorFunc.data, [right]);
        }
        return result;
    }

    visitGroupingExpr(groupingExpr) {
        return this.validValue(groupingExpr.expr.accept(this));
    }

    visitIdentifierExpr(identifierExpr) {
        let value = this.environment.get(identifierExpr.token.lexeme);
        this.line = identifierExpr.token.line;
        if (!value) this.error(`'${identifierExpr.token.lexeme}' tidak dapat ditemukan.`);
        return value;
    }

    visitMemberExpr(memberExpr) {
        let willBeCalled = this.exprWillBeCalled;
        this.exprWillBeCalled = false;
        let main = memberExpr.main.accept(this);
        let name = memberExpr.member.token.lexeme;
        this.line = memberExpr.member.token.line;
        if (!main?.member || !main.member.has(name)) {
            const type = this.environment.get(main.type.description);
            if (!type) {
                this.error(`nama .${name} tidak ditemukan.`);
            }
            if (type.member?.has(name)) {
                if (willBeCalled) {
                    this.objectStack = main;
                }
                return type.member.get(name);
            }
            this.error(`nama .${name} tidak ditemukan dalam tipe ${main.type.description}`);
        } else {
            return main.member.get(name);
        }
    }

    // STATEMENT VISITORS

    // this is needed for interpreting generics TODO!
    visitTypeStmt(typeStmt) {
        if (typeStmt.type === null) return null;
        let type = typeStmt.type.accept(this);
        if (type.type !== Value.stipeSymbol) this.error(`'${type.type.description}' bukan sebuah Model/Tipe Valid.`);
        return type.symbol;
    }

    visitCetakStmt(cetakStmt) {
        let result = cetakStmt.expr.accept(this);
        const kePetik = (thing) => {
            if (thing.type === Value.logisSymbol) {
                return thing.data ? "benar" : "salah";
            } else if (thing.type === Value.barisSymbol) {
                return '[' + thing.data.reduce((str, val) => {
                    let item = kePetik(val);
                    return str + ", " + (val.type === Value.petikSymbol ? `"${item}"` : item);
                }, "").slice(1) + ' ]';
            } else if (thing.type === Value.stipeSymbol) {
                return `Model<${thing.symbol.description}>`;
            } else if (thing.type === Value.mesinSymbol) {
                let underlying = thing.data.returnType?.description;
                return `Mesin<${underlying ? underlying : 'datum'}>`;
            } else if (thing.type === Value.angkaSymbol) {
                return thing.data.toString();
            } else if (thing.type === Value.petikSymbol) {
                return thing.data;
            } else {
                if (!thing?.type) return `nihil`;
                let type = this.environment.get(thing.type.description);
                if (type?.member?.has("kePetik")) {
                    let prevState = this.state;
                    this.state = location.MESIN;
                    this.stack.push(this.line);
                    let res = this.callFunc(type.member.get("kePetik").data, [thing]).data;
                    this.stack.pop();
                    this.state = prevState;
                    return res;
                }
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
        let name = this.validName(datumStmt.name.lexeme);
        this.line = datumStmt.name.line;

        let variable = new Value.Variable(type, datumStmt.type.tetap);

        let value = this.validValue(datumStmt.expr.accept(this));

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
        let value = this.validValue(rubahStmt.value.accept(this));
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
        if (condition?.type && condition?.type !== Value.logisSymbol) {
            this.error(`Ekspresi dalam 'kalau' harus bertipe logis, menemukan ${condition.type ? condition.type.description : "nihil"}`);
        }
        if (condition === null || condition === undefined || condition.data) {
            kalauStmt.thenBlock.accept(this);
        } else {
            kalauStmt.elseKalau?.accept(this); // kalau may not have namun
        }
    }

    visitHentiStmt() {
        if (this.state === location.UNTUK || this.state === location.SLAGI)
            throw new Henti(); // throws exception to escape from deep recursion
        else this.error("Tidak ada pengulangan untuk dihentikan.");
    }


    visitLewatStmt() {
        if (this.state === location.UNTUK || this.state === location.SLAGI)
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
        const checkTruthy = (v) => {
            if (v.type !== Value.logisSymbol) {
                this.error(`Ekspresi dalam 'slagi' harus bertipe 'logis', menemukan ${v.type ? v.type.description : "nihil" }`)
            }
            return v.data;
        }
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
        let name = this.validName(untukStmt.varName.lexeme, false);
        let type = untukStmt.varType.accept(this);

        let iter = this.validValue(untukStmt.iterable.accept(this));
        if (iter.type === Value.petikSymbol) {
            iter = new Value.Value(Value.barisSymbol, iter.data.split("").map(str => new Value.Value(Value.petikSymbol, str)));
        }
        if (iter.type !== Value.barisSymbol) {
            this.error(`Pernyataan 'untuk' harus mengiterasi sebuah baris atau petik, bukan ${iter.type.description}`);
        }

        for (let idx = 0; idx < iter.data.length; idx++) {
            let i = iter.data[idx];
            let val = new Value.Variable(i.type, untukStmt.type?.tetap ? true : false, i.data);
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
        let name = this.validName(jenisStmt.name.lexeme);
        this.line = jenisStmt.name.line;
        this.environment.define(name, new Value.Jenis(name, jenisStmt.enums));
    }

    visitSimplStmt(simpl) {
        for (let stmt of simpl.statements) {
            stmt.accept(this);
        }
    }

    visitModelStmt(modelStmt) {
        let name = this.validName(modelStmt.name.lexeme);
        this.line = modelStmt.name.line;
        this.environment.define(name, new Value.Model(name, modelStmt.contents));
    }

    visitModulStmt(modulStmt) {
        let name = this.validName(modulStmt.name.lexeme, false);
        this.line = modulStmt.name.line;
        let variable = this.environment.get(name);
        if (variable) {
            if (variable.type !== Value.stipeSymbol) {
                this.error(`Modul hanya bisa _ditambahkan_ pada tipe. '${name}' bukan merupakan tipe.`);
            }
            if (variable.member.memory.size > 0) {
                this.error(`Tipe '${name}' sudah memiliki modul sendiri, tidak bisa definisi ulang.`);
            }
        } else {
            variable = new Value.Variable(Value.modulSymbol, true, null);
            variable.member = new Environment();
            this.environment.define(name, variable);
        }

        let lastEnv = this.environment;
        variable.member.enclosing = this.environment;
        this.environment = variable.member;
        for (let stmt of modulStmt.statements) {
            stmt.accept(this);
        }

        [this.environment, variable.member] = [lastEnv, this.environment];

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

    validValue(v) {
        if (v.type !== Value.stipeSymbol) return v;
        this.error("stipe tidak dapat menjadi nilai.");
    }

    validName(n, checkExisted = true) {
        if (Value.RESERVED_NAMES.some(v => v === n)) {
            this.error(`Nama sistem (${n}) tidak boleh didefinisi ulang.`);
        } else if (checkExisted && this.environment.has(n)) {
            this.error(`Variabel dengan nama '${n}' sudah ada. Tidak bisa didefinisi ulang.`);
        }
        return n;
    }

    error(message) {
        throw new SimplErrorEksekusi(`Error Eksekusi => ${message}`, this.line, this.output.join('\n'));
    }

    interpret(tree) {
        this.line = 0;
        this.output = [];
        this.tree = tree;
        tree.accept(this);
        return this.output;
    }
}
