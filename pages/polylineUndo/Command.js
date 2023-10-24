class Command {
constructor(dessin,ligne)
{
    this._dessin=dessin
    this._ligne=ligne
}
execute() {
    this._dessin.add(this._ligne);
}

undo() {
    this._ligne.remove();
}
}
export default Command;