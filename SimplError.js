// Errors
export class SimplError extends Error {
    constructor(msg) {
        super(null);
        this.msg = msg;
    }
};
export class SimplRuntimeError extends SimplError {};
export class SimplParserError extends SimplError {};
export class SimplLexerError extends SimplError {};
export class SimplSemanticError extends SimplError{};