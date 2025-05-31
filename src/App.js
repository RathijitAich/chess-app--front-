import React, { useState, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import "./App.css"; // We'll create this file for styling


async function fetchBestMove(fen) {
  const response = await fetch("http://127.0.0.1:5000/best-move", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ fen })
  });

  const data = await response.json();
  return data.move;
}


function App() {
  const [game, setGame] = useState(new Chess());
  const [gameHistory, setGameHistory] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState("white");
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [optionSquares, setOptionSquares] = useState({});

  // Function to highlight legal moves for a piece
  function highlightLegalMoves(square) {
    if (currentPlayer !== "white" || game.isGameOver()) return;
    
    // Clear previous highlights if clicking on a new piece
    if (square !== selectedPiece) {
      const moves = {};
      const legalMoves = game.moves({ square, verbose: true });
      
      if (legalMoves.length > 0) {
        // Set the selected piece
        setSelectedPiece(square);
        
        // Mark all legal target squares
        legalMoves.forEach(move => {
          moves[move.to] = {
            background: 'rgba(0, 128, 0, 0.4)',
            borderRadius: '50%',
          };
        });
        
        setOptionSquares(moves);
      } else {
        // No legal moves for this piece
        setSelectedPiece(null);
        setOptionSquares({});
      }
    } else {
      // Clicking the same piece again deselects it
      setSelectedPiece(null);
      setOptionSquares({});
    }
  }

  // Handle the move, either from onPieceDrop (drag) or from click
  async function makeMove(sourceSquare, targetSquare) {
    // This is just the user's move
    const move = game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    });

    if (move === null) return false;
   
    // After user's move, we update the game state
    const newGame = new Chess(game.fen());
    setGame(newGame);
    setGameHistory([...gameHistory, move]);
    setCurrentPlayer("black");
    setSelectedPiece(null);
    setOptionSquares({});

    // Bot's move
    setTimeout(async () => {
      const fen = newGame.fen();
      const bestMove = await fetchBestMove(fen);
      console.log("Best Move:", bestMove);
      
      if (bestMove) {
        const botMove = newGame.move({
          from: bestMove.slice(0, 2),
          to: bestMove.slice(2, 4),
          promotion: "q",
        });

        if (botMove) {
          setGame(new Chess(newGame.fen()));
          setGameHistory((prev) => [...prev, botMove]);
          setCurrentPlayer("white");
        }
      }
    }, 300);

    return true;
  }

  // For drag and drop functionality
  function onDrop(sourceSquare, targetSquare) {
    return makeMove(sourceSquare, targetSquare);
  }

  function onSquareClick(square) {
  if (!selectedPiece) {
    // No piece selected yet — try to select a piece
    highlightLegalMoves(square);
  } else if (selectedPiece === square) {
    // Clicked the same piece — deselect
    setSelectedPiece(null);
    setOptionSquares({});
  } else {
    const piece = game.get(square);
    const selectedPieceDetails = game.get(selectedPiece);

    // If clicked on another of your own pieces, switch selection
    if (
      piece &&
      selectedPieceDetails &&
      piece.color === selectedPieceDetails.color &&
      piece.color === "w" // Only allow white to move
    ) {
      highlightLegalMoves(square);
    } else {
      // Attempt to move to the clicked square
      const moveSuccess = makeMove(selectedPiece, square);

      // If move fails (invalid target), maybe allow selection again
      if (!moveSuccess) {
        highlightLegalMoves(square);
      }
    }
  }
}


  function resetGame() {
    setGame(new Chess());
    setGameHistory([]);
    setCurrentPlayer("white");
    setSelectedPiece(null);
    setOptionSquares({});
  }

  return (
    <div className="app-container">
      <div className="header">
        <h1>Chess Master</h1>
        <div className="game-info">
          <span className="player-turn">Current Turn: <strong>{currentPlayer}</strong></span>
          {game.isGameOver() && (
            <div className="game-status">
              {game.isCheckmate() ? "Checkmate!" : game.isDraw() ? "Draw!" : "Game Over!"}
            </div>
          )}
        </div>
      </div>

      <div className="game-container">
        <div className="board-container">
          <Chessboard
            position={game.fen()}
            onPieceDrop={onDrop}
            onSquareClick={onSquareClick}
            boardWidth={600}
            customBoardStyle={{
              borderRadius: "4px",
              boxShadow: "0 5px 15px rgba(0, 0, 0, 0.5)"
            }}
            customSquareStyles={optionSquares}
            areArrowsAllowed={true}
          />
        </div>

        <div className="game-controls">
          <div className="move-history">
            <h3>Move History</h3>
            <div className="history-list">
              {gameHistory.length > 0 ? (
                <ul>
                  {gameHistory.map((move, index) => (
                    <li key={index}>
                      {index % 2 === 0 ? Math.ceil((index + 1) / 2) + ". " : ""}
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
        <p>Built with React, react-chessboard, and chess.js</p>
      </footer>
    </div>
  );
}

export default App;