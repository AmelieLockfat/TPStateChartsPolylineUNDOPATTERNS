import Stack from './stack';
import Konva from "konva";

import UndoManager from './UndoManager';
import Command from './Command';
import { createMachine, interpret } from "xstate";

const stage = new Konva.Stage({
    container: "container",
    width: 400,
    height: 400,
});

const buttonUndo = document.getElementById("undo")

const buttonRedo = document.getElementById("redo")

const undoManager = new UndoManager()
// Une couche pour le dessin
const dessin = new Konva.Layer();
const temporaire = new Konva.Layer();
// Une couche pour la polyline en cours de construction

stage.add(dessin);
stage.add(temporaire);

const MAX_POINTS = 10;
let polyline // La polyline en cours de construction;

const polylineMachine = createMachine(
    {
        /** @xstate-layout N4IgpgJg5mDOIC5QAcD2AbAngGQJYDswA6XCdMAYgFkB5AVQGUBRAYWwEkWBpAbQAYAuohSpYuAC65U+YSAAeiAOyK+RPgEYATAFYALHwCcB7QA4TygDQhMidSd1FFAZheaDWrYruaAvj6toWHiERNJgAAqoBOLU9MxsnLyCsmhiktKyCgjKqho6+kam5opWNgjaTopElbpGugBs9YqaDQZ+ARg4BMRhkdGxjEy0AGpM-EJIIKkSUjKTWQaV1fX52nzams1mpYhO6vWOirUGyprqBvYG9e1TncE9hH34MUywAMYAhshg4ymiMxl5ogTBoiO58po+A1dOd6jsECYDNUTC49mZ3CtajdAl0QgBbD74TBPcSwAbxDjcX6TabpOagLL1VQtIyKeooi4qbTaOHWRC6XQmRwopxuEwrJkNbF3bpEAlEklk2iDBJU9QTERpWaZXb1JGYwripx8eradTwzbqMFGIx7dQ8+pOeq6aVBWXy4lRZ5KuJDGijamagH0+S2LTLcznYwnHTqJzwpwVIi6VGix1Q4xOV244gexUUV6fb6B25awEM3X6lnGI0ms3w9RsojOm1FRN6LP+W5u-GEz3RMlMZ5gABOJdp2qBCCdVeOpnTpvNfIRVrcNvFZoFtRdXZx9zlffzACEPm8ANawZCnn7JGn-Ok6hC6TQW0xqEWJpwXJwmbQGHcdD2uaHl6pIUCe56XtePDqn8ZYhlkM7NtW87GouCb-kQUZGEyZrnJoLjZvueagWSdD4BAqBHgAruI4jSOO96ThWCDqHYRA8iyZh-lo34NisjipiY+wrGy1w3PgqAQHAfxAXBwaPgAtLyZTKWofAaXwIKKNozQCgRRGyqQ5DyQ+U7OtoRDCTolSIs6DQvsuUYcUcdSKOKug8oRu4yiEvSgaZzGhggxgHJCKwGIYukEe58IwlUWjHLUeiGCm2iGb2CqkYF5bBR4RCaAaNZ2E69rwnoSJxq4Kj-l4X5+H4QA */
        id: "polyLine",
        initial: "idle",
        states: {
            idle: {
                on: {
                    MOUSECLICK: {
                        target: "onePoint",
                        actions: "createLine",
                    },
                    UNDO: {
                        target: "idle",
                        actions: "undo",
                        internal: true,
                        cond: "canUndo"
                    },

                    REDO: {
                        target: "idle",
                        actions: "redo",
                        internal: true,
                        cond: "canRedo"
                    }
                },
            },
            onePoint: {
                on: {
                    MOUSECLICK: {
                        target: "manyPoints",
                        actions: "addPoint",
                    },
                    MOUSEMOVE: {
                        actions: "setLastPoint",
                    },
                    Escape: { // event.key
                        target: "idle",
                        actions: "abandon",
                    },
                },
            },
            manyPoints: {
                on: {
                    MOUSECLICK: [
                        {
                            actions: "addPoint",
                            cond: "pasPlein",
                        },
                        {
                            target: "idle",
                            actions: ["addPoint", "saveLine"],
                        },
                    ],

                    MOUSEMOVE: {
                        actions: "setLastPoint",
                    },

                    Escape: {
                        target: "idle",
                        actions: "abandon",
                    },

                    Enter: { // event.key
                        target: "idle",
                        actions: "saveLine",
                    },

                    Backspace: [ // event.key
                        {
                            target: "manyPoints",
                            actions: "removeLastPoint",
                            cond: "plusDeDeuxPoints",
                            internal: true,
                        },
                        {
                            target: "onePoint",
                            actions: "removeLastPoint",
                        },
                    ],
                    

        
                },
            },
        },
    },
    {
       actions: {
            createLine: (context, event) => {
                const pos = stage.getPointerPosition();
                polyline = new Konva.Line({
                    points: [pos.x, pos.y, pos.x, pos.y],
                    stroke: "red",
                    strokeWidth: 2,
                });
                temporaire.add(polyline);
            },
            setLastPoint: (context, event) => {
                const pos = stage.getPointerPosition();
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;

                const newPoints = currentPoints.slice(0, size - 2); // Remove the last point
                polyline.points(newPoints.concat([pos.x, pos.y]));
                temporaire.batchDraw();
            },
            saveLine: (context, event) => {
                polyline.remove(); // On l'enlève de la couche temporaire
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;
                // Le dernier point(provisoire) ne fait pas partie de la polyline
                const newPoints = currentPoints.slice(0, size - 2);
                polyline.points(newPoints);
                polyline.stroke("black"); // On change la couleur
                // On sauvegarde la polyline dans la couche de dessin
                buttonUndo.disabled = false;
                undoManager.execute(new Command(dessin, polyline))
            },
            addPoint: (context, event) => {
                const pos = stage.getPointerPosition();
                const currentPoints = polyline.points(); // Get the current points of the line
                const newPoints = [...currentPoints, pos.x, pos.y]; // Add the new point to the array
                polyline.points(newPoints); // Set the updated points to the line
                temporaire.batchDraw(); // Redraw the layer to reflect the changes
            },
            abandon: (context, event) => {
                polyline.remove();
            },
            removeLastPoint: (context, event) => {
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;
                const provisoire = currentPoints.slice(size - 2, size); // Le point provisoire
                const oldPoints = currentPoints.slice(0, size - 4); // On enlève le dernier point enregistré
                polyline.points(oldPoints.concat(provisoire)); // Set the updated points to the line
                temporaire.batchDraw(); // Redraw the layer to reflect the changes
            },
            undo: (context, event) => {
                undoManager.undo()
                if(!undoManager.canUndo()){
                    buttonUndo.disabled = true;
                }
                buttonRedo.disabled = false;
            },
           
            redo: (context, event) => {
                undoManager.redo()
                if(!undoManager.canRedo()){
                    buttonRedo.disabled = true;
                }
                buttonUndo.disabled = false;
            },
        },
        guards: {
            pasPlein: (context, event) => {
                // On peut encore ajouter un point
                return polyline.points().length < MAX_POINTS * 2;
            },
            plusDeDeuxPoints: (context, event) => {
                // Deux coordonnées pour chaque point, plus le point provisoire
                return polyline.points().length > 6;
            },
            canUndo: (context, event) => {
                // Deux coordonnées pour chaque point, plus le point provisoire
                return undoManager.canUndo();
            },
            canRedo: (context, event) => {
                // Deux coordonnées pour chaque point, plus le point provisoire
                return undoManager.canRedo();
            },
        },
    }
);

const polylineService = interpret(polylineMachine)
    .onTransition((state) => {
        console.log("Current state:", state.value);
    })
    .start();

stage.on("click", () => {
    polylineService.send("MOUSECLICK");
});

stage.on("mousemove", () => {
    polylineService.send("MOUSEMOVE");
});

buttonUndo.addEventListener("click", () => {
    polylineService.send("UNDO");
});

buttonRedo.addEventListener("click", () => {
    polylineService.send("REDO");
});

window.addEventListener("keydown", (event) => {
    console.log("Key pressed:", event.key);
    polylineService.send(event.key);
});



