import * as Expr from "./Expr.js";
import { Token } from "./Token.js";
import { ID } from "./TokenType.js";
import * as Stmt from "./Stmt.js";
import { SimplErrorEksekusi } from "./SimplError.js";
import { Environment } from "./Environment.js";
import * as Value from "./Value.js";

class Henti {}
class Lewat {}

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

        for (let expr of arrayExpr.contents) {
            let v = expr.accept(this);
            // value.data.push(v);
            value.data.push(new Value.Value(v.type, v.data));
        }

        return value;
    }

    visitIndexExpr(indexExpr) {
        // a real TODO would've been to implement real iterables
        let iterable = indexExpr.iterable.accept(this);
        if (iterable.type !== Value.barisSymbol) {
            throw new SimplErrorEksekusi("Bukan baris, tidak bisa di-indeks");
        }

        let index = indexExpr.index.accept(this);
        if (index.type !== Value.angkaSymbol) {
            throw new SimplErrorEksekusi("ekspresi di dalam indeks harus bertipe angka.");
        }

        if (index.data >= iterable.data.length) {
            throw new SimplErrorEksekusi("Indeks lebih besar atau sama dengan ukuran baris");
        }
        let i = index.data;

        while (index.data < 0) index.data += iterable.data.length;
        return iterable.data[index.data];
    }

    visitBinaryExpr(binaryExpr) {
        let leftValue = binaryExpr.left.accept(this);
        let rightValue = binaryExpr.right.accept(this);

        this.line = binaryExpr.op.line;

        let isNull = this.nullCheck(leftValue, rightValue);
        if (isNull) {
            throw new SimplErrorEksekusi(`Tidak bisa mengoperasikan nilai Nihil.`);
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
            throw new SimplErrorEksekusi(`Tidak bisa mengoperasikan nilai Nihil.`);
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
        if (!value) throw new SimplErrorEksekusi(`${identifierExpr.token.lexeme} tidak ditemukan.`);
        return value;
    }

    // STATEMENT VISITORS

    // this is needed for interpreting generics TODO!
    visitTypeStmt(typeStmt) {
        let type =  typeStmt.type.accept(this);
        if (type.type !== Value.stipeSymbol) throw new SimplErrorEksekusi(`Nilai bukan sebuah Model/Tipe Valid.`);
        return type.data;
    }

    visitCetakStmt(cetakStmt) {
        let result = cetakStmt.expr.accept(this);

        const kePetik = (thing) => {
            if (thing.type === Value.logisSymbol) {
                return thing.data ? "benar" : "salah";
            } else if (thing.type === Value.barisSymbol) {
                return '[' + thing.data.reduce((str, val)=>str+" "+kePetik(val), "") + ' ]'
            } else {
                return thing.data !== null ? thing.data.toString() : "nihil";
            }
        }

        console.log(kePetik(result));

    }

    visitKerjaStmt(kerjaStmt) {
        kerjaStmt.expr.accept(this);
    }

    visitDatumStmt(datumStmt) {
        let type = datumStmt.type.accept(this);
        let name = datumStmt.name.lexeme;

        this.line = datumStmt.name.line;

        if (this.environment.has(name)) {
            throw new SimplErrorEksekusi(`Variabel dengan nama '${name}' sudah ada.`);
        }

        let variable = new Value.Variable(type, datumStmt.type.tetap);

        let value = datumStmt.expr.accept(this);

        if (value.data === null) value.type = variable.type; // if nihil, ok

        this.typeCheck(variable, value, `Pada pembuatan variabel '${name}'`);

        variable.data = value.data; 
        // because data is always primitives (for now), this copies data;

        this.environment.define(name, variable);
    }

    visitRubahStmt(rubahStmt) {
        let variable = rubahStmt.variable.accept(this); // is a reference to the variable data
        if (variable.tetap) {
            throw new SimplErrorEksekusi(`Variabel tetap tidak dapat di-rubah.`);
        }
        let value = rubahStmt.value.accept(this);
        if (value.data === null) value.type = variable.type; // if nihil, ok

        this.typeCheck(variable, value, `Pada perubahan variabel.`);

        variable.data = value.data; // reference modifying (THANK GOD FOR THIS I LOVE YOU GARBAGE COLLECTOR)
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
        if (condition === null || condition.data) {
            kalauStmt.thenBlock.accept(this);
        } else {
            kalauStmt.elseKalau?.accept(this); // kalau may not have namun
        }
    }

    visitHentiStmt(hentiStmt) {
        throw new Henti(); // throws exception to escape from deep recursion
    }

    
    visitLewatStmt(lewatStmt) {
        throw new Lewat(); // throws exception to escape from deep recursion
    }

    visitSlagiStmt(slagiStmt) {
        while (slagiStmt.condition.accept(this).data) {
            try {
                slagiStmt.block.accept(this);
            } catch (err) {
                if (err instanceof Henti) {
                    break;
                } else if (err instanceof Lewat) {
                    continue;
                } else throw err;
            }
        }
    }

    visitUntukStmt(untukStmt) {
        let name = untukStmt.varName.lexeme;
        let type = untukStmt.varType.accept(this);
        
        let iter = untukStmt.iterable.accept(this);
        if (iter.type !== Value.barisSymbol) {
            throw new SimplErrorEksekusi("Pernyataan 'untuk' harus mengiterasi sebuah baris");
        }

        for (let i of iter.data) {
            if (i.type !== type) throw new SimplErrorEksekusi("Tipe data tidak sama.")

            let untukEnv = new Environment(this.environment);
            untukEnv.define(name, new Value.Variable(type, untukStmt.varType.tetap, i.data));
            this.environment = untukEnv;
            try {
                // didn't 'accept' the block, just uses it directly
                for (let stmt of untukStmt.block.statements) {
                    stmt.accept(this); 
                }
            } catch (err) {
                this.environment = untukEnv.enclosing;
                if (err instanceof Lewat) {
                    continue;
                } else if (err instanceof Henti) {
                    return;
                } else {
                    throw err;
                }
            }
            this.environment = untukEnv.enclosing;
        }
    }

    visitSimplStmt(simpl) {
        for (let stmt of simpl.statements) {
            stmt.accept(this);
        }
    }

    // UTILITIES

    typeCheck(a, b, message) {
        if (a.type !== b.type) {
            console.log("typecheck : ", a, " vs ", b)
            throw new SimplErrorEksekusi(`Tipe data tidak sama: ${a.type.description} != ${b.type.description}. ` + message);
        }
    }

    typeAssert(a, type) {

    }

    nullCheck(...args) {
        for (let i of args) {
            if (i.data === null) return i;
        }
        return false;
    }

    isTruthy(value) {
        if (!value) return false; // catches null and false
        if (value instanceof String && value === "") return false;
        if (value instanceof Number && value === 0) return false;
        if (value instanceof Array && value.length === 0) return false;

        return true;
    }

    interpret(tree) {
        this.tree = tree;
        tree.accept(this);
    }
}