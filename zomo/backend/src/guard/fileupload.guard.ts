import { appConstant } from '@common-constants';
import {
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Injectable,
} from '@nestjs/common';
import * as moment from 'moment-timezone';
import { TranslationService } from 'src/modules/translation/translation.service';
@Injectable()
export class FileUploadRateLimitGuard implements CanActivate {
    private requestCounts: { [key: string]: moment.Moment[] } = {};
    constructor(private readonly translatorService: TranslationService) {}
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const clientIP = request.ip;
        const isFileUpload = (request.method === 'POST' || request.method === 'PUT') && request.is('multipart/form-data');
        const rateLimit = parseInt(appConstant.FILE_UPLOAD_RATE_LIMIT) || 10;
        const timeWindow = 1; // Time window in minutes
        // If it's not a file upload, allow access
        if (!isFileUpload) {
            return true;
        }
        if (!this.requestCounts[clientIP]) {
            this.requestCounts[clientIP] = [];
        }
        // Filter out requests that are older than the time window
        const cutoffTime = moment().subtract(timeWindow, 'minutes');
        this.requestCounts[clientIP] = this.requestCounts[clientIP].filter(time => moment(time) > cutoffTime);
        // Check if the current request count exceeds the rate limit
        if (this.requestCounts[clientIP].length >= rateLimit) {
            throw new HttpException(
                this.translatorService.translate(request?.lang, "ERR_TOO_MANY_FILE_UPLOADS"),
                HttpStatus.TOO_MANY_REQUESTS
            );
        }
        this.requestCounts[clientIP].push(moment());
        return true;
    }
}
