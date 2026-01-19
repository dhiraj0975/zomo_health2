import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
const pidusage = require('pidusage');
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';

export interface ActiveRequest {
    path: string;
    method: string;
    start: number;
    body?: any;
    query?: any;
    params?: any;
    ip?: string;
}

@Injectable()
export class CpuMonitorService implements OnModuleInit {
    private readonly logger = new Logger(CpuMonitorService.name);
    public activeRequests: ActiveRequest[] = [];
    private readonly cpuThreshold = 45;
    private readonly interval = 5000;

    constructor(
        private readonly activityLogService: ActivityLogService
    ) {}

    onModuleInit() {
        this.startMonitoring();
    }

    public trackRequest(req: any) {
        const reqData: ActiveRequest = {
            path: req.path,
            method: req.method,
            start: Date.now(),
            body: req.body,
            query: req.query,
            params: req.params,
            ip: req.ip
        };
        this.activeRequests.push(reqData);
        return reqData;
    }

    public removeRequest(reqData: ActiveRequest) {
        this.activeRequests = this.activeRequests.filter(r => r !== reqData);
    }

    private startMonitoring() {
        setInterval(async () => {
            try {
                const stats = await pidusage(process.pid);
                const cpu = stats.cpu;

                if (cpu > this.cpuThreshold) {
                    const timestamp = new Date().toISOString();
                    this.logger.warn(`==== CPU Spike at ${timestamp} ====`);
                    this.logger.warn(`CPU Usage: ${cpu.toFixed(2)}%`);
                    const sortedRequests = this.activeRequests
                        .map(r => ({
                            path: r.path,
                            method: r.method,
                            duration: Date.now() - r.start,
                            body: r.body,
                            query: r.query,
                            params: r.params,
                            ip: r.ip
                        }))
                        .sort((a, b) => b.duration - a.duration);
                    this.activityLogService.error_log(
                        0,
                        'cpumonitor',
                        `CPU Usage: ${cpu.toFixed(2)}%`,
                        { query: timestamp },
                        { file: sortedRequests }
                    );
                }
            } catch (err) {
                this.logger.error('CPU monitor error', err);
            }
        }, this.interval);
    }
}
