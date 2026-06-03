import {Ratelimit} from '@upstash/ratelimit'
import {Redis} from '@upstash/redis'
import dotenv from "dotenv"

dotenv.config() ; 

// Creating a new ratelimiter, that allows 10 requests per 10 seconds
//taken below code from docs 
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, "10 s"),
});

export default ratelimit ; 
