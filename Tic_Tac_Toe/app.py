from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

WIN_PATTERNS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],  # rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8],  # columns
    [0, 4, 8], [2, 4, 6]              # diagonals
]
VALID_MARKS = {"", "X", "O"}

@app.route("/")
def home():
    return render_template("index.html")

# Check winner logic
def check_winner(board):
    for pattern in WIN_PATTERNS:
        a, b, c = pattern
        if board[a] == board[b] == board[c] and board[a] != "":
            return board[a]

    if "" not in board:
        return "Draw"

    return None


def get_winners(board):
    winners = set()
    for a, b, c in WIN_PATTERNS:
        if board[a] == board[b] == board[c] and board[a] != "":
            winners.add(board[a])
    return winners


def is_valid_board(board):
    return (
        isinstance(board, list)
        and len(board) == 9
        and all(cell in VALID_MARKS for cell in board)
    )


def is_valid_turn(board, player):
    x_count = board.count("X")
    o_count = board.count("O")

    # Basic Tic Tac Toe count rules: X starts, so X is either equal to O or exactly one ahead.
    if o_count > x_count or (x_count - o_count) > 1:
        return False

    # The payload board is after the player's move.
    if player == "X":
        return x_count == (o_count + 1)
    return x_count == o_count


def _build_reachable_boards(board, player, reachable):
    state = tuple(board)
    if state in reachable:
        return

    reachable.add(state)

    if check_winner(board) is not None:
        return

    next_player = "O" if player == "X" else "X"
    for i, value in enumerate(board):
        if value == "":
            board[i] = player
            _build_reachable_boards(board, next_player, reachable)
            board[i] = ""


def _generate_reachable_boards():
    reachable = set()
    _build_reachable_boards([""] * 9, "X", reachable)
    return reachable


REACHABLE_BOARDS = _generate_reachable_boards()


def is_reachable_board(board):
    return tuple(board) in REACHABLE_BOARDS


@app.route("/move", methods=["POST"])
def move():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"winner": None, "error": "Invalid JSON payload."}), 400

    board = data.get("board")
    player = data.get("player")

    if not is_valid_board(board):
        return jsonify({"winner": None, "error": "Invalid board format."}), 400

    if player not in {"X", "O"}:
        return jsonify({"winner": None, "error": "Invalid player."}), 400

    if not is_valid_turn(board, player):
        return jsonify({"winner": None, "error": "Invalid turn order."}), 400

    if not is_reachable_board(board):
        return jsonify({"winner": None, "error": "Unreachable board state."}), 400

    winners = get_winners(board)
    if len(winners) > 1:
        return jsonify({"winner": None, "error": "Invalid board state."}), 400

    # Check if the game is already over before processing the move
    winner = check_winner(board)
    if winner in {"X", "O"} and winner != player:
        return jsonify({"winner": None, "error": "Winner does not match move player."}), 400

    if winner is not None:
        return jsonify({"winner": winner})

    # ...existing code for move validation or AI move (if any) would go here...
    return jsonify({"winner": None})

if __name__ == "__main__":
    app.run(host = "0.0.0.0", port = 5000)