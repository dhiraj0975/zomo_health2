import {
    appConstant,
    BaseService,
    CommonArrayService,
    LanguagesEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
@Injectable()
export class LanguagesService extends BaseService<LanguagesEntity> {
    constructor(
        @InjectRepository(
            LanguagesEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicalanguageRepository: Repository<LanguagesEntity>,
        @InjectRepository(LanguagesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicalanguageRepository: Repository<LanguagesEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicalanguageRepository,
            writeReplicalanguageRepository,
            'activelanguage',
            commonArrayService,
        );
    }
}
