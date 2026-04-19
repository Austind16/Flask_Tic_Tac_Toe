from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")

# Check winner logic
def check_winner(board):
    win_patterns = [
        [0,1,2], [3,4,5], [6,7,8],  # rows
        [0,3,6], [1,4,7], [2,5,8],  # columns
        [0,4,8], [2,4,6]            # diagonals
    ]

    for pattern in win_patterns:
        a, b, c = pattern
        if board[a] == board[b] == board[c] and board[a] != "":
            return board[a]

    if "" not in board:
        return "Draw"

    return None

@app.route("/move", methods=["POST"])
def move():
    data = request.json
    board = data["board"]
    player = data["player"]

    winner = check_winner(board)
    return jsonify({"winner": winner})

if __name__ == "__main__":
    app.run(host = "0.0.0.0", port = 5000)