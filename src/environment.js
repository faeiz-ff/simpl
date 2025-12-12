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

        return null;
    }

    get(thing) {
        if (this.has(thing)) {
            return this.memory.get(thing);
        } else if (this.enclosing) {
            return this.enclosing.get(thing);
        }

        return null;
    }

    has(thing) {
        return this.memory.has(thing);
    }

}