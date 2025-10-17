import * as TokenType from "./TokenType.js";
import * as Expr from "./Expr.js";
import * as Stmt from "./Stmt.js";
import { SimplError, SimplParserError } from "./SimplError.js"; 

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
        this.error(errMsg);
    }

    previous() {
        return this.tokens[this.tokenIndex - 1];
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

        if (this.check(TokenType.RPAREN)) {
        } else {
            do {
                let expr = this.expression();
                args.push(expr);
            } while(this.match(TokenType.COMMA))
        }

        this.eat(TokenType.RPAREN, "Mengharapkan ')' setelah pemanggilan fungsi");

        return new Expr.Call(callable, args);
    }

    lambda(firstType) {
        let params = [];
        if (firstType) {
            let type = this.typeStmt(firstType);
            this.eat(TokenType.ID, "Mengharapkan Nama setelah deklarasi Tipe dalam Lamda.");
            let name = this.previous();
            params.push([type, name]);
        }
        while(this.match(TokenType.COMMA)) {
            let type = this.typeStmt();
            this.eat(TokenType.ID, "Mengharapkan Nama setelah deklarasi Tipe dalam Lamda.");
            let name = this.previous();
            params.push([type, name]);
        }

        this.eat(TokenType.RPAREN, "Mengharapkan ')' setelah deklarasi parameter Lamda.");

        this.eat(TokenType.ID, "Mengharapkan Tipe hasil Lamda.");
        let returnType = this.typeStmt();
        this.eat(TokenType.LCURLY, "Mengharapkan Blok { } untuk Lamda.");
        let block = this.blockStmt();

        return new Expr.Lambda(params, returnType, block);
    }

    arrayExpr() {
        if (this.match(TokenType.RSQUARE)) {
            return new Expr.Array([]);
        }

        let contents = [];
        do {
            let expr = this.expression();
            contents.push(expr);
        } while (this.match(TokenType.COMMA))

        this.eat(TokenType.RSQUARE, "Mengharapkan ']' untuk menutup 'baris'.")

        return new Expr.Array(contents);
    }

    arrayIndex(iterable) {
        let index = this.expression();

        this.eat(TokenType.RSQUARE, "Mengharapkan ']' untuk menutup indeks." );

        return new Expr.Index(iterable, index);
    }

    primary() {
        if (this.match(TokenType.LPAREN)) {
            if (this.check(TokenType.RPAREN)) {
                return this.lambda();
            }
            let expr = this.expression();
            if (this.check(TokenType.LESS) || this.check(TokenType.ID)) {
                return this.lambda(expr);
            } 
            this.eat(TokenType.RPAREN, "Mengharapkan ')' untuk mengakhiri ekspresi kurung");
            return new Expr.Grouping(expr);
        } else if (this.match(TokenType.LITERAL)){
            let literal = this.previous();
            return new Expr.Literal(literal);
        } else if (this.match(TokenType.ID)) {
            return this.valuable();
        }
        
        this.error("Mengharapkan Ekspresi valid.")
    }

    valuable() {
        let result = this.identifier();

        while(true) {
            if (this.match(TokenType.LPAREN)) {
                result = this.functionCallExpr(result);
            } else if (this.match(TokenType.LSQUARE)) {
                result = this.arrayIndex(result);
            } else if (this.match(TokenType.DOT)) {
                result = this.member(result);
            } else {
                break;
            }
        }

        return result;
    }

    unary() {
        if (this.match(TokenType.PLUS, TokenType.MINUS, TokenType.BANG)) {
            let op = this.previous();
            let right = this.unary();
            return new Expr.Unary(op, right);
        } else {
            return this.primary();
        }
    }

    identifier() {
        return new Expr.Identifier(this.previous());
    }

    member(parent) {
        this.eat(TokenType.ID, "Mengharapkan Nama member setelah '.'.");
        let id = this.identifier();
        return new Expr.Member(parent, id);
    }  

    factor() {
        let expr = this.unary();

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
        if (!type) type = this.valuable();
        let contents = [];
        if (this.match(TokenType.LESS)) {
            this.eat(TokenType.ID, "Mengharapkan Tipe didalam < >.");
            let childType = this.typeStmt();
            contents.push(childType);

            while(this.match(TokenType.COMMA)) {
                this.eat(TokenType.ID , "Mengharapkan Tipe di dalam < >.");
                childType = this.typeStmt();
                contents.push(childType);
            }

            this.eat(TokenType.GREATER, "Mengharapkan '>' untuk mengakhiri deklarasi Tipe.");
        }

        let tetap = false;
        if (this.match(TokenType.TETAP)) {
            tetap = true
        }

        return new Stmt.Type(type, tetap, contents);
    }

    datumStmt(firstId) {
        let type = this.typeStmt(firstId);
        console.log(type);
        this.eat(TokenType.ID, "Mengharapkan Nama pada deklarasi variabel.");
        let id = this.identifier();
        let expr = null;
        if (this.match(TokenType.EQUAL)) {
            expr = this.expression();
        }

        return new Stmt.Datum(type, id, expr);
    }

    kalauStmt() {
        if (this.check(TokenType.LCURLY)) {
            this.error("Mengharapkan ekspresi setelah 'kalau'.");
        }
        let condition = this.expression();
        this.eat(TokenType.LCURLY, "Mengharapkan blok { } untuk Statement 'kalau'.");
        let block = this.blockStmt();
        let elseKalau = null;

        if (this.match(TokenType.NAMUN)) {
            if (this.match(TokenType.KALAU)) {
                elseKalau = this.kalauStmt();
            } else if (this.match(TokenType.LCURLY)) {
                let elseCond = null;
                let elseBlock = this.blockStmt();
                elseKalau = new Stmt.Kalau(elseCond, elseBlock, null);
            } else {
                this.error("Mengharapkan sebuah 'kalau' atau blok { } setelah 'namun'.")
            }
        }

        return new Stmt.Kalau(condition, block, elseKalau);

    }

    untukStmt() {
        this.eat(TokenType.ID, "Mengharapkan Tipe variabel untuk diinisialisasi setelah 'untuk'.")
        let varType = this.typeStmt();
        this.eat(TokenType.ID, "Mengharapkan Nama variabel setelah Tipe dalam statement 'untuk'.");
        let varName = this.previous();
        this.eat(TokenType.DALAM, "Mengharapkan 'dalam' setelah deklarasi variabel pada statement 'untuk'.");

        let iterable = this.expression();

        this.eat(TokenType.LCURLY, "Mengharapkan Blok { } pada statement 'untuk'.");
        let block = this.blockStmt();

        return new Stmt.Untuk(varType, varName, iterable, block);
    }

    slagiStmt() {
        let condition = this.expression();

        this.eat(TokenType.LCURLY, "Mengharapkan Blok { } pada statement 'untuk'.");
        let block = this.blockStmt();

        return new Stmt.Slagi(condition, block);
    }

    rubahStmt() {
        let id = this.valuable();
        this.eat(TokenType.EQUAL, "Mengharapkan '=' setelah variable yang ingin di-'rubah'.");
        let expr = this.expression();
        return new Stmt.Rubah(id, expr);
    }

    statement() {
        if(this.match(TokenType.CETAK)) {
            return this.cetakStmt();
        } else if (this.match(TokenType.ID)) {
            let id = this.valuable();
            if(this.check(TokenType.ID) || this.check(TokenType.LESS || this.check(TokenType.TETAP))) {
                return this.datumStmt(id);
            }
        } else if (this.match(TokenType.KERJA)){
            return new Stmt.Kerja(this.expression());
        } else if (this.match(TokenType.KALAU)) {
            return this.kalauStmt();
        } else if (this.match(TokenType.LCURLY)) {
            return this.blockStmt();
        } else if (this.match(TokenType.UNTUK)){
            return this.untukStmt();
        } else if (this.match(TokenType.SLAGI)) {
            return this.slagiStmt();
        } else if (this.match(TokenType.HENTI)) {
            return new Stmt.Henti();
        } else if (this.match(TokenType.LEWAT)) {
            return new Stmt.Lewat();
        } else if (this.match(TokenType.RUBAH)) {
            return this.rubahStmt();
        } else {
            this.error(`Statement tidak bisa diawali '${this.see().lexeme}'.`);
        }
    }

    error(errmsg) {
        throw new SimplParserError(`Error: [Baris ${this.see().line}] ` + errmsg + ` Menemukan '${this.see().lexeme}'.`);
    }

    parse(tokens) {
        this.tokens = tokens;
        this.tree = []
        try {
            while(!this.match(TokenType.EOF)) {
                console.log("")
                this.tree.push(this.statement());
            }
        } catch (err) {
            console.log(err.errmsg);
        }
        return this.tree;
    }
}