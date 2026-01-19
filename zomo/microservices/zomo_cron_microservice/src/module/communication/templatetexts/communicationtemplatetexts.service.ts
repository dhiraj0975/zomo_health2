import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    CommunicationTemplateTextsEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class CommunicationTemplateTextsService {
    constructor(
        @InjectRepository(
            CommunicationTemplateTextsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicacommunicationTemplateTextsRepository: Repository<CommunicationTemplateTextsEntity>,
        @InjectRepository(
            CommunicationTemplateTextsEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicacommunicationTemplateTextsRepository: Repository<CommunicationTemplateTextsEntity>,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
    ) {}

    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicacommunicationTemplateTextsRepository.findOne(
            {
                where: condition,
                order: orderBy,
            },
        );
    }
}
