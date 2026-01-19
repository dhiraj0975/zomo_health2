import { appConstant, SurveyPopupEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class FrontService {
    constructor(
        @InjectRepository(SurveyPopupEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaSurveyPopupRepository: Repository<SurveyPopupEntity>,
    ) {}
    async surveyListRecord(fields: any = [],condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaSurveyPopupRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
}
