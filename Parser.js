import * as TokenType from "./TokenType.js";
import * as Expr from "./Expr.js";
import * as Stmt from "./Stmt.js";
import { SimplErrorStruktur } from "./SimplError.js"; 

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

    lambda() {
        let params = [];
        this.eat(TokenType.LPAREN, "Mengharapkan '(' setelah '=>' untuk deklarasi Lamda.")

        if (this.match(TokenType.ID)) {
            let type = this.typeStmt();
            this.eat(TokenType.ID, "Mengharapkan Nama parameter setelah deklarasi Tipe parameter dalam Lamda.");
            let name = this.previous();
            params.push([type, name]);
                
            while(this.match(TokenType.COMMA)) {
                this.eat(TokenType.ID, "Mengharapkan Tipe parameter setelah ',' dalam Lamda.");
                let type = this.typeStmt();
                this.eat(TokenType.ID, "Mengharapkan Nama parameter setelah deklarasi Tipe parameter dalam Lamda.");
                let name = this.previous();
                params.push([type, name]);
            }
        }
        // deepPrint(params);
        this.eat(TokenType.RPAREN, "Mengharapkan ')' setelah deklarasi parameter Lamda.");
        let returnType = null;
        if (this.match(TokenType.ID)) {
            returnType = this.typeStmt();
        } if (this.match(TokenType.LITERAL)) {
            if (this.previous().value !== null) {
                this.error("Mengharapkan Tipe Hasil yang valid.");
            }
            returnType = null;
        }
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
            if (this.check(TokenType.RSQUARE)) break;
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
            let expr = this.expression();
            this.eat(TokenType.RPAREN, "Mengharapkan ')' untuk mengakhiri ekspresi kurung");
            return new Expr.Grouping(expr);
        } else if (this.match(TokenType.LITERAL)){
            return new Expr.Literal(this.previous());
        } else if (this.match(TokenType.ID)) {
            return this.identifier();
        } else if (this.match(TokenType.ARROW)) {
            return this.lambda();
        } else if (this.match(TokenType.LSQUARE)) {
            return this.arrayExpr();
        }
        
        this.error("Mengharapkan Ekspresi valid.")
    }

    valuable() {
        let result = this.primary();

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
            return this.valuable();
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
            let right = this.unary();
            expr = new Expr.Binary(expr, op, right);
        }

        return expr;
    }

    term() {
        let expr = this.factor();

        while (this.match(TokenType.MODULUS, TokenType.PLUS, TokenType.MINUS)) {
            let op = this.previous();
            let right = this.factor();
            expr = new Expr.Binary(expr, op, right);
        }

        return expr;
    }

    equality() {
        let expr = this.term();

        while(this.match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL, TokenType.EQUAL_EQUAL, TokenType.BANG_EQUAL)) {
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
        return this.orTerm();
    }

    cetakStmt() {
        let expr = this.expression();
        return new Stmt.Cetak(expr);
    }

    typeStmt() {
        let type = this.identifier();
        // while (this.match(TokenType.DOT)) {
        //     type = this.member(type);
        // }

        let contents = [];
        // if (this.match(TokenType.LESS)) {
        //     this.eat(TokenType.ID, "Mengharapkan Tipe setelah '<' di dalam < spesifikasi Tipe >.");
        //     let innerType = this.typeStmt();
        //     contents.push(innerType);

        //     // while(this.match(TokenType.COMMA)) {
        //     //     this.eat(TokenType.ID, "Mengharapkan Tipe setelah ',' di dalam < spesifikasi Tipe >.");
        //     //     innerType = this.typeStmt();
        //     //     contents.push(innerType);
        //     // }

        //     this.eat(TokenType.GREATER, "Mengharapkan '>' setelah spesifikasi Tipe.");
        // }

        let tetap = false;
        if (this.match(TokenType.TETAP)) {
            tetap = true;
        }
        return new Stmt.Type(type, tetap, contents);
    }

    datumStmt() {
        let type = this.typeStmt();
        this.eat(TokenType.ID, "Mengharapkan Nama setelah Tipe pada deklarasi variabel.");
        let id = this.previous();
        this.eat(TokenType.EQUAL, "Mengharapkan '=' setelah Nama variabel.");
        let expr = this.expression();
        return new Stmt.Datum(type, id, expr);
    }

    kalauStmt() {
        if (this.check(TokenType.LCURLY)) {
            this.error("Mengharapkan ekspresi setelah 'kalau'.");
        }
        let condition = this.expression();
        this.eat(TokenType.LCURLY, "Mengharapkan blok { } setelah kondisi untuk pernyataan 'kalau'.");
        let block = this.blockStmt();
        let elseKalau = null;

        if (this.match(TokenType.NAMUN)) {
            if (this.match(TokenType.KALAU)) {
                elseKalau = this.kalauStmt();
            } else if (this.match(TokenType.LCURLY)) {
                let elseCond = null;
                let elseBlock = this.blockStmt();
                elseKalau = new Stmt.Kalau(elseCond, elseBlock);
            } else {
                this.error("Mengharapkan sebuah 'kalau' atau blok { } setelah 'namun'.")
            }
        }

        return new Stmt.Kalau(condition, block, elseKalau);

    }

    untukStmt() {
        this.eat(TokenType.ID, "Mengharapkan Tipe variabel untuk diinisialisasi setelah 'untuk'.")
        let varType = this.typeStmt();
        this.eat(TokenType.ID, "Mengharapkan Nama variabel setelah Tipe dalam pernyataan 'untuk'.");
        let varName = this.previous();
        this.eat(TokenType.DALAM, "Mengharapkan 'dalam' setelah deklarasi variabel pada pernyataan 'untuk'.");

        let iterable = this.expression();

        this.eat(TokenType.LCURLY, "Mengharapkan Blok { } setelah kondisi pada pernyataan 'untuk'.");
        let block = this.blockStmt();

        return new Stmt.Untuk(varType, varName, iterable, block);
    }

    slagiStmt() {
        let condition = this.expression();

        this.eat(TokenType.LCURLY, "Mengharapkan Blok { } setelah kondisi pada pernyataan 'slagi'.");
        let block = this.blockStmt();

        return new Stmt.Slagi(condition, block);
    }

    rubahStmt() {
        let id = this.valuable();
        this.eat(TokenType.EQUAL, "Mengharapkan '=' setelah variable yang ingin di-'rubah'.");
        let expr = this.expression();
        return new Stmt.Rubah(id, expr);
    }

    jenisStmt() {
        this.eat(TokenType.ID, "Mengharapkan Nama Jenis setelah 'jenis'.");
        let id = this.previous();
        this.eat(TokenType.LPAREN, "Mengharapkan '(' setelah deklarasi Nama Jenis.");
        if (this.check(TokenType.RPAREN)) {
            this.error("Isian Jenis tidak boleh kosong.", false);
        }   
        let enums = []
        do {
            this.eat(TokenType.ID, "Mengharapkan macam jenis dalam 'jenis'.");
            let enumb = this.previous();
            enums.push(enumb);
        } while(this.match(TokenType.COMMA))

        this.eat(TokenType.RPAREN, "Mengharapkan ')' untuk mengakhiri deklarasi 'jenis'.")

        return new Stmt.Jenis(id, enums);
    }

    modelStmt() {
        this.eat(TokenType.ID, "Mengharapkan Nama Model setelah 'model'.");
        let id = this.previous();

        this.eat(TokenType.LPAREN, "Mengharapkan '(' setelah Nama Model dalam 'model'.");
        if (this.check(TokenType.RPAREN)) {
            this.error("Model tidak boleh tanpa isian.", false);
        }
        
        let contents = [];
        do {
            this.eat(TokenType.ID, "Mengharapkan Tipe member dalam deklarasi 'model'.");
            let type = this.typeStmt();
            this.eat(TokenType.ID, "Mengharapkan Nama member dalam deklarasi 'model'.");
            let memberName = this.previous();

            contents.push([type, memberName]);
        } while(this.match(TokenType.COMMA))

        this.eat(TokenType.RPAREN, "Mengharapkan ')' untuk mengakhiri deklarasi 'model'.");

        return new Stmt.Model(id, contents);
    }

    statement() {
        if(this.match(TokenType.CETAK)) {
            return this.cetakStmt();
        } else if (this.match(TokenType.ID)) {
            return this.datumStmt();
        } else if (this.match(TokenType.KERJA)) {
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
        } else if (this.match(TokenType.HASIL)) {
            return new Stmt.Hasil(this.expression());
        } else if (this.match(TokenType.JENIS)) {
            this.error(`Pernyataan 'jenis' harus diletakkan di luar blok.`, false);
        } else if (this.match(TokenType.MODEL)) {
            this.error(`Pernyataan 'model' harus diletakkan di luar blok.`, false);
        } else {
            this.error(`Pernyataan tidak bisa diawali '${this.see().lexeme}'.`, false);
        }
    }

    error(errmsg, found = true) {
        throw new SimplErrorStruktur(`Error Penulisan: [Baris ${this.see().line}] ` + errmsg + ((found) ? ` Menemukan '${this.see().lexeme }'.` : ""));
    }

    parse(tokens) {
        this.tokens = tokens;
        let treeList = [];
        try {
            while(!this.match(TokenType.EOF)) {
                if (this.match(TokenType.JENIS)) {
                    treeList.push(this.jenisStmt());
                    continue;
                } else if (this.match(TokenType.MODEL)) {
                    treeList.push(this.modelStmt());
                    continue;
                }
                treeList.push(this.statement());
            }
        } catch (err) {
            console.log(err);
            return null;
        }
        this.tree = new Stmt.Simpl(treeList);
        return this.tree;
    }
}

// print
function deepPrint(value, indent = 0, visited = new WeakSet()) {
  const pad = '  '.repeat(indent);

  if (value === null) {
    console.log(`${pad}null`);
    return;
  }

  const type = typeof value;

  if (type !== 'object') {
    console.log(`${pad}${String(value)}`);
    return;
  }

  if (visited.has(value)) {
    console.log(`${pad}[Circular]`);
    return;
  }
  visited.add(value);

  if (Array.isArray(value)) {
    console.log(`${pad}[`);
    for (const item of value) {
      deepPrint(item, indent + 1, visited);
    }
    console.log(`${pad}]`);
    return;
  }

  // determine constructor name
  const ctorName = value.constructor && value.constructor !== Object
    ? value.constructor.name
    : 'Object';

  console.log(`${pad}${ctorName} {`);
  const keys = Reflect.ownKeys(value);
  for (const key of keys) {
    const val = value[key];
    process.stdout.write(`${pad}  ${String(key)}: `);
    if (typeof val === 'object' && val !== null) {
      console.log();
      deepPrint(val, indent + 2, visited);
    } else {
      console.log(val);
    }
  }
  console.log(`${pad}}`);
}

