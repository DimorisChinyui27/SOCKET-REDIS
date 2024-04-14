import { Server } from "socket.io";
import http from "http";
import express from "express";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";

const app = express();
const server = http.createServer(app);
const pubClient = createClient({ url: "redis://10.70.3.101:6379", password: "IwaJetG0c@r" });
const subClient = pubClient.duplicate();

let io;

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000"],
      methods: ["GET", "POST", "PATCH", "DELETE"],
    },
    adapter: createAdapter(pubClient, subClient),
  });

  const userSocketMap = {};

  io.on("connection", (socket) => {
    console.log("a user connected", socket.id);
    const userId = socket.handshake.query.userId;
    if (userId !== undefined) {
      userSocketMap[userId] = socket.id;
      pubClient.hSet("userSocketMap", userId, socket.id);
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    socket.on("disconnect", () => {
      console.log("user disconnected", socket.id);
      delete userSocketMap[userId];
      pubClient.hDel("userSocketMap", userId);
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
  });
});

const getReceiverSocketId = async (receiverId) => {
  const socketId = await pubClient.hGet("userSocketMap", receiverId.toString());
  return socketId;
};

export { app, server, io, getReceiverSocketId };
