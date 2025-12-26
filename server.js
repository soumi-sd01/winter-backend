//disclaimer! ✨ this emoji, is added by me, NOT chatgpt. its for my own comments, don't assume chatgpt. (restofthecodeishoweverwrittenbychatgpt) 

const express = require("express");
const cors = require("cors");

const path = require("path");
const app = express();
app.use(cors()); 
app.use(express.json());

// Serve frontend
app.get("/", (req, res) => {
  res.send("Backend is running");
});

function formatTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;

  return `${hours} hr ${minutes} min`;
}

const ADMIN_PIN = "1234";     // GOTTA CHANGE THIS


// In-memory queue state             ✨ ASSIGN VALUE TO VARIABLE
let queue = {
  queueName: "My Queue",
  currentToken: 0,
  lastIssuedToken: 0,
  avgTimePerToken: 3, // ✨ Start with 3 mins so "Estimated Wait" isn't 0 immediately
  isPaused: false,
  announcement: "Click Join Queue to Generate Token",
  lastNextTime: null, 
  leftTokens: []
};

app.get("/queue/status", (req, res) => { 
  // ✨ Calculate ACTUAL people waiting (excluding those who left)
  let actualWaiting = 0;
  for (let i = queue.currentToken + 1; i <= queue.lastIssuedToken; i++) {
    if (!queue.leftTokens.includes(i)) {
      actualWaiting++;
    }
  }

  const estimatedMinutes = actualWaiting * queue.avgTimePerToken;

  res.json({                            
    queueName: queue.queueName,
    currentToken: queue.currentToken,
    avgTimePerToken: queue.avgTimePerToken,
    isPaused: queue.isPaused,
    announcement: queue.announcement,
    tokensWaiting: actualWaiting, // ✨ Now reflects the REAL count
    estimatedWait: formatTime(estimatedMinutes), 
    serverTime: new Date().toLocaleTimeString()
  });
});


app.post("/queue/join", (req, res) => {      // ✨ JOIN QUEUE
  if (queue.isPaused) {
    return res.status(403).json({
      error: "Queue is currently paused"
    });
  }

  // Generate next token
  queue.lastIssuedToken += 1;

  const yourToken = queue.lastIssuedToken;             // ✨ THESE ARE JUST BIG NAMES, STORING NORMAL VALUES
  const waitingTokens = yourToken - queue.currentToken;
  const estimatedMinutes = waitingTokens * queue.avgTimePerToken;

  res.json({
    yourToken: yourToken,
    estimatedMinutes: estimatedMinutes
  });
});

app.post("/queue/leave", (req, res) => {
  const { token } = req.body;
  
  if (token) {
    // Add token to the list of people who left
    queue.leftTokens.push(Number(token));
    return res.json({ message: "You have left the queue" });
  }
  
  res.status(400).json({ error: "Token required" });
});

// ✨ ADMIN PART

app.post("/admin/login", (req, res) => {       // ✨ ADMIN PIN ACCESS
  const { pin } = req.body;

  if (pin !== ADMIN_PIN) {
    return res.status(403).json({
      error: "Invalid admin PIN"
    });
  }

  res.json({
    message: "Admin access granted"
  });
});


app.post("/admin/next", (req, res) => {
  if (queue.currentToken >= queue.lastIssuedToken) {
    return res.json({ message: "No more tokens in queue" });
  }

  const now = Date.now();
  if (queue.lastNextTime !== null) {
    const diffMs = now - queue.lastNextTime;
    // ✨ Convert milliseconds to ACTUAL minutes
    const diffMinutes = Math.round(diffMs / 60000); 
    
    // Only update if at least 1 minute has passed to avoid dividing by zero/small numbers
    if (diffMinutes > 0) {
      queue.avgTimePerToken = Math.round((queue.avgTimePerToken + diffMinutes) / 2);
    }
  }

  // Skip tokens that left
  do {
    queue.currentToken += 1;
  } while (
    queue.leftTokens.includes(queue.currentToken) && 
    queue.currentToken < queue.lastIssuedToken
  );

  queue.lastNextTime = now;

  res.json({
    currentToken: queue.currentToken,
    avgTimePerToken: queue.avgTimePerToken
  });
});

app.post("/admin/resume", (req, res) => {    // ✨ RESUME
  queue.isPaused = false;

  queue.announcement = "Click Join Queue to generate your token";
  res.json({
    message: "Queue resumed",
    isPaused: queue.isPaused, 
    announcement: queue.announcement
  });
});

app.post("/admin/pause", (req, res) => {
  queue.isPaused = true;
  queue.announcement = "IMPORTANT: Queue paused! No tokens are being generated.";

  res.json({
    message: "Queue paused",
    isPaused: queue.isPaused, 
    announcement: queue.announcement
  });
});

 
app.post("/admin/announcement", (req, res) => {     // ✨ CUSTOM MESSAGE
  const { message, pin } = req.body;

  if (pin !== ADMIN_PIN) {
    return res.status(403).json({
      error: "Invalid admin PIN"
    });
  }


  if (!message || message.trim() === "") {
    return res.status(400).json({
      error: "Announcement message required"
    });
  }

  queue.announcement = message;

  res.json({
    message: "Announcement updated",
    announcement: queue.announcement
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
