import express from "express" ; // Requiring ESM imports by configuring type module in package.json
import cors from "cors"; 
import dotenv from "dotenv" ;
import dns from "dns" ;
import webpush from "web-push";
import fs from "fs";
import path from "path";
import notesRoutes from "./routes/notesRoutes.js" ; 
import foldersRoutes from "./routes/foldersRoutes.js" ; 
import authRoutes from "./routes/authRoutes.js" ; 
import notificationRoutes from "./routes/notificationRoutes.js" ; 
import {connectDB} from "./config/db.js" ;
import ratelimiter from "./middleware/rateLimiter.js";
import { startNotificationWorker } from "./workers/notificationWorker.js";
try {
    dns.setServers(["1.1.1.1", "8.8.8.8"]);
} catch (dnsError) {
    console.warn("Unable to set custom DNS servers:", dnsError.message);
}

dotenv.config() ;

// Initialize VAPID Keys dynamically if not found in .env
let vapidPublic = process.env.VAPID_PUBLIC_KEY;
let vapidPrivate = process.env.VAPID_PRIVATE_KEY;

if (!vapidPublic || !vapidPrivate) {
  console.log("VAPID Keys not found in environment. Generating new keys...");
  try {
    const keys = webpush.generateVAPIDKeys();
    vapidPublic = keys.publicKey;
    vapidPrivate = keys.privateKey;
    
    // Save generated keys to memory so other modules can access them instantly
    process.env.VAPID_PUBLIC_KEY = vapidPublic;
    process.env.VAPID_PRIVATE_KEY = vapidPrivate;
    global.generatedVapidPublicKey = vapidPublic;
    
    // Try to append these to the .env file so they persist across restarts
    const envPath = path.resolve(process.cwd(), ".env");
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf8");
    }
    
    let newContent = envContent;
    if (!envContent.includes("VAPID_PUBLIC_KEY")) {
      newContent += `\nVAPID_PUBLIC_KEY=${vapidPublic}`;
    }
    if (!envContent.includes("VAPID_PRIVATE_KEY")) {
      newContent += `\nVAPID_PRIVATE_KEY=${vapidPrivate}`;
    }
    
    fs.writeFileSync(envPath, newContent, "utf8");
    console.log("VAPID keys successfully generated and appended to .env file.");
  } catch (err) {
    console.error("Failed to generate or persist VAPID keys:", err.message);
  }
} else {
  global.generatedVapidPublicKey = vapidPublic;
}

// Configure web-push details
try {
  webpush.setVapidDetails(
    "mailto:docket-admin@yopmail.com",
    vapidPublic,
    vapidPrivate
  );
  console.log("Web Push VAPID configuration initialized successfully.");
} catch (vapidErr) {
  console.error("Failed to configure Web Push VAPID details:", vapidErr.message);
}

const app = express() ;
const PORT = process.env.PORT || 5001 ; 

// Registering global middleware interceptors
app.use(express.json()) ; // Parsing incoming JSON request bodies
app.use(cors()); 

// Health check endpoints (placed before rate-limiting to prevent poller blockages)
app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", timestamp: new Date() });
});
app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "OK", timestamp: new Date() });
});

app.use(ratelimiter) ; 
app.use((req,res,next) =>{
    console.log(`Request method is ${req.method} & request URL is ${req.url}`); 
    next() ; 
}); 
app.use("/api/notes", notesRoutes) ;
app.use("/api/folders", foldersRoutes) ;
app.use("/api/auth", authRoutes) ;
app.use("/api/notifications", notificationRoutes) ;

connectDB().then(() => {
    // Starting background AI notification scheduler worker
    startNotificationWorker();
    
    app.listen(PORT, ()=>{
    console.log("server starteed on PORT ", PORT)
    }); 
});

