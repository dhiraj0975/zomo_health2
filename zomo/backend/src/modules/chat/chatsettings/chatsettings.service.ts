import { appConstant, ChatSettingsEntity, CommonArrayService, CommonFileService, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateWithChallengeInput } from 'src/input';
import { Repository } from 'typeorm';
@Injectable()
export class ChatSettingsService {
    constructor(
        @InjectRepository(ChatSettingsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaChatSettingsRepository: Repository<ChatSettingsEntity>,
        @InjectRepository(ChatSettingsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaChatSettingsRepository: Repository<ChatSettingsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(condition: any, paginationParam: PaginateWithChallengeInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        const order =
            paginationParam && paginationParam.order
                ? paginationParam.order
                : 'DESC';
        const orderBy =
            paginationParam && paginationParam.order_by
                ? paginationParam.order_by
                : 'cs.added_date';
        let queryResult = await this.readReplicaChatSettingsRepository.createQueryBuilder('cs')
            .leftJoinAndMapOne(
                'cs.user',
                tableConstant.TBL_USERS,
                'user',
                `cs.user_id = user.id`,
            )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaChatSettingsRepository.create(data);
        return await this.writeReplicaChatSettingsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaChatSettingsRepository.metadata);
        return await this.writeReplicaChatSettingsRepository.createQueryBuilder('cs')
            .update(ChatSettingsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaChatSettingsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaChatSettingsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
}
