import { appConstant, EmotionalWellBeingCategoryEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class FrontService {
    constructor(
        @InjectRepository(EmotionalWellBeingCategoryEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaWellbeingCategoryRepository: Repository<EmotionalWellBeingCategoryEntity>,
    ) {}
    async wellbeingCategoryFindOne(condition: any,field: any[] = [], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaWellbeingCategoryRepository.findOne({
            select: field,
            where: condition,
            order: orderBy,
        });
    }
}
