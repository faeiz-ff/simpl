
export class ExprBase {
    accept(visitor) {
        return this.visit(visitor);
    }
}

export class Binary extends ExprBase {
    // Expr.ExprBase left, Token op, Expr.ExprBase right
    constructor(left, op, right) {
        super();
        this.left = left;
        this.op = op;
        this.right = right;
    }

    visit(visitor) {
        return visitor.visitBinaryExpr(this);
    }
}

export class Unary extends ExprBase {
    // Token op, Expr.ExprBase right
    constructor(op, right) {
        super();
        this.op = op;
        this.right = right;
    }

    visit(visitor) {
        return visitor.visitUnaryExpr(this);
    }
}

export class Literal extends ExprBase {
    // Token token
    constructor(token) {
        super();
        this.token = token;
    }

    visit(visitor) {
        return visitor.visitLiteralExpr(this);
    }
}

export class Grouping extends ExprBase {
    // Expr.ExprBase expr
    constructor(expr) {
        super();
        this.expr = expr;
    }

    visit(visitor) {
        return visitor.visitGroupingExpr(this);
    }
}

export class Member extends ExprBase {
    // Expr.ExprBase main, Expr.Identifier member
    constructor(main, member) {
        super();
        this.main = main;
        this.member = member;
    }

    visit(visitor) {
        return visitor.visitMemberExpr(this);
    }
}

export class Identifier extends ExprBase {
    // Token token
    constructor(token) {
        super();
        this.token = token;
    }

    visit(visitor) {
        return visitor.visitIdentifierExpr(this);
    }
}

export class Lambda extends ExprBase {
    // Array<Stmt.Types-Token> params, Stmt.Type returnType, Stmt.Block block
    constructor(params, returnType, block) {
        super();
        this.params = params;
        this.returnType = returnType;
        this.block = block;
    }

    visit(visitor) {
        return visitor.visitLambdaExpr(this);
    }
}

export class Call extends ExprBase {
    // Expr.ExprBase callable, Expr.ExprBase args
    constructor(callable, args) {
        super();
        this.callable = callable;
        this.args = args;
    }

    visit(visitor) {
        return visitor.visitCallExpr(this);
    }
}

export class Array extends ExprBase {
    // Array<Expr.ExprBase> contents
    constructor(contents) {
        super();
        this.contents = contents;
    }

    visit(visitor) {
        return visitor.visitArrayExpr(this);
    }
}

export class Index extends ExprBase {
    // Expr.ExprBase iterable, Expr.ExprBase index
    constructor(iterable, index) {
        super();
        this.iterable = iterable;
        this.index = index;
    }

    visit(visitor) {
        return visitor.visitIndexExpr(this);
    }
}

export class PipeLine extends ExprBase {
    // Expr.ExprBase expr, Expr.ExprBase pipeTo
    constructor(expr, pipeTo) {
        super();
        this.expr = expr;
        this.pipeTo = pipeTo;
    }

    visit(visitor) {
        return visitor.visitPipeLineExpr(this);
    }
}

