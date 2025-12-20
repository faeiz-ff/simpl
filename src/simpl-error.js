// Errors
export class SimplError extends Error {
    constructor(message, line) {
        super(message);
        this.line = line;
    }
};
export class SimplErrorEksekusi extends SimplError {};
export class SimplErrorStruktur extends SimplError {};
export class SimplErrorTulisan extends SimplError {};