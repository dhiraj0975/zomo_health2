import { appConstant, CommonArrayService, CommonFileService, OptometristsEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateInput } from 'src/input';
import { Repository } from 'typeorm';
@Injectable()
export class OptometristsService {
    constructor(
        @InjectRepository(OptometristsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaOptometristsRepository: Repository<OptometristsEntity>,
        @InjectRepository(OptometristsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaOptometristsRepository: Repository<OptometristsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(condition: any, paginationParam: PaginateInput) {
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
                : 'o.date_completed';
        const queryResult = await this.readReplicaOptometristsRepository.createQueryBuilder('o')
            .leftJoinAndMapOne(
                'o.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = o.userid AND user.role_id IN(2,16)`,
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
        const savedResult = this.writeReplicaOptometristsRepository.create(data);
        return await this.writeReplicaOptometristsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaOptometristsRepository.metadata);
        return await this.writeReplicaOptometristsRepository.createQueryBuilder('o')
            .update(OptometristsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaOptometristsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaOptometristsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, fields: any, orderBy: any = null,tableData: any = null) {
        if (!orderBy) {
            orderBy = { 'o.id': 'DESC' };
        }
        let queryResult: any = this.readReplicaOptometristsRepository.createQueryBuilder('o')
        if (tableData == null) {
            queryResult = queryResult.leftJoinAndMapOne(
                'o.activity',
                tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                'activity',
                `activity.id = o.activity_id`
            )
        }
        queryResult = queryResult.where(condition)
            .select(fields)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
        return await queryResult;
    }
    async submittedFormlist(condition: any, orderBy: any = null, select: any[] = ['o']) {
        if (!orderBy) {
            orderBy = { 'tu.id': 'DESC' };
        }
        let query = await this.readReplicaOptometristsRepository.createQueryBuilder('o')
          .innerJoinAndMapOne(
            'o.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = o.userid`,
          )
          .leftJoinAndMapOne(
            'o.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = user.org_id`,
          )
          .leftJoinAndMapOne(
            'o.formInstructions',
            tableConstant.HEALTH_CHECKUP.TBL_HC_FORM_INSTRUCTIONS,
            'formInstructions',
            `formInstructions.company_id = user.org_id`,
          )
          .where(condition)
          .select(select)
          .getRawMany();
        return query
      }
}
