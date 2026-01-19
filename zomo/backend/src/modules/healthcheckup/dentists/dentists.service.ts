import { appConstant, CommonArrayService, CommonFileService, DentistsEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateInput } from 'src/input';
import { Repository } from 'typeorm';
@Injectable()
export class DentistsService {
    constructor(
        @InjectRepository(DentistsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaDentistsRepository: Repository<DentistsEntity>,
        @InjectRepository(DentistsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaDentistsRepository: Repository<DentistsEntity>,
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
                : 'dentist.date_completed';
        const queryResult = await this.readReplicaDentistsRepository.createQueryBuilder('dentist')
            .leftJoinAndMapOne(
                'dentist.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = dentist.userid AND user.role_id IN(2,16)`,
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
        const savedResult = this.writeReplicaDentistsRepository.create(data);
        return await this.writeReplicaDentistsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaDentistsRepository.metadata);
        return await this.writeReplicaDentistsRepository.createQueryBuilder('d')
            .update(DentistsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaDentistsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaDentistsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, fields: any, orderBy: any = null,tableData: any = null) {
        if (!orderBy) {
            orderBy = { 'd.id': 'DESC' };
        }
        let queryResult: any = this.readReplicaDentistsRepository.createQueryBuilder('d')
        if (tableData == null) {
            queryResult = queryResult.leftJoinAndMapOne(
                'd.activity',
                tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                'activity',
                `activity.id = d.activity_id`
            )
        }
        queryResult = queryResult.where(condition)
            .select(fields)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
        return await queryResult;
    }
    async submittedFormlist(condition: any, orderBy: any = null, select: any[] = ['d']) {
        if (!orderBy) {
            orderBy = { 'tu.id': 'DESC' };
        }
        let query = await this.readReplicaDentistsRepository.createQueryBuilder('d')
          .innerJoinAndMapOne(
            'd.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = d.userid`,
          )
          .leftJoinAndMapOne(
            'd.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = user.org_id`,
          )
          .leftJoinAndMapOne(
            'd.formInstructions',
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
