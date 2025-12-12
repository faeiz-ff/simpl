import * as TokenType from "./token-type.js";

export class Token {
    constructor(type, lexeme, value, line) {
        this.type = type;
        this.lexeme = lexeme;
        this.value = value;
        this.line = line;
    }

    toString() {
        return `< [${this.line}] ${TokenType.TOKEN_STRING[this.type]}, ${this.lexeme} >`;
    }
}