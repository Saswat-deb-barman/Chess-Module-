import { useEffect, useState } from "react";
import { socket } from "../lib/multiplayerSocket.js";

function roomLink(code) {
  const url = new URL(window.location.href);
  url.searchParams.set("room", code);
  return url.toString();
}

export default function FriendLobby({ onGameStart, initialRoomCode }) {
  const [screen, setScreen] = useState("choose"); // "choose" | "waiting" | "join" | "joining"
  const [roomCode, setRoomCode] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [error, setError] = useState(null);
  const [myColor, setMyColor] = useState(null);
  const [opponentPresent, setOpponentPresent] = useState(false);

  // A shared link (?room=CODE) or an accepted challenge's room code both
  // drop the joiner straight into the join form with the code pre-filled,
  // rather than making them type it — mechanically the same "join" path
  // either way, just a different source for the code.
  useEffect(() => {
    const roomFromUrl = new URLSearchParams(window.location.search).get("room") ?? initialRoomCode;
    if (roomFromUrl) {
      setJoinInput(roomFromUrl.toUpperCase());
      setScreen("join");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRoomCode]);

  useEffect(() => {
    function handleRoomCreated({ code }) {
      setRoomCode(code);
      setScreen("waiting");
    }
    function handlePlayerRole(role) {
      setMyColor(role);
    }
    function handleOpponentJoined() {
      setOpponentPresent(true);
    }
    function handleJoinError(message) {
      setError(message);
      setScreen("join");
    }
    // Fires when the server's io.use auth middleware rejects the
    // handshake — i.e. not signed in. Surfaced here rather than left
    // silent, since a guest clicking "Create a room" would otherwise see
    // nothing happen at all.
    function handleConnectError() {
      setError("Sign in with Google to play a friend.");
      setScreen("choose");
    }

    socket.on("roomCreated", handleRoomCreated);
    socket.on("playerRole", handlePlayerRole);
    socket.on("opponentJoined", handleOpponentJoined);
    socket.on("joinError", handleJoinError);
    socket.on("connect_error", handleConnectError);

    return () => {
      socket.off("roomCreated", handleRoomCreated);
      socket.off("playerRole", handlePlayerRole);
      socket.off("opponentJoined", handleOpponentJoined);
      socket.off("joinError", handleJoinError);
      socket.off("connect_error", handleConnectError);
    };
  }, []);

  // Fires once both sides know their color AND know the other has
  // joined. For the room creator these settle at different times
  // (color is known immediately, opponent arrives later); for the
  // joiner they arrive together since the room is only joinable once
  // it already has an open seat.
  useEffect(() => {
    if (myColor && opponentPresent) {
      onGameStart({ myColor, roomCode });
    }
  }, [myColor, opponentPresent, roomCode, onGameStart]);

  function createRoom() {
    setError(null);
    if (!socket.connected) socket.connect();
    socket.emit("createRoom");
  }

  function joinRoom(e) {
    e.preventDefault();
    setError(null);
    const code = joinInput.trim().toUpperCase();
    if (!code) return;
    setRoomCode(code);
    setScreen("joining");
    if (!socket.connected) socket.connect();
    socket.emit("joinRoom", code);
  }

  if (screen === "waiting") {
    return (
      <div className="friend-lobby">
        <p>Share this code or link with your friend:</p>
        <p className="room-code">{roomCode}</p>
        <input
          className="room-link"
          readOnly
          value={roomLink(roomCode)}
          onFocus={(e) => e.target.select()}
        />
        <p className="lobby-status">Waiting for your friend to join…</p>
      </div>
    );
  }

  if (screen === "join" || screen === "joining") {
    return (
      <form className="friend-lobby" onSubmit={joinRoom}>
        <label htmlFor="room-code-input">Enter room code</label>
        <input
          id="room-code-input"
          value={joinInput}
          onChange={(e) => setJoinInput(e.target.value)}
          disabled={screen === "joining"}
          placeholder="e.g. FFJG66"
        />
        <button type="submit" disabled={screen === "joining"}>
          {screen === "joining" ? "Joining…" : "Join"}
        </button>
        {error && <p className="lobby-error">{error}</p>}
      </form>
    );
  }

  return (
    <div className="friend-lobby">
      <button className="start-button" onClick={createRoom}>
        Create a room
      </button>
      <button type="button" className="lobby-join-link" onClick={() => setScreen("join")}>
        Have a room code?
      </button>
      {error && <p className="lobby-error">{error}</p>}
    </div>
  );
}
