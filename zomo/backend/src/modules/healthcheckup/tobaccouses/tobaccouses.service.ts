import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonFileService,
    tableConstant,
    TobaccoUsesEntity
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class TobaccoUsesService  extends BaseService<TobaccoUsesEntity>{
    constructor(
        @InjectRepository(TobaccoUsesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaTobaccoUsesRepository: Repository<TobaccoUsesEntity>,
        @InjectRepository(TobaccoUsesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaTobaccoUsesRepository: Repository<TobaccoUsesEntity>,
        private readonly commonFileService: CommonFileService,
        commonArrayService: CommonArrayService,
    ) {
        super(readReplicaTobaccoUsesRepository,writeReplicaTobaccoUsesRepository,'tobaccoUses',commonArrayService);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaTobaccoUsesRepository.create(data);
        return await this.writeReplicaTobaccoUsesRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaTobaccoUsesRepository.metadata);
        return await this.writeReplicaTobaccoUsesRepository.createQueryBuilder('tu')
            .update(TobaccoUsesEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaTobaccoUsesRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaTobaccoUsesRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, fields: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { 'tu.id': 'DESC' };
        }
        let queryResult: any = this.readReplicaTobaccoUsesRepository.createQueryBuilder('tu')
        .leftJoinAndMapOne(
            'tu.activity',
            tableConstant.ACTIVITIES.TBL_ACTIVITIES,
            'activity',
            `activity.id = tu.activity_id`
        )
        .where(condition)
            .select(fields)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
        return await queryResult;
    }
    async tobaccoListRecord(condition: any, fields: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { 'tu.id': 'DESC' };
        }
        let queryResult: any = this.readReplicaTobaccoUsesRepository.createQueryBuilder('tu')
            .where(condition)
            .select(fields)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getRawMany();
        return await queryResult;
    }
    async submittedFormlist(condition: any, orderBy: any = null, select: any[] = ['tu']) {
        if (!orderBy) {
            orderBy = { 'tu.id': 'DESC' };
        }
        let query = await this.readReplicaTobaccoUsesRepository.createQueryBuilder('tu')
          .innerJoinAndMapOne(
            'tu.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = tu.user_id`,
          )
          .leftJoinAndMapOne(
            'tu.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = user.org_id`,
          )
          .leftJoinAndMapOne(
            'tu.formInstructions',
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
