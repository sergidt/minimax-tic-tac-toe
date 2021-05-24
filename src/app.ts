export enum CellValue {
    Empty = '',
    X = 'X',
    O = 'O'
};

export interface GameState {
    winnerPositions?: [number, number, number];
    winner?: CellValue.O | CellValue.X | 'DRAW';
    finished: boolean;
}

const WINNER_POSITIONS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

/*************************************************
 *                      BOARD
 **************************************************/

export class Board {
    constructor(private _state: Array<CellValue> = Array.from({ length: 9 }, () => CellValue.Empty)) {
    }

    getState(): Array<CellValue> {
        return this._state;
    }

    //Logs a visualized board with the current state to the console
    printFormattedBoard() {
        let formattedString = '';
        this._state.forEach((cell, index) => {
            formattedString += cell ? ` ${ cell } |` : '   |';
            if ((index + 1) % 3 === 0) {
                formattedString = formattedString.slice(0, -1);
                if (index < 8) formattedString += '\n\u2015\u2015\u2015 \u2015\u2015\u2015 \u2015\u2015\u2015\n'; // \u2015 is an horizontal bar
            }
        });
        console.log('%c' + formattedString, 'color: #c11dd4;font-size:16px');
    }

    /**
     * Checks if board has no symbols yet
     */
    isEmpty() {
        return this._state.every(cell => cell === CellValue.Empty);
    }

    /**
     * Check if board has no spaces available
     */
    isFull() {
        return this._state.every(cell => cell !== CellValue.Empty);
    }

    /**
     * Inserts a new symbol(x,o) into
     * @param {CellValue} symbol
     * @param {number} position
     * @return {boolean} boolean represent success of the operation
     */
    insert(symbol: CellValue, position: number): boolean {
        if (position < 0 || position > 8) {
            throw new Error(`La posición ${ position } no existe!`);
        }

        if (![CellValue.O, CellValue.X].includes(symbol)) {
            throw new Error('No es un símbolo permitido!');
        }

        if (this._state[position]) {
            return false;
        }

        this._state[position] = symbol;
        return true;
    }

    //Returns an array containing available moves for the current state
    getAvailableMoves(): Array<number> {
        return this._state.reduce((positions, currentCell, index) => currentCell === CellValue.Empty
            ? [...positions, index]
            : positions
            , []);
    }

    /**
     * Checks if the board has a finish state.
     * @return {GameState} an object containing the state info
     */
    getFinishState(): GameState {
        if (this.isEmpty()) {
            return { finished: false };
        } else if (this.isFull()) {
            return { winner: 'DRAW', finished: true };
        } else {
            const anyWinner = WINNER_POSITIONS
                .map(([p1, p2, p3]: [number, number, number]) => this.calculateGameState(p1, p2, p3))
                .find((state: GameState) => state.finished);
            return !!anyWinner ? anyWinner : { finished: false };
        }
    }

    private calculateGameState(position1: number, position2: number, position3: number): GameState {
        const value1: CellValue = this._state[position1];
        const value2: CellValue = this._state[position2];
        const value3: CellValue = this._state[position3];

        const finished = value1 !== CellValue.Empty
            && value2 !== CellValue.Empty
            && value3 !== CellValue.Empty
            && value1 === value2
            && value1 === value3;

        return {
            finished,
            ...(finished && { winner: value1 as CellValue.O | CellValue.X, winnerPositions: [position1, position2, position3] })
        };
    }
}

/*************************************************
 *                      PLAYER
 **************************************************/

export class Player {
    public nodesMap: Map<number, number | string>;

    constructor(private maxDepth: number = -1) {
        this.nodesMap = new Map();
    }

    getBestMove(board: Board, maximizing: boolean = true, callback = (...params) => {
    }, depth: number = 0) {
        //clear nodesMap if the function is called for a new move
        if (depth === 0)
            this.nodesMap.clear();

        const state: GameState = board.getFinishState();

        //If the board state is a terminal one, return the heuristic value
        if (state.finished || depth === this.maxDepth) {
            if (state.winner === CellValue.X) {
                return 100 - depth;
            } else if (state.winner === CellValue.O) {
                return -100 + depth;
            }
            return 0;
        }

        return this.minimax(maximizing, board, callback, depth);
    }

    minimax(maximizing: boolean, board: Board, callback = (...params) => {
    }, depth: number): number {
        let best, op, cellValue;

        if (!maximizing) { // min
            //Initialize best to the highest possible value
            best = 100;
            op = Math.min;
            cellValue = CellValue.O;
        } else { // max
            //Initialize best to the lowest possible value
            best = -100;
            op = Math.max;
            cellValue = CellValue.X;
        }

        //Loop through all empty cells
        board.getAvailableMoves().forEach(index => {

            //Initialize a new board with a copy of our current state
            const nextBoard = new Board([...board.getState()]);

            //Create a child node by inserting the maximizing symbol x into the current empty cell
            nextBoard.insert(cellValue, index);

            //Recursively calling getBestMove this time with the new board and minimizing turn and incrementing the depth
            const nodeValue = this.getBestMove(nextBoard, !maximizing, callback, depth + 1);

            //Updating best value
            best = op(best, nodeValue);

            //If it's the main function call, not a recursive one, map each heuristic value with it's moves indices
            if (depth === 0) {
                //Comma separated indices if multiple moves have the same heuristic value
                const moves = this.nodesMap.has(nodeValue) ? `${ this.nodesMap.get(nodeValue) },${ index }` : index;
                this.nodesMap.set(nodeValue, moves);
            }
        });

        //If it's the main call, return the index of the best move or a random index if multiple indices have the same value
        if (depth === 0) {
            return getBestMoveAndExecuteCallback(this.nodesMap, best, callback);
        }
        //If not main call (recursive) return the heuristic value for next calculation
        return best;
    }
}

function getBestMoveAndExecuteCallback(moves: Map<number, number | string>, best: number, callback = (...params) => {
}): number {
    let returnValue: number;
    const bestMovement = moves.get(best);

    returnValue = isString(bestMovement)
        ? +bestMovement.split(',')[0]
        : bestMovement;

    //run a callback after calculation and return the index
    callback(returnValue);

    return returnValue;
}

// helper classes

function isString(param): param is string {
    return typeof param == 'string';
}

const board = new Board(['X', 'O', '', '', '', '', 'O', '', 'X'] as Array<CellValue>);
board.printFormattedBoard();
const p = new Player();
console.log(p.getBestMove(board, true)); //false for minimizing turn
console.log(p.nodesMap);
