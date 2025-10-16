
export class StmtBase {
    accept(visitor) {
        return this.visit(visitor);
    }
}

export class Cetak extends StmtBase {
 // Expr.ExprBase expr
    constructor (expr) {
        super();
        this.expr = expr;
    }

    visit(visitor) {
        return visitor.visitCetakStmt(this);
    }
}

export class Datum extends StmtBase {
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

export class Type extends StmtBase {
 // Identifier type, bool tetap, Array<Stmt.Type> contents
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

export class Kerja extends StmtBase {
 // Expr.ExprBase expr
    constructor (expr) {
        super();
        this.expr = expr;
    }

    visit(visitor) {
        return visitor.visitKerjaStmt(this);
    }
}

export class Block extends StmtBase {
 // Array<Stmt.StmtBase> statements
    constructor (statements) {
        super();
        this.statements = statements;
    }

    visit(visitor) {
        return visitor.visitBlockStmt(this);
    }
}

export class Kalau extends StmtBase {
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

export class Untuk extends StmtBase {
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

export class Slagi extends StmtBase {
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

export class Henti extends StmtBase {
    constructor () {
        super();
    }

    visit(visitor) {
        return visitor.visitHentiStmt(this);
    }
}

export class Lewat extends StmtBase {
    constructor () {
        super();
    }

    visit(visitor) {
        return visitor.visitLewatStmt(this);
    }
}

