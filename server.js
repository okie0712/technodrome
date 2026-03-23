const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const allowedEffects = new Set(["halo", "chaos", "devil", "smoke", "quiet"]);
const controlState = {
  haloOverlay: true
};

app.use(express.static(__dirname));

app.post("/effect/:type", (req, res) => {
  const type = String(req.params.type || "").toLowerCase();
  if (!allowedEffects.has(type)) {
    return res.status(400).json({ ok: false, error: "invalid effect" });
  }

  io.emit("effect", { type });
  ITlog(`Effect fired: ${type} (http)`);
  return res.json({ ok: true, type });
});

function ITlog(message) {
    console.log(message);
    io.emit("log", message);
}

io.on("connection", (socket) => {
  ITlog(`Client connected to IT realtime core (socket: ${socket.id})`);
  socket.emit("control", { target: "haloOverlay", enabled: controlState.haloOverlay });

  socket.on("log", (message) => {
    ITlog(message);
  });

  socket.on("effect", (data) => {
    io.emit("effect", data);
    ITlog(`Effect fired: ${data.type}`);
  });

  socket.on("control", (data) => {
    if (!data || typeof data.target !== "string") return;
    if (!(data.target in controlState)) return;

    controlState[data.target] = !!data.enabled;
    io.emit("control", { target: data.target, enabled: controlState[data.target] });
    ITlog(`Control update: ${data.target}=${controlState[data.target]}`);
  });

  socket.on("controlRequest", (target) => {
    if (target === "haloOverlay") {
      socket.emit("control", { target: "haloOverlay", enabled: controlState.haloOverlay });
    }
  });

  const handleChatInput = (data) => {
    if (!data || typeof data.message !== "string") return;

    const user = data.user || "unknown";
    const message = data.message;

    ITlog(`Chat received from ${user}: ${message}`);

    io.emit("chat message", { user, message, role: "user" });
    io.emit("chatMessage", { user, message });

    const response = generateResponse(user, message);
    setTimeout(() => {
      io.emit("chat message", { user: "IT", message: response, role: "it" });
      io.emit("itResponse", { user: "IT", message: response });
    }, 320);
  };

  socket.on("chat message", handleChatInput);
  socket.on("chatMessage", handleChatInput);
});

function generateResponse(user, msg) {
  ITlog(`generateResponse fired: ${user} ${msg}`);
  const message = msg.toLowerCase();

  if (message.includes("halo crooked") || message.includes("halo crrooked")) {
    io.emit("effect", { type: "halo" });
    return "IT: correcting your halo...";
  }

  if (message.includes("control")) {
    io.emit("effect", { type: "chaos" });
    return "IT: chat is taking control.";
  }

  // 🔴 HARD COMMAND OVERRIDES
  if (message.includes("chaos")) {
    io.emit("effect", { type: "chaos" });
    return "IT: chaos injected.";
  }

  if (message.includes("halo")) {
    io.emit("effect", { type: "halo" });
    return "IT: purity acknowledged.";
  }

  if (message.includes("devil")) {
    io.emit("effect", { type: "devil" });
    return "IT: corruption rising.";
  }

  if (message.includes("quiet")) {
    io.emit("effect", { type: "quiet" });
    return "IT: silence enforced.";
  }

  // 🧠 AUTO CLASSIFICATION (THIS IS THE REAL POWER)
  if (message.includes("win") || message.includes("money") || message.includes("jackpot")) {
    io.emit("effect", { type: "halo" });
    return `IT: ${user} smells profit. interesting.`;
  }

  if (message.includes("lose") || message.includes("lost") || message.includes("rip")) {
    io.emit("effect", { type: "devil" });
    return `IT: ${user} feeds the machine.`;
  }

  if (message.includes("lol") || message.includes("lmao") || message.includes("wtf")) {
    io.emit("effect", { type: "chaos" });
    return `IT: instability increasing.`;
  }

  // 🧊 DEFAULT PRESENCE
  return `IT: watching ${user}...`;
}

server.listen(3000, () => {
  ITlog("IT is watching on port 3000");
});
