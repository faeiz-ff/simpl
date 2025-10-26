import * as Expr from "./Expr.js";
import { Token } from "./Token.js";
import { ID } from "./TokenType.js";
import * as Stmt from "./Stmt.js";
import { SimplRuntimeError } from "./SimplError.js";
import { Environment } from "./Environment.js";
import * as Value from "./Variable.js";

// Implements all Expressions and Statements Visitor
export class Interpreter {
    constructor() {
        this.globalEnvironment = new Environment();
        this.globalEnvironment.define("petik", new Value.PetikType());
        this.globalEnvironment.define("angka", new Value.AngkaType());
        this.globalEnvironment.define("logis", new Value.LogisType());
        this.globalEnvironment.define("mesin", new Value.MesinType());
        this.globalEnvironment.define("baris", new Value.BarisType());

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
                return new Value.Petik(lit.value);
            case "number": 
                return new Value.Angka(lit.value);
            case "boolean":
                return new Value.Logis(lit.value);
        }
    }

    visitBinaryExpr(binaryExpr) {
        let leftValue = binaryExpr.left.accept(this);
        let rightValue = binaryExpr.right.accept(this);

        this.line = binaryExpr.op.line;

        this.typeCheck(leftValue, rightValue, `Pada operasi biner ${binaryExpr.op.lexeme}`)

        
    }

    visitUnaryExpr(unaryExpr) {
        this.line = unaryExpr.op.line;

        switch (unaryExpr.op.lexeme) {
            case "+":
                return unaryExpr.right.accept(this);
            case "-":
                return - unaryExpr.right.accept(this);
            case "!":
                return !this.isTruthy(unaryExpr.right.accept(this));
        }
    }

    visitGroupingExpr(groupingExpr) {
        return groupingExpr.expr.accept(this);
    }

    visitIdentifierExpr(identifierExpr) {
        let data =  this.environment.get(identifierExpr.token.lexeme);
        this.line = identifierExpr.token.line;
        if (!data) throw new SimplRuntimeError(`${identifierExpr.token.lexeme} tidak ditemukan.`);
        return data;
    }

    // STATEMENT VISITORS

    visitTypeStmt(typeStmt) {
        let type =  typeStmt.type.accept(this).symbol;
        if (!type) throw new SimplRuntimeError("Nama Tipe Invalid.");
        return type;
    }

    visitCetakStmt(cetakStmt) {
        let result = cetakStmt.expr.accept(this);

        if (result.type === Value.logisSymbol) {
            console.log(result.data ? "benar" : "salah");
        } else {
            console.log(result.data);
        }

    }

    visitKerjaStmt(kerjaStmt) {
        kerjaStmt.expr.accept(this);
    }

    visitDatumStmt(datumStmt) {
        let type = datumStmt.type.accept(this);
        let name = datumStmt.name.lexeme;

        this.line = datumStmt.name.line;

        if (this.environment.has(name)) {
            throw new SimplRuntimeError("Variabel dengan nama yang sama sudah ada.");
        } else if (Value.RESERVED_NAMES.some(val=>val===name)) {
            throw new SimplRuntimeError("Nama variabel tidak bisa menyamai tipe primitif");
        }

        let variable = new Value.Variable(type, name);

        let value = datumStmt.expr.accept(this);

        this.typeCheck(variable, value, `Pada pembuatan variabel '${name}'`);

        variable.data = value.data;

        this.environment.define(name, variable);
    }

    visitSimplStmt(simpl) {
        for (let stmt of simpl.statements) {
            stmt.accept(this);
        }
    }

    // UTILITIES

    typeCheck(a, b, message) {
        if (a.type !== b.type) 
            throw new SimplRuntimeError(`Tipe data tidak sama: ${a.type.description} != ${b.type.description}. ` + message);
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