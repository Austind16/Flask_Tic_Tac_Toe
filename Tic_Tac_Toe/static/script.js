let board = ["", "", "", "", "", "", "", "", ""];
let currentPlayer = "X";
let aiMode = false;
let moveInProgress = false;
let gameVersion = 0;
let pendingAiTimeoutId = null;

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

function setNotice(message = "", isError = false) {
    const notice = document.getElementById("notice");
    if (!notice) return;

    notice.innerText = message;
    notice.classList.remove("error", "info");

    if (message) {
        notice.classList.add(isError ? "error" : "info");
    }
}

function clearPendingAiMove() {
    if (pendingAiTimeoutId !== null) {
        clearTimeout(pendingAiTimeoutId);
        pendingAiTimeoutId = null;
    }
}

function scheduleAiMove(delayMs = 500) {
    if (!aiMode || currentPlayer !== "O" || checkDone() || moveInProgress) return;

    clearPendingAiMove();
    const scheduledGameVersion = gameVersion;

    pendingAiTimeoutId = setTimeout(() => {
        pendingAiTimeoutId = null;
        if (!aiMode || scheduledGameVersion !== gameVersion || checkDone()) return;
        aiMove();
    }, delayMs);
}

function rollbackMove(index, playedBy, requestGameVersion) {
    // Do not rollback if this response belongs to an older game.
    if (requestGameVersion !== gameVersion) return;

    if (board[index] !== playedBy) return;

    board[index] = "";
    let cell = document.getElementsByClassName("cell")[index];
    if (cell) {
        cell.innerText = "";
        cell.classList.remove("x-mark", "o-mark");
    }
}

function makeMove(index, isAiMove = false) {
    if (moveInProgress || board[index] !== "" || checkDone()) return;

    setNotice("");
    let shouldScheduleAi = false;

    // In AI mode, block human clicks when it is AI's turn.
    if (aiMode && currentPlayer === "O" && !isAiMove) return;

    const playedBy = currentPlayer;
    board[index] = playedBy;
    let cell = document.getElementsByClassName("cell")[index];
    cell.innerText = playedBy;
    cell.classList.add(playedBy === "X" ? "x-mark" : "o-mark");

    clickSound.play();

    moveInProgress = true;
    const requestGameVersion = gameVersion;

    fetch("/move", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ board: board, player: playedBy })
    })
    .then(async res => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok && !data.error) {
            data.error = "Request failed.";
        }
        return data;
    })
    .then(data => {
        // Ignore stale responses from an older game.
        if (requestGameVersion !== gameVersion) return;

        if (data.error) {
            // If backend reports game-finished winner, keep board and show result.
            if (data.winner) {
                showResult(data.winner);
            } else {
                rollbackMove(index, playedBy, requestGameVersion);
                setNotice(data.error, true);

                // If an AI move is rejected, restore control to X so the game does not get stuck.
                if (aiMode && playedBy === "O") {
                    currentPlayer = "X";
                }
            }

            console.warn("Move rejected:", data.error);
            return;
        }

        if (data.winner) {
            showResult(data.winner);
        } else {
            currentPlayer = currentPlayer === "X" ? "O" : "X";
            shouldScheduleAi = aiMode && currentPlayer === "O";
        }
    })
    .catch(err => {
        rollbackMove(index, playedBy, requestGameVersion);
        setNotice("Network error. Please try again.", true);

        // If an AI move fails, restore control to X so the game does not get stuck.
        if (requestGameVersion === gameVersion && aiMode && playedBy === "O") {
            currentPlayer = "X";
        }

        console.error("Move request failed:", err);
    })
    .finally(() => {
        if (requestGameVersion === gameVersion) {
            moveInProgress = false;

            if (shouldScheduleAi) {
                scheduleAiMove();
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

    if (bestMove === -1) {
        if (checkDone()) return;

        const winner = checkWinnerJS(board);
        if (winner) {
            showResult(winner);
        } else if (!board.includes("")) {
            showResult("Draw");
        }
        return;
    }

    makeMove(bestMove, true);
}

function showResult(winner) {
    let msg = winner === "Draw" ? "It's a Draw!" : `${winner} Wins!`;

    setNotice("");

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
    gameVersion++;

    clearPendingAiMove();

    moveInProgress = false;
    board = ["", "", "", "", "", "", "", "", ""];
    currentPlayer = "X";
    document.getElementById("status").innerText = "";
    setNotice("");

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

    if (!aiMode) {
        clearPendingAiMove();
        return;
    }

    if (currentPlayer === "O") {
        scheduleAiMove(150);
    }
}