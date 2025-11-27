import { Interpreter } from "./Interpreter.js";
import { Lexer } from "./Lexer.js";
import { Parser } from "./Parser.js";
import { SimplError } from "./SimplError.js";

// Simpl: Indonesian Mini Programming Language !!

export class Simpl {
    constructor() {
        this.lexer = new Lexer();
        this.parser = new Parser();
        this.interpreter = new Interpreter();
    }

    runCode(text) {
        console.log(text.split("\n").reduce((codeStr, line, idx) => codeStr + `${idx + 1}.\t${line}\n`, ''));
        try {
            let tokens = this.lexer.scanTokens(text);
            let pohon = this.parser.parse(tokens);
            let output = this.interpreter.interpret(pohon);
            return output.reduce((out, line)=>out+"\n"+line, "");
        } catch (err) {
            if (err instanceof SimplError) {
                return err.message;
            } else {
                return `[${this.interpreter.line}] Uh Oh, ini error sistem. Mohon laporkan agar diperbaiki. [ ${err} ]`;
            }
        }
        
    }
}



let simp = new Simpl();


console.log(simp.runCode
(`
    model pohon (
        pohon kanan,
        pohon kiri,
        datum nilai
    )

    modul pohon {
        mesin datar ==> (pohon p) {
            datum akhir = []
            kalau !nihil?(p.kiri) {
                rubah akhir = akhir + datar(p.kiri)             
            }

            rubah akhir = akhir + [p.nilai]

            kalau !nihil?(p.kanan) {
                rubah akhir = akhir + datar(p.kanan)
            }

            hasil akhir
        }

        mesin keBaris ==> (pohon p) {
            datum akhir = []
            kalau !nihil?(p.kiri) {
                rubah akhir = akhir + [keBaris(p.kiri)]
            }

            rubah akhir = akhir + [p.nilai]

            kalau !nihil?(p.kanan) {
                rubah akhir = akhir + [keBaris(p.kanan)]
            }

            hasil akhir
        }

        mesin kePetik ==> (pohon p) {
            hasil petik(keBaris(p))
        }
    }

    mesin pohonUrutTambah ==> (pohon p, datum a, mesin gt?) {
        kalau gt?(a, p.nilai) { 
            kalau !nihil?(p.kanan) {
                hasil pohonUrutTambah(p.kanan, a, gt?)
            } namun {
                rubah p.kanan = pohon(nihil,nihil,a)
                hasil nihil
            }
        } namun {
            kalau !nihil?(p.kiri) {
                hasil pohonUrutTambah(p.kiri, a, gt?)
            } namun {
                rubah p.kiri = pohon(nihil,nihil,a) 
                hasil nihil
            }
        }
    }

    mesin pohonTerurut ==> (baris b, mesin gt?) {
        pohon akhir = pohon(nihil, nihil, b[0])
        untuk angka i dalam jarak(1, ukuran(b)) {
            kerja pohonUrutTambah(akhir, b[i], gt?)
        }
        hasil akhir
    }
    
    cetak pohon.keBaris(pohonTerurut([5,3,6,87,5,2,5,7],=>(angka a, angka b) {hasil a > b}))

`), '\n');  