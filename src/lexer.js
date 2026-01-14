import * as TokenType from "./token-type.js";
import { Token } from "./token.js";
import { SimplErrorTulisan } from "./simpl-error.js";

export class Lexer {
    constructor() {
        this.init();
    }

    init() {
        this.text = null;
        this.charStart = 0;
        this.charIndex = 0;
        this.lineIndex = 1;
        this.tokens = [];
        this.errors = [];
    }

    scanTokens(text) {
        this.init();
        this.text = text;
        let tokens = [];

        while (!this.isAtEnd()) {
            let token = this.scan();
            this.charStart = this.charIndex;
            if (token) tokens.push(token);
        }

        tokens.push(new Token(TokenType.EOF, "Akhir dokumen", null, this.lineIndex));

        this.tokens = tokens;
        return this.tokens;
    }

    isAtEnd() {
        return this.charIndex >= this.text.length;
    }

    advance() {
        if (this.isAtEnd()) return;
        if (this.see() === "\n") this.lineIndex++;
        this.charIndex++;
    }

    see() {
        if (this.isAtEnd()) return "EOF"
        return this.text[this.charIndex];
    }

    peek(num = 1) {
        return this.isAtEnd() ? null : this.text[this.charIndex + num];
    }

    isAlpha(char) {
        return /^[a-zA-Z_]$/.test(char);
    }

    isNumeric(char) {
        return /^[0-9]$/.test(char);
    }

    isAlphaNumeric(char) {
        return this.isAlpha(char) || this.isNumeric(char) || char === "?";
    }

    skipWhitespaces() {
        while (!this.isAtEnd() && /\s/.test(this.see())) {
            this.advance();
            this.charStart++;
        }
    }

    parseLexeme() {
        return this.text.slice(this.charStart, this.charIndex);
    }

    id() {
        while (!this.isAtEnd() && this.isAlphaNumeric(this.see())) this.advance();

        let lexeme = this.parseLexeme();

        let reservedIndex = TokenType.RESERVED_KEYWORDS.findIndex((val) => val === lexeme);
        if (reservedIndex != -1) {
            return new Token(reservedIndex, lexeme, null, this.lineIndex);
        }

        let isLogis = ["benar", "salah"].some((val) => val === lexeme)
        if (isLogis) {
            return new Token(TokenType.LITERAL, lexeme, "benar" === lexeme ? true : false, this.lineIndex);
        }

        if (lexeme === "nihil") {
            return new Token(TokenType.LITERAL, lexeme, null, this.lineIndex);
        }

        return new Token(
            TokenType.ID,
            lexeme,
            null,
            this.lineIndex
        )
    }

    number() {
        let isFloat = false;
        while (!this.isAtEnd() && this.isNumeric(this.see())) {
            this.advance();
            if (this.see() === '.') {
                if (isFloat) break;
                isFloat = true;
                this.advance();
            }
        }
        let value = parseFloat(isFloat ? this.parseLexeme() : this.parseLexeme() + ".");
        return new Token(TokenType.LITERAL, this.parseLexeme(), value, this.lineIndex);
    }

    string() {
        this.advance();
        while (!this.isAtEnd() && this.see() !== '"') this.advance();
        if (this.isAtEnd()) this.error("Petik tidak tertutup.");
        this.advance();
        let lexeme = this.parseLexeme();
        return new Token(TokenType.LITERAL, lexeme, lexeme.slice(1, lexeme.length - 1), this.lineIndex);
    }

    comment() {
        while (!this.isAtEnd() && this.see() !== '\n') {
            this.advance();
            this.charStart++;
        }
        this.advance();
        this.charStart++;
    }

    multilineComment() {
        this.advance(); this.advance();
        this.charStart = this.charStart + 2;
        while (!this.isAtEnd() && (this.see() !== '*' || this.peek() !== '/')) {
            this.advance();
            this.charStart++;
        }
        this.advance(); this.advance();
        this.charStart = this.charStart + 2;
    }

    makeToken(type) {
        this.advance();
        return new Token(type, this.parseLexeme(), null, this.lineIndex);
    }

    scan() {
        this.skipWhitespaces();
        while (this.see() === '#' || (this.see() === '/' && this.peek() === '*')) {
            if (this.see() === '#') this.comment();
            else this.multilineComment();
            this.skipWhitespaces();
        }


        if (this.isAlpha(this.see())) return this.id();
        if (this.isNumeric(this.see())) return this.number();

        switch (this.see()) {
            case "$": return this.makeToken(TokenType.DOLLAR);
            case ":": return this.makeToken(TokenType.COLON);
            case "+": return this.makeToken(TokenType.PLUS);
            case "-": return this.makeToken(TokenType.MINUS);
            case "/": return this.makeToken(TokenType.SLASH);
            case "*": return this.makeToken(TokenType.STAR);
            case "(": return this.makeToken(TokenType.LPAREN);
            case ")": return this.makeToken(TokenType.RPAREN);
            case ".": return this.makeToken(TokenType.DOT);
            case ",": return this.makeToken(TokenType.COMMA);
            case "{": return this.makeToken(TokenType.LCURLY);
            case "}": return this.makeToken(TokenType.RCURLY);
            case "[": return this.makeToken(TokenType.LSQUARE);
            case "]": return this.makeToken(TokenType.RSQUARE);
            case "|": 
                if (this.peek() === ">") {
                    this.advance();
                    return this.makeToken(TokenType.PIPELINE);
                }
                return this.makeToken(TokenType.PIPE);
            case "&": return this.makeToken(TokenType.AMPERSAND);
            case "%": return this.makeToken(TokenType.MODULUS);
            case "!":
                if (this.peek() === "=") {
                    this.advance();
                    return this.makeToken(TokenType.BANG_EQUAL);
                }
                return this.makeToken(TokenType.BANG);

            case ">":
                if (this.peek() === "=") {
                    this.advance();
                    return this.makeToken(TokenType.GREATER_EQUAL)
                }
                return this.makeToken(TokenType.GREATER);
            case "<":
                if (this.peek() === "=") {
                    this.advance();
                    return this.makeToken(TokenType.LESS_EQUAL)
                }
                return this.makeToken(TokenType.LESS);

            case "=":
                if (this.peek() === "=" && this.peek(2) === ">") {
                    return this.makeToken(TokenType.EQUAL);
                } else if (this.peek() === "=") {
                    this.advance();
                    return this.makeToken(TokenType.EQUAL_EQUAL);
                } else if (this.peek() === ">") {
                    this.advance();
                    return this.makeToken(TokenType.ARROW);
                }
                return this.makeToken(TokenType.EQUAL);

            case '"': return this.string();
        }
        if (this.isAtEnd()) return;

        this.error(`karakter tidak valid: Menemukan '${this.see()}'.`);
    }

    error(errmsg) {
        throw new SimplErrorTulisan(`Error Tulisan => ` + errmsg, this.see().line);
    }

    debugPrintTokens(tokens) {
        for (let tok of tokens) {
            console.log(tok.toString());
        }
    }
}
