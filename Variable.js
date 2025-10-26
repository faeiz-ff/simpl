
import { Environment } from "./Environment.js";

export const RESERVED_NAMES = [
    "petik", "angka", "logis", "mesin", "baris", "datum", "benar", "salah",
]

export const petikSymbol = Symbol("Petik"),
             angkaSymbol = Symbol("Angka"),
             logisSymbol = Symbol("Logis"),
             mesinSymbol = Symbol("Mesin"),
             barisSymbol = Symbol("Baris")

export class Value {
    constructor(type, data) {
        this.type = type;
        this.data = data;
    }
}

//Variable is a name to a data
export class Variable extends Value {
    constructor(type, id) {
        super(type, null);
        this.id = id;
    }
}

export class Petik extends Value {
    constructor(data) {
        super(petikSymbol, data);
    }
}
export class Angka extends Value {
    constructor(data) {
        super(angkaSymbol, data);
    }
}
export class Logis extends Value {
    constructor(data) {
        super(logisSymbol, data);
    }
}

export class Mesin extends Value {
    constructor(parameters, returnValue, body) {
        this.type = returnValue;
        this.data = {parameters, body};
    }

    call(visitor) {
        return this.data.body.accept(visitor);
    }
}

export class SimplType {
    constructor(symbol) {
        this.symbol = symbol;
        this.namespace = new Environment();
    }
}

export class PetikType extends SimplType {
    constructor() {
        super(petikSymbol);
    }
}

export class AngkaType extends SimplType {
    constructor() {
        super(angkaSymbol);
    }
}

export class LogisType extends SimplType {
    constructor() {
        super(logisSymbol);
    }
}

export class MesinType extends SimplType {
    constructor() {
        super(mesinSymbol);
    }
}

export class BarisType extends SimplType {
    constructor() {
        super(barisSymbol);
    }
}