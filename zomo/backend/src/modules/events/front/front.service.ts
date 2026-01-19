import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { TranslationService } from 'src/modules/translation/translation.service';
@Injectable()
export class FrontService {
    constructor(
        @Inject('TIMEZONE_SERVICE')
            private timeZoneMicroservice: ClientProxy,
        private readonly translatorService: TranslationService,
    ) {}
}
