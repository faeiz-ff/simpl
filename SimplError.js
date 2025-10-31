// Errors
export class SimplError extends Error {
    constructor(msg) {
        super(msg);
    }
};
export class SimplErrorEksekusi extends SimplError {};
export class SimplErrorStrukturSintaks extends SimplError {};
export class SimplErrorTulisanSintaks extends SimplError {};
export class SimplErrorSemantik extends SimplError{};
export class SimplErrorResolusi extends SimplError{};