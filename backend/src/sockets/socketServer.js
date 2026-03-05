import { Server } from "socket.io";
import DeliveryPerson from "../models/DeliveryPerson.js";

let io;

// Store delivery person sockets
const deliverySockets = new Map();

export const initSocketServer = (httpsServer) => {
  io = new Server(httpsServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Delivery person registers socket
    socket.on("registerDelivery", (deliveryPersonId) => {
      deliverySockets.set(deliveryPersonId, socket.id);
      console.log(
        `Delivery ${deliveryPersonId} connected with socket ${socket.id}`,
      );
    });

    socket.on("updateLocation", async ({ deliveryPersonId, coordinates }) => {
      try {
        await DeliveryPerson.findByIdAndUpdate(deliveryPersonId, {
          location: {
            type: "Point",
            coordinates,
          },
          lastLocationUpdate: new Date(),
        });
      } catch (err) {
        console.error("Location update failed", err);
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);

      // remove disconnected sockets
      for (const [deliveryId, socketId] of deliverySockets.entries()) {
        if (socketId === socket.id) {
          deliverySockets.delete(deliveryId);
          break;
        }
      }
    });
  });

  return io;
};

// helper to access io anywhere
export const getIo = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

// helper to access delivery person's socket
export const getDeliverySocket = (deliveryPersonId) => {
  return deliverySockets.get(deliveryPersonId);
};
