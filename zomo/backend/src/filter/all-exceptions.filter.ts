import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { TranslationService } from 'src/modules/translation/translation.service';
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    constructor(private readonly translatorService: TranslationService) {}
    private urlMatches(url: string, patterns: string[]): boolean {
        return patterns.some(pattern => url.includes(pattern));
    }
    private async translate(lang: string, key: string, replacement?: string): Promise<string> {
        const message = await this.translatorService.frontendReadTranslation(lang, key);
        return replacement ? message.replace("%s", replacement) : message;
    }
    async catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const lang = request.lang;
        const url = request?.url || '';
        let status = exception instanceof HttpException
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;
        let message = exception?.['message'] || '';
        if (!message) {
            message = await this.translate(lang, "ERR_INTERNAL_SERVER_ERROR");
        }
        const authErrors = [
            "jwt expired",
            "You've been signed out. Please log in again.",
            "Error: Authorization Expired, try login again .",
            "ERR_EXPIRED_AUTHORIZATION",
        ];
        if (authErrors.includes(message)) {
            status = HttpStatus.UNAUTHORIZED;
            message = await this.translate(lang, "ERR_EXPIRED_AUTHORIZATION");
        }
        if(exception['response'] && exception['response']?.['message']){
            message = Array.isArray(exception['response']['message']) ? exception['response']['message']?.join(',') : exception?.['message'];
        }
        if (message === "File too large") {
            if (this.urlMatches(url, ['communication/email-campaign-requests/create', 'communication/email-assets/create'])) {
                message = await this.translate(lang, "ERR_FILE_SIZE", "10");
            } else if (url.includes('communication/email-assets/uploaditem')) {
                message = await this.translate(lang, "ERR_FILE_SIZE", "2");
            } else if (url.includes('data-management/document/create')) {
                message = await this.translate(lang, "ERR_FILE_SIZE", "100");
            } else {
                const imageSize = this.urlMatches(url, [
                    '/category/create',
                    '/quiz/hotspot-question/create',
                    '/challenge/challenge',
                    '/challenge/groups',
                    '/activitytracker/submit-forms'
                ]) ? "2" : "5";
                message = await this.translate(lang, "ERR_IMAGE_SIZE", imageSize);
            }
        }
        if (message === "Too many files") {
            if (url.includes('communication/email-assets/create')) {
                message = await this.translate(lang, "ERR_FILE_LIMIT", "10");
            } else if (url.includes('communication/email-assets/uploaditem')) {
                message = await this.translate(lang, "ERR_FILE_LIMIT", "1");
            } else if (url.includes('communication/email-campaign-requests/step-two')) {
                message = await this.translate(lang, "ERR_FILE_LIMIT", "3");
            }
        }
        if (status === HttpStatus.FORBIDDEN || message === 'Forbidden resource') {
            message = await this.translate(lang, "ERR_FORBIDDEN_ACCESS");
        }
        if (message?.includes('Unsupported file format') || message?.includes('file type')) {
            status = HttpStatus.UNSUPPORTED_MEDIA_TYPE;
        }
        if (
            typeof message === 'string' &&
            ['SQL', 'Unknown column', 'Column', 'query'].some(str => message.includes(str))
        ) {
            console.log("sql error", message);
            message = await this.translate(lang, "Something went wrong !");
        }
        response.status(status).json({
            success: 0,
            data: null,
            error: 1,
            error_code: message,
        });
    }
}
