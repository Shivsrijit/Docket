import express from "express" ; // Requiring ESM imports by configuring type module in package.json
import cors from "cors"; 
import dotenv from "dotenv" ;
import dns from "dns" ;
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

