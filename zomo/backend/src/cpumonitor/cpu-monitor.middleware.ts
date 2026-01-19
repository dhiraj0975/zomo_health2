import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CpuMonitorService, ActiveRequest } from './cpu-monitor.service';

@Injectable()
export class CpuMonitorMiddleware implements NestMiddleware {
    constructor(private readonly cpuMonitorService: CpuMonitorService) {}
    use(req: Request, res: Response, next: NextFunction) {
        const reqData: ActiveRequest = {
            path: req.originalUrl,
            method: req.method,
            start: Date.now(),
            body: req.body,
            query: req.query,
            params: req.params,
            ip: req.ip
        };
        this.cpuMonitorService.trackRequest(reqData);
        res.on('finish', () => {
            this.cpuMonitorService.removeRequest(reqData);
        });
        next();
    }
}