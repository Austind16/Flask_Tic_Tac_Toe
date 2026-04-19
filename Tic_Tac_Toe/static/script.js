let board = ["", "", "", "", "", "", "", "", ""];
let currentPlayer = "X";
let aiMode = false;

// Load Sounds
let clickSound = new Audio("/static/sounds/click.wav");
let winSound = new Audio("/static/sounds/win.wav");
let drawSound = new Audio("/static/sounds/draw.wav");

// Scoreboard
let scoreX = 0, scoreO = 0, scoreD = 0;

function updateScore(result) {
    if (result === "X") scoreX++;
    if (result === "O") scoreO++;
    if (result === "Draw") scoreD++;

    document.getElementById("scoreX").innerText = scoreX;
    document.getElementById("scoreO").innerText = scoreO;
    document.getElementById("scoreD").innerText = scoreD;
}

function makeMove(index) {
    if (board[index] !== "" || checkDone()) return;

    board[index] = currentPlayer;
    let cell = document.getElementsByClassName("cell")[index];
    cell.innerText = currentPlayer;
    cell.classList.add(currentPlayer === "X" ? "x-mark" : "o-mark");

    clickSound.play();

    fetch("/move", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ board: board, player: currentPlayer })
    })
    .then(res => res.json())
    .then(data => {
        if (data.winner) {
            showResult(data.winner);
        } else {
            currentPlayer = currentPlayer === "X" ? "O" : "X";

            if (aiMode && currentPlayer === "O") {
                setTimeout(aiMove, 500);
            }
        }
    });
}

function aiMove() {
    let bestScore = -Infinity;
    let bestMove = -1;

    board.forEach((val, i) => {
        if (val === "") {
            board[i] = "O";
            let score = minimax(board, false);
            board[i] = "";
            if (score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
        }
    });

    makeMove(bestMove);
}

function showResult(winner) {
    let msg = winner === "Draw" ? "It's a Draw!" : `${winner} Wins!`;

    if (winner === "Draw") drawSound.play();
    else winSound.play();

    document.getElementById("status").innerText = msg;
    updateScore(winner);

    // Add animation to winning board
    const cells = document.querySelectorAll(".cell");
    cells.forEach(cell => cell.classList.add("finished"));
}

function checkDone() {
    return document.getElementById("status").innerText !== "";
}

function resetGame() {
    board = ["", "", "", "", "", "", "", "", ""];
    currentPlayer = "X";
    document.getElementById("status").innerText = "";

    let cells = document.getElementsByClassName("cell");
    for (let c of cells) {
        c.innerText = "";
        c.classList.remove("finished", "x-mark", "o-mark");
    }
}

function minimax(board, isMaximizing) {
    let winner = checkWinnerJS(board);
    if (winner === "O") return 10;
    if (winner === "X") return -10;
    if (!board.includes("")) return 0;

    if (isMaximizing) {
        let best = -Infinity;
        board.forEach((val, i) => {
            if (val === "") {
                board[i] = "O";
                best = Math.max(best, minimax(board, false));
                board[i] = "";
            }
        });
        return best;
    } else {
        let best = Infinity;
        board.forEach((val, i) => {
            if (val === "") {
                board[i] = "X";
                best = Math.min(best, minimax(board, true));
                board[i] = "";
            }
        });
        return best;
    }
}

function checkWinnerJS(board) {
    const wins = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];
    for (let [a,b,c] of wins) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

function toggleAI() {
    aiMode = !aiMode;
    document.getElementById("aiStatus").innerText = "AI Mode: " + (aiMode ? "ON" : "OFF");
    document.getElementById("aiStatus").style.color = aiMode ? "#bb86fc" : "white";
}