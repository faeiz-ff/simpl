
def writeAST(name, derived_list):
    # i do not know how this works, it works, i made it myself
    # but i do not know how this works, but it works.
    # this will make a file with structured AST based on the params
    s = []
    def add(st): s.append(st + '\n')
    add("")
    add("export class " + name + "Base {")
    add("    accept(visitor) {")
    add("        return this.visit(visitor);")
    add("    }")
    add("}")
    add("")

    for d in derived_list:
        d_name = d.split(':')[0].strip()
        
        d_param = ""
        d_types = ""
        d_params = ""
        if len(d.split(':')) >= 2:
            d_param = d.split(':')[1].strip()
            d_types = [i.strip().split() for i in d_param.split(',')]
            d_params = [i.strip().split()[1] for i in d_param.split(',')]

        add("export class " + d_name + " extends " + name + "Base {")
        if d_param:
            add(" // " + ", ".join([t[0] + " " + t[1] for t in d_types]))
        add("    constructor (" + ", ".join(d_params) + ") {")
        add("        super();")
        for p in d_params:
            if not p:
                continue
            add("        this." + p + " = " + p + ";")
        add("    }")
        add("")
        add("    visit(visitor) {")
        add("        return visitor.visit" + d_name + name + "(this);")
        add("    }")
        add("}")
        add("")

    with open(name+".js", "w") as f:
        f.writelines(s)

def writeType(reserved, other):
    s = []
    def add(st): s.append(st + '\n')

    add('export const RESERVED_KEYWORDS = [')
    for i in reserved:
        add(f'    "{i}", ')
    add('];')
    add('')

    index = 0

    add('export const')
    for item in reserved:
        add(f'    {item.upper()} = {index},')
        index += 1

    for item in other:
        add(f'    {item.upper()} = {index},')
        index += 1

    s[-1] = s[-1][:len(s[-1])-2] + ';\n' # change the last comma with a semicolon
    add('')

    add('export const TOKEN_STRING = [')
    for i in reserved:
        add(f'    "{i.upper()}", ')
    for i in other:
        add(f'    "{i.upper()}",')
    add('];')

    with open('TokenType.js', 'w') as f:
        f.writelines(s)

def main():

    writeType(
        [
            "rubah", "kalau", "namun", "slagi", "untuk", "cetak",
            "henti", "lewat", "dalam", "hasil", "kerja",
            "jenis", "model", "error", "tetap",
        ],
        [
            "eof", "id", "literal", "plus", "minus", "star",
            "slash", "lparen", "rparen", "greater", "greater_equal",
            "less", "less_equal", "equal", "equal_equal", "dot", "lcurly",
            "rcurly", "comma", "lsquare", "rsquare", "pipe", "ampersand",
            "bang", "arrow", "bang_equal"
        ]
    )

    writeAST("Expr", [ # Expressions must return a value
        "Binary     : Expr.ExprBase left, Token op, Expr.ExprBase right",
        "Unary      : Token op, Expr.ExprBase right",
        "Literal    : Token token",
        "Grouping   : Expr.ExprBase expr",
        "Member     : Expr.ExprBase main, Expr.Member member",
        "Identifier : Token token",
        "Lambda     : Array<Stmt.Types-Token> params, Stmt.Type returnValue, Stmt.Block block",
        "Call       : Expr.ExprBase callable, Expr.ExprBase args",
        "Array      : Array<Expr.ExprBase> contents",
        "Index      : Expr.ExprBase iterable, Expr.ExprBase index"
    ])

    writeAST("Stmt", [ # Statements should't return anything
        "Cetak : Expr.ExprBase expr",
        "Datum : Stmt.Type type, Token name, Expr.ExprBase expr",
        "Type  : Expr.ExprBase type, bool tetap, Array<Stmt.Type> contents", # Doesnt make sense if expr, because <> will be parsed differently
        "Kerja : Expr.ExprBase expr",
        "Block : Array<Stmt.StmtBase> statements",
        "Kalau : Expr.ExprBase condition, Stmt.Block thenBlock, Stmt.Kalau elseKalau",
        "Untuk : Stmt.Type varType, Token varName, Expr.Base iterable, Stmt.Block block",
        "Slagi : Expr.ExprBase condition, Stmt.Block block",
        "Henti",
        "Lewat",
        "Rubah : Expr.ExprBase variable, Expr.ExprBase value",
        "Hasil : Expr.ExprBase expr", # lol ironic
        "Jenis : Token name, Array<Token> enums",
        "Model : Token name, Array<Stmt.Type-Token> contents",
        "Simpl : Array<Stmt.StmtBase> statements",
    ])

if __name__ == "__main__":
    main()