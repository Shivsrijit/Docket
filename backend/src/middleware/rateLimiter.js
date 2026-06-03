import ratelimit from "../config/upstash.js";

const ratelimiter = async (req, res, next) => {
  try {
    // Extracting client IP address, handling proxy headers if present
    const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "global-limit-key";
    
    // Applying sliding window rate limit per IP using Upstash Redis
    const { success } = await ratelimit.limit(`docket-limit-${ip}`); 
    if (!success) {
      return res.status(429).json({
        message: "Too many requests, please try again after some time!", 
      }); 
    }
    next(); 
  } catch (error) {
    // Failing open to maintain service availability if Redis is unreachable
    console.error("Error in ratelimiter middleware (failing open):", error.message); 
    next(); 
  }
};

export default ratelimiter;