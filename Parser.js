import * as TokenType from "./TokenType.js";
import * as Expr from "./Expr.js";
import * as Stmt from "./Stmt.js";
import { SimplParserError } from "./SimplError.js"; 

export class Parser {
    constructor() {
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
        throw new SimplParserError(errMsg + `at ${this.see()}`);
    }

    previous() {
        return this.tokens[this.tokenIndex - 1];
    }

    identifier() {
        let id = this.previous()
        let main = null;
        if (this.match(TokenType.DOT)) {
            this.eat(TokenType.ID, "Expected Identifier");
            let member = this.identifier();
            main = new Expr.Identifier(id, member);
        } else {
            main = new Expr.Identifier(id, null);
        }

        return main;
    }

    blockStmt() {
        let statements= [];
        while(!this.match(TokenType.RCURLY)) {
            statements.push(this.statement());
        }
        return new Stmt.Block(statements);
    }

    functionCallExpr(callable) {
        let args = [];
        do {
            let expr = this.expression();
            args.push(expr);
        } while(this.match(TokenType.COMMA))

        this.eat(TokenType.RPAREN, "Expected ')' after function calling");

        return new Expr.Call(callable, args);
    }

    lambda(firstType) {
        let params = [];
        if (firstType) {
            let type = this.typeStmt(firstType);
            this.eat(TokenType.ID, "Expected identifier after type.");
            let name = this.previous();
            params.push([type, name]);
        }
        while(this.match(TokenType.COMMA)) {
            let type = this.typeStmt();
            this.eat(TokenType.ID, "Expected identifier after type.");
            let name = this.previous();
            params.push([type, name]);
        }

        this.eat(TokenType.RPAREN, "Expected Closing afer lambda parameter declarations.");

        this.eat(TokenType.ID, "Expected return type of Lambda.");
        let returnType = this.typeStmt();
        this.eat(TokenType.LCURLY, "Expected block statement after return type in lambda.");
        let block = this.blockStmt();

        return new Expr.Lambda(params, returnType, block);
    }

    primary() {
        if (this.match(TokenType.PLUS, TokenType.MINUS)) {
            let op = this.previous();
            let right = this.primary();
            return new Expr.Unary(op, right);
        } else if (this.match(TokenType.LPAREN)) {
            if (this.check(TokenType.RPAREN)) {
                return this.lambda();
            }

            let expr = this.expression();

            if (this.check(TokenType.LESS) || this.check(TokenType.ID)) {
                return this.lambda(expr);
            } 

            this.eat(TokenType.RPAREN, "Should be rparen");
            return new Expr.Grouping(expr);
        } else if (this.match(TokenType.LITERAL)){
            let literal = this.previous();
            return new Expr.Literal(literal);
        } else if (this.match(TokenType.ID)) {
            let id = this.identifier();
            if (this.match(TokenType.LPAREN)) {
                return this.functionCallExpr(id);
            }
            return id;
        }

    }

    factor() {
        let expr = this.primary();

        while(this.match(TokenType.STAR, TokenType.SLASH)) {
            let op = this.previous();
            let right = this.primary();
            expr = new Expr.Binary(expr, op, right);
        }

        return expr;
    }

    term() {
        let expr = this.factor();

        while (this.match(TokenType.PLUS, TokenType.MINUS)) {
            let op = this.previous();
            let right = this.factor();
            expr = new Expr.Binary(expr, op, right);
        }

        return expr;
    }

    equality() {
        let expr = this.term();

        while(this.match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL, TokenType.EQUAL_EQUAL)) {
            let op = this.previous();
            let right = this.term();
            expr = new Expr.Binary(expr, op, right);
        }

        return expr;
    }
    
    andTerm() {
        let expr = this.equality();

        while(this.match(TokenType.AMPERSAND)) {
            let op = this.previous();
            let right = this.equality();
            expr = new Expr.Binary(expr, op, right);
        }

        return expr;
    }

    orTerm() {
        let expr = this.andTerm();

        while(this.match(TokenType.PIPE)) {
            let op = this.previous();
            let right = this.equality();
            expr = new Expr.Binary(expr, op, right);
        }

        return expr;
    }

    expression() {
        return this.equality();
    }

    cetakStmt() {
        let expr = this.expression();
        return new Stmt.Cetak(expr);
    }

    typeStmt(type) {
        if (!type) type = this.identifier();
        let contents = [];
        if (this.match(TokenType.LESS)) {
            this.eat(TokenType.ID, "Expected type inside of <type specifier>");
            let childType = this.typeStmt();
            contents.push(childType);

            while(this.match(TokenType.COMMA)) {
                this.eat(TokenType.ID , "Expected type inside of <type specifier>");
                childType = this.typeStmt();
                contents.push(childType);
            }

            this.eat(TokenType.GREATER, "Expected closing '>' around <type specifier>");
        }

        let tetap = false;
        if (this.match(TokenType.TETAP)) {
            tetap = true
        }

        return new Stmt.Type(type, tetap, contents);
    }

    datumStmt(firstId) {
        let type = this.typeStmt(firstId);

        this.eat(TokenType.ID, "Expected Identifier");
        let id = this.previous();
        let expr = null;
        if (this.match(TokenType.EQUAL)) {
            expr = this.expression();
        }

        return new Stmt.Datum(type, id, expr);
    }

    statement() {
        if(this.match(TokenType.CETAK)) {
            return this.cetakStmt();
        } else if (this.match(TokenType.ID)) {
            let id = this.identifier();
            if(this.check(TokenType.ID) || this.check(TokenType.LESS || this.check(TokenType.TETAP))) {
                return this.datumStmt(id);
            } else if (this.match(TokenType.LPAREN)) {
                return this.functionCallExpr(id);
            }
        } else if (this.match(TokenType.KERJA)){
            return new Stmt.Kerja(this.expression());
        } else {
            throw new SimplParserError(`[Line ${this.see().line}] Statements can't start with '${this.see().lexeme}'`);
        }
    }

    parse(tokens) {
        this.tokens = tokens;
        this.tree = []
        try {
            while(!this.match(TokenType.EOF)) {
                this.tree.push(this.statement());
            }
        } catch (err) {
            console.log(err.errmsg);
        }
        return this.tree;
    }
}