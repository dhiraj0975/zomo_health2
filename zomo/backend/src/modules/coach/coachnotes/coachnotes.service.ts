import { appConstant, BaseService, CoachNotesEntity, CommonArrayService, CommonFileService, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithCoachesInput } from '../input';
@Injectable()
export class CoachNotesService extends BaseService<CoachNotesEntity> {
    constructor(
        @InjectRepository(CoachNotesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicacoachNotesRepository: Repository<CoachNotesEntity>,
        @InjectRepository(CoachNotesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicacoachNotesRepository: Repository<CoachNotesEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
        super(readReplicacoachNotesRepository, writeReplicacoachNotesRepository, 'notes', commonArrayService );
    }
    async paginateList(condition: any, paginationParam: PaginateWithCoachesInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(paginationParam.page || 1, paginationParam.limit);
        const order = paginationParam && paginationParam.order ? paginationParam.order : 'DESC';
        const orderBy = paginationParam && paginationParam.order_by ? paginationParam.order_by : 'notes.id';
        const queryResult = await this.readReplicacoachNotesRepository.createQueryBuilder('notes')
            .innerJoinAndMapOne(
                'notes.user',
                tableConstant.TBL_USERS,
                'user',
                'user.id = notes.user_id AND user.status != 2',
            )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    // async findOne(condition: any) {
    //     return await this.readReplicacoachNotesRepository.findOne({
    //         where: condition,
    //     });
    // }
    async listRecord(condition: any, fields:any = ['coachnote.id','coachnote.subject'], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicacoachNotesRepository.createQueryBuilder('coachnote')
            .where(condition)
            .orderBy(`coachnote.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .select(fields)
            .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicacoachNotesRepository.create(data);
        return await this.writeReplicacoachNotesRepository.insert(savedResult);
    }
    // async update(condition: any, data: any) {
    //     data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicacoachNotesRepository.metadata);
    //     return await this.writeReplicacoachNotesRepository.createQueryBuilder('coach')
    //         .update(CoachNotesEntity)
    //         .set(data)
    //         .where(condition)
    //         .execute();
    // }
    async delete(condition: any) {
        await this.writeReplicacoachNotesRepository.delete(condition);
    }
}