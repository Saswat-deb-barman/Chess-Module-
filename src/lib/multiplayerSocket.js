import { io } from "socket.io-client";

const BASE_URL = import.meta.env.VITE_SOCKET_URL ?? import.meta.env.VITE_COUNCIL_URL ?? "http://localhost:8787";
const AUTH_STORAGE_KEY = "chess-mvp-auth"; // must match src/lib/auth.jsx's STORAGE_KEY

/**
 * Singleton, not a React context — the "play a friend" flow is a single
 * connection shared by FriendLobby and MultiplayerBoard, not something
 * many unrelated parts of the app need to read (unlike auth, which is a
 * real context for that reason). Not connected until a component actually
 * enters the friend flow, so guest solo-vs-bot play never opens a socket.
 *
 * `auth` is a callback, not a static object, so the token is read fresh
 * at connect time straight out of localStorage — the same source
 * auth.jsx itself reads from, without needing to import React context
 * into a plain module.
 */
export const socket = io(BASE_URL, {
  autoConnect: false,
  auth: (cb) => cb({ token: localStorage.getItem(AUTH_STORAGE_KEY) }),
});
