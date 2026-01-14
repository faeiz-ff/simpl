import { SimplErrorEksekusi } from "./simpl-error.js";
import { Environment } from "./environment.js";
import * as Value from "./globals.js";
import { TOKEN_STRING } from "./token-type.js";

export class Henti { }
export class Jatuh { }
export class Lewat { }
export class Hasil {
    constructor(value) {
        this.value = value;
    }
}

// Implements all Expressions and Statements Visitor
export class Interpreter {
    constructor() {
        this.globalEnvironment = Value.GLOBAL_ENV;
        this.location = {
            GLOBAL: 1,
            SLAGI: 2,
            UNTUK: 3,
            MESIN: 4,
            LIHAT: 5,
        }
        this.MAX_STACK_SIZE = 500;
        this.init();
   }

    init() {
        this.line = 0;
        this.environment = new Environment(this.globalEnvironment);
        this.tree = null;
        this.state = this.location.GLOBAL;
        this.stack = [];
        this.output = [];
        this.objectStack = null;
        this.exprWillBeCalled = false;
        this.pipeStack = [];
    }

    interpret(tree) {
        this.line = 0;
        this.output = [];
        this.tree = tree;
        tree.accept(this);
        return this.output;
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
            let v = expr.accept(this);
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

        if (!callable?.data?.block) {
            this.error(`Mesin tidak terdefinisi, tidak bisa dipanggil.`);
        }

        let args = [];

        if (this.objectStack) {
            args = [this.objectStack];
            this.objectStack = null;
        }

        args = [...args, ...callExpr.args.map(val => val.accept(this))];

        let result = this.callFunc(callable.data, args);
        return result;
    }

    callFunc(callable, args) {
        // args.forEach((val,idx)=>{
        //     console.log(idx, val);
        // });
        if (!callable) {
            this.error(`Mesin tidak terdefinisi, tidak bisa dipanggil.`);
        }
        this.stack.push(this.line);
        if (this.stack.length > this.MAX_STACK_SIZE)
            this.error(`Rekursi melebihi batas: Lebih dari ${this.MAX_STACK_SIZE}`);

        let prevState = this.state;
        this.line = this.stack[this.stack.length - 1];
        this.state = this.location.MESIN;

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
        let leftValue = binaryExpr.left.accept(this);
        let rightValue = binaryExpr.right.accept(this);

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
        let rightValue = unaryExpr.right.accept(this);

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
        let opLexeme = TOKEN_STRING[op] + (left ? "" : "_UNER");
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
        return groupingExpr.expr.accept(this);
    }

