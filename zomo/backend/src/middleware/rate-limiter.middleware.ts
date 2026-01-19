import { Injectable, NestMiddleware } from '@nestjs/common';
import rateLimit from 'express-rate-limit';
@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
    private limiter;
    constructor() {
        this.limiter = rateLimit({
            windowMs: 60 * 1000, // 1 minute
            max: 3, // Limit each IP to 30 requests per windowMs
            message: 'Too many requests, please try again later.',
            standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
            legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        });
    }
    use(req, res, next) {
        this.limiter(req, res, next);
    }
}