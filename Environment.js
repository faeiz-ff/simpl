import { SimplRuntimeError } from "./SimplError.js";

// Environment defines a scope for all data to live in
export class Environment {

    constructor(environment) {
        this.enclosing = environment;
        this.memory = new Map();
    }

    define(thing, value) {
        this.memory.set(thing, value);
    }

    assign(thing, value) {
        if (this.has(thing)) {
            this.memory.set(thing, value);
        } else if (this.enclosing) {
            this.enclosing.assign(thing, value);
        }

        throw new SimplRuntimeError("Variable not found");
    }

    get(thing) {
        if (this.has(thing)) {
            return this.memory.get(thing);
        } else if (this.enclosing) {
            return this.enclosing.get(thing);
        }

        throw new SimplRuntimeError("Variable not found");
    }

    has(thing) {
        return this.memory.has(thing);
    }

}