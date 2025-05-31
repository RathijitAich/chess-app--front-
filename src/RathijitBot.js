import React, { useState, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { useNavigate } from "react-router-dom";
import "./RathijitBot.css";

const RathjitBot = () => {
    const navigate = useNavigate();
    const [game, setGame] = useState(new Chess());
    const [gameHistory, setGameHistory] = useState([]);
    const [currentPlayer, setCurrentPlayer] = useState("white");
    const [selectedPiece, setSelectedPiece] = useState(null);
    const [optionSquares, setOptionSquares] = useState({});
    const [gameStatus, setGameStatus] = useState("");
    const [thinking, setThinking] = useState(false);
    const [playerColor, setPlayerColor] = useState(null); // null until chosen

    useEffect(() => {
        // Update game status whenever the game state changes
        if (game.isGameOver()) {
            if (game.isCheckmate()) {
                setGameStatus(`Checkmate! ${currentPlayer === "white" ? "Black" : "White"} wins!`);
            } else if (game.isDraw()) {
                setGameStatus("Draw!");
            } else {
                setGameStatus("Game Over!");
            }
        } else {
            setGameStatus("");
        }
    }, [game, currentPlayer]);

    // Bot move fetch
    const getBotMove = async (fen) => {
        setThinking(true);
        try {
            const response = await fetch("http://localhost:5000/best-move-mybot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fen })
            });
            const data = await response.json();
            return data.move;
        } catch (error) {
            console.error("Failed to get bot move:", error);
            return null;
        } finally {
            setThinking(false);
        }
    };

    // Highlight legal moves
    function highlightLegalMoves(square) {
        if (playerColor !== currentPlayer || game.isGameOver() || thinking) return;
        if (square !== selectedPiece) {
            const moves = {};
            const legalMoves = game.moves({ square, verbose: true });
            if (legalMoves.length > 0) {
                setSelectedPiece(square);
                legalMoves.forEach(move => {
                    moves[move.to] = {
                        background: move.captured
                            ? 'rgba(255, 0, 0, 0.3)'
                            : 'rgba(0, 128, 0, 0.4)',
                        borderRadius: '50%',
                    };
                });
                moves[square] = { background: 'rgba(255, 255, 0, 0.4)' };
                setOptionSquares(moves);
            } else {
                setSelectedPiece(null);
                setOptionSquares({});
            }
        } else {
            setSelectedPiece(null);
            setOptionSquares({});
        }
    }

    // Make move (user or bot)
    async function makeMove(sourceSquare, targetSquare) {
    if (thinking) return false;
    const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
    });
    if (move === null) return false;

    const newGame = new Chess(game.fen());
    setGame(newGame);
    setGameHistory([...gameHistory, move]);
    setSelectedPiece(null);
    setOptionSquares({});
    setCurrentPlayer(newGame.turn() === "w" ? "white" : "black");

    // If it's now the bot's turn, trigger bot move
    if (!newGame.isGameOver() && newGame.turn() !== playerColor[0]) {
        setTimeout(async () => {
            const fen = newGame.fen();
            const botMove = await getBotMove(fen);
            if (botMove) {
                // Check legality
                const legalMoves = newGame.moves({ verbose: true });
                const isLegal = legalMoves.some(
                    m =>
                        m.from === botMove.slice(0, 2) &&
                        m.to === botMove.slice(2, 4) &&
                        (botMove.length === 4 || m.promotion === botMove[4] || !m.promotion)
                );
                if (isLegal) {
                    const moveResult = newGame.move({
                        from: botMove.slice(0, 2),
                        to: botMove.slice(2, 4),
                        promotion: botMove.length > 4 ? botMove[4] : "q",
                    });
                    if (moveResult) {
                        setGame(new Chess(newGame.fen()));
                        setGameHistory((prev) => [...prev, moveResult]);
                        setCurrentPlayer(newGame.turn() === "w" ? "white" : "black");
                    }
                } else {
                    console.warn("Bot tried illegal move:", botMove);
                }
            }
        }, 500);
    }
    return true;
}
    // Drag and drop
    function onDrop(sourceSquare, targetSquare) {
        if (playerColor !== currentPlayer || thinking) return false;
        return makeMove(sourceSquare, targetSquare);
    }

    // Click-to-move
    function onSquareClick(square) {
        if (thinking || playerColor !== currentPlayer) return;
        if (!selectedPiece) {
            highlightLegalMoves(square);
        } else if (selectedPiece === square) {
            setSelectedPiece(null);
            setOptionSquares({});
        } else {
            const piece = game.get(square);
            const selectedPieceDetails = game.get(selectedPiece);
            if (
                piece &&
                selectedPieceDetails &&
                piece.color === selectedPieceDetails.color &&
                piece.color === (playerColor === "white" ? "w" : "b")
            ) {
                highlightLegalMoves(square);
            } else {
                makeMove(selectedPiece, square).then((moveSuccess) => {
                    if (!moveSuccess) {
                        highlightLegalMoves(square);
                    }
                });
            }
        }
    }

    // Color selection and reset
    function handleColorChoice(color) {
        setPlayerColor(color);
        setGame(new Chess());
        setGameHistory([]);
        setCurrentPlayer("white");
        setSelectedPiece(null);
        setOptionSquares({});
        setGameStatus("");
    }

    function resetGame() {
        setGame(new Chess());
        setGameHistory([]);
        setCurrentPlayer("white");
        setSelectedPiece(null);
        setOptionSquares({});
        setGameStatus("");
        // If playing as black, let bot play first
        if (playerColor === "black") {
            setTimeout(botPlaysFirst, 500);
        }
    }

    // Bot plays first if user is black
    useEffect(() => {
        if (playerColor === "black" && gameHistory.length === 0 && currentPlayer === "white") {
            botPlaysFirst();
        }
        // eslint-disable-next-line
    }, [playerColor]);

    async function botPlaysFirst() {
        setThinking(true);
        const fen = game.fen();
        const botMove = await getBotMove(fen);
        if (botMove) {
            const legalMoves = game.moves({ verbose: true });
            const isLegal = legalMoves.some(
                m =>
                    m.from === botMove.slice(0, 2) &&
                    m.to === botMove.slice(2, 4) &&
                    (botMove.length === 4 || m.promotion === botMove[4] || !m.promotion)
            );
            if (isLegal) {
                const moveResult = game.move({
                    from: botMove.slice(0, 2),
                    to: botMove.slice(2, 4),
                    promotion: botMove.length > 4 ? botMove[4] : "q",
                });
                if (moveResult) {
                    setGame(new Chess(game.fen()));
                    setGameHistory([moveResult]);
                    setCurrentPlayer("black");
                }
            } else {
                console.warn("Bot tried illegal move:", botMove);
            }
        }
        setThinking(false);
    }

    // UI
    if (!playerColor) {
        return (
            <div className="rathjit-container">
                <div className="header">
                    <h1>Rathjit Bot Challenge</h1>
                    <p className="tagline">Choose your side to begin:</p>
                    <div style={{ display: "flex", justifyContent: "center", gap: "2rem", margin: "2rem 0" }}>
                        <button className="color-choice white" onClick={() => handleColorChoice("white")}>
                            Play as White
                        </button>
                        <button className="color-choice black" onClick={() => handleColorChoice("black")}>
                            Play as Black
                        </button>
                    </div>
                    <button className="back-button" onClick={() => navigate("/")}>
                        ← Back to Standard Game
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="rathjit-container">
            <div className="header">
                <h1>Rathjit Bot Challenge</h1>
                <p className="tagline">
                    Playing as <b>{playerColor.charAt(0).toUpperCase() + playerColor.slice(1)}</b>
                </p>
                <div className="game-info">
                    <span className="player-turn">Current Turn: <strong>{currentPlayer}</strong></span>
                    {gameStatus && <div className="game-status">{gameStatus}</div>}
                    {thinking && <div className="thinking">Rathjit Bot is thinking...</div>}
                </div>
            </div>

            <div className="controls-top">
                <button className="back-button" onClick={() => navigate("/")}>
                    ← Back to Standard Game
                </button>
            </div>

            <div className="game-container">
                <div className="board-container">
                    <Chessboard
                        position={game.fen()}
                        onPieceDrop={onDrop}
                        onSquareClick={onSquareClick}
                        boardWidth={600}
                        customBoardStyle={{
                            borderRadius: "8px",
                            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)"
                        }}
                        customSquareStyles={optionSquares}
                        areArrowsAllowed={true}
                        animationDuration={300}
                        boardOrientation={playerColor}
                    />
                </div>

                <div className="game-controls">
                    <div className="bot-info">
                        <div className="bot-avatar">
                            <img src="/bot-avatar.png" alt="Rathjit Bot" />
                        </div>
                        <div className="bot-details">
                            <h3>Rathjit Bot</h3>
                            <p>A neural network chess AI trained on thousands of master games</p>
                        </div>
                    </div>

                    <div className="move-history">
                        <h3>Move History</h3>
                        <div className="history-list">
                            {gameHistory.length > 0 ? (
                                <ul>
                                    {gameHistory.map((move, index) => (
                                        <li key={`${move.san}-${index}`}>
                                            {index % 2 === 0 ? Math.ceil((index + 1) / 2) + "." : ""}
                                            {move.san}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No moves yet</p>
                            )}
                        </div>
                    </div>

                    <button className="reset-button" onClick={resetGame}>New Game</button>
                </div>
            </div>

            <footer className="footer">
                <p>Rathjit Bot uses advanced neural network technology for game analysis</p>
            </footer>
        </div>
    );
};

export default RathjitBot;