    visitIdentifierExpr(identifierExpr) {
        if (identifierExpr.token.lexeme === "$") {
            this.line = identifierExpr.token.line;
            if (this.pipeStack.length <= 0) {
                this.error(`$ hanya ada dalam ekspresi saluran.`);
            } else {
                return this.pipeStack[this.pipeStack.length - 1];
            }
        }
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
                    return type.member.get(name);
                }
                this.error(`akses titik . dari objek ke model harus berupa panggilan/penggunaaan mesin.`);
            }
            this.error(`nama .${name} tidak ditemukan dalam tipe ${main.type.description}`);
        } else {
            return main.member.get(name);
        }
    }

    visitPipeLineExpr (pipeLineExpr) {
        let expr = pipeLineExpr.expr.accept(this);

        this.pipeStack.push(expr);

        let pipeValue = pipeLineExpr.pipeTo.accept(this);

        this.pipeStack.pop();

        return pipeValue;
    }

    // STATEMENT VISITORS

    // this is needed for interpreting generics TODO!
    visitTypeStmt(typeStmt) {
        if (typeStmt.type === null) return null;
        let type = typeStmt.type.accept(this);
        if (type.type !== Value.stipeSymbol || !(type.symbol)) 
            this.error(`'${type.type.description}' bukan sebuah Model/Tipe Valid.`);
        return type.symbol;
    }

    visitCetakStmt(cetakStmt) {
        let result = cetakStmt.expr.accept(this);
        this.output.push(Value.kePetik(this, result));

    }

    visitKerjaStmt(kerjaStmt) {
        kerjaStmt.expr.accept(this);
    }

    visitDatumStmt(datumStmt) {
        let type = datumStmt.type.accept(this);
        let name = this.validName(datumStmt.name.lexeme);
        this.line = datumStmt.name.line;

        let variable = new Value.Variable(type, datumStmt.type.tetap);

        let value = datumStmt.expr.accept(this);

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
        if (variable.tetap === undefined) {
            this.error(`Pe-rubah-an hanya dapat dilakukan kepada Variabel!`);
        }
        if (variable.tetap) {
            this.error(`Variabel tetap tidak dapat di-rubah.`);
        }
        let value = rubahStmt.value.accept(this);
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
        if (this.state === this.location.UNTUK || this.state === this.location.SLAGI)
            throw new Henti(); // throws exception to escape from deep recursion
        else this.error("Tidak ada pengulangan untuk dihentikan.");
    }


    visitLewatStmt() {
        if (this.state === this.location.UNTUK || this.state === this.location.SLAGI)
            throw new Lewat(); // throws exception to escape from deep recursion
        else this.error("Tidak ada pengulangan untuk dilewatkan.");
    }

    visitJatuhStmt() {
        if (this.state === this.location.LIHAT)
            throw new Jatuh();
        else this.error("Tidak bisa jatuh di luar blok kasus.")
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
                    this.state = this.location.SLAGI;
                    stmt.accept(this);
                    this.state = this.location.SLAGI;
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
        if (this.stackNum !== 0) this.state = this.location.MESIN;
        else this.state = this.location.GLOBAL;
    }

    visitUntukStmt(untukStmt) {
        let name = this.validName(untukStmt.varName.lexeme, false);
        let type = untukStmt.varType.accept(this);

        let iter = untukStmt.iterable.accept(this);
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
                    this.state = this.location.UNTUK;
                    stmt.accept(this);
                    this.state = this.location.UNTUK;
                }
            } catch (err) {
                this.environment = untukEnv.enclosing;
                if (err instanceof Lewat) {
                    continue;
                } else if (err instanceof Henti) {
                    break;
                } else {
                    throw err;
                }
            }
            this.environment = untukEnv.enclosing;
        }
        if (this.stackNum !== 0) this.state = this.location.MESIN;
        else this.state = this.location.GLOBAL;
    }

    visitJenisStmt(jenisStmt) {
        let name = this.validName(jenisStmt.name.lexeme);
        this.line = jenisStmt.name.line;
        this.environment.define(name, new Value.Jenis(name, jenisStmt.enums));
    }

    visitLihatStmt(lihatStmt) {
        let match = lihatStmt.expr.accept(this);
        let matchType = this.environment.get(match?.type?.description);
        if (!matchType?.member?.has("SAMA_SAMA")) {
            this.error(`tipe ${matchType ? match.type.description : "nihil"} tidak mempunyai mesin SAMA_SAMA.`);
        }
        let equalFunc = matchType.member.get("SAMA_SAMA");

        const handleBlock = (index) => {
            while (index < lihatStmt.cases.length) {
                try {
                    this.state = this.location.LIHAT;
                    lihatStmt.cases[index][1].accept(this);
                    this.state = this.location.LIHAT;
                } catch (err) {
                    if (err instanceof Jatuh) {
                        index++; continue;
                    } else throw err;
                }
                break;
            }
            if (this.stackNum !== 0) this.state = this.location.MESIN;
            else this.state = this.location.GLOBAL;
        }
        
        for (let i = 0; i < lihatStmt.cases.length; i++) {
            let someCase = lihatStmt.cases[i];

            if (!someCase[0]) return handleBlock(i);

            let expr = someCase[0].accept(this);
            let isEqual = this.callFunc(equalFunc.data, [match, expr]);
            if (isEqual.data) return handleBlock(i);
        }
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
            if (variable.member.memory.size > 1) {
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
            console.log(a, b);
            this.error(`Tipe data tidak sama: ${a.type.description} != ${b.type.description}. ` + message);
        }
    }

    nullCheck(...args) {
        for (let i of args) {
            if (i.data === null || i.type === null) return i;
        }
        return false;
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

    
}
