class ranfom {
    constructor(real) {
        this.real = real
    }

    set real(thing) {
        if (thing === false) console.log("what?")
        return thing;
    }
}

let r = new ranfom(true);
r.real = false;

