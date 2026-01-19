import { PaginateWithCompanyInput } from '@/input';
import { appConstant, ClientManagerAssignEntity, CommonArrayService, CommonFileService, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { InsertResult, Repository } from "typeorm";
@Injectable()
export class ClientManagerAssignService {
    constructor(
        @InjectRepository(ClientManagerAssignEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaclientManagerAssignRepository: Repository<ClientManagerAssignEntity>,
        @InjectRepository(ClientManagerAssignEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaclientManagerAssignRepository: Repository<ClientManagerAssignEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateWithCompanyInput) {
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
                : 'clientManager.id';
        const queryResult = await this.readReplicaclientManagerAssignRepository.createQueryBuilder('clientManager')
        .leftJoinAndMapOne(
            'clientManager.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = clientManager.org_id`,
          )
          .leftJoinAndMapOne(
            'clientManager.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = clientManager.user_id`,
          )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaclientManagerAssignRepository.createQueryBuilder('clientManager')
        .leftJoinAndMapOne(
            'clientManager.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = clientManager.org_id AND company.status = 1`,
          )
          .leftJoinAndMapOne(
            'clientManager.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = clientManager.user_id`,
          )
            .where(condition)
            .orderBy(`clientManager.id`, 'DESC')
            .getOne();
    }
    async listRecord(condition: string | object, orderBy: object = null, field: string[] = [
      'clientManager',
      'company.id','company.company_name','company.code','company.city','company.state','company.country','company.company_name','company.company_logo',
      'user.id','user.code','user.first_name','user.last_name', 'user.email'
    ], groupBy: string = null): Promise<ClientManagerAssignEntity[]> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = this.readReplicaclientManagerAssignRepository.createQueryBuilder('clientManager')
        .leftJoinAndMapOne(
            'clientManager.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = clientManager.org_id`,
          )
          .leftJoinAndMapOne(
            'clientManager.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = clientManager.user_id`,
          )
            .where(condition)
            .select(field)
            .orderBy(`clientManager.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
          if(groupBy){
              return await query
                .groupBy(groupBy)
                .getMany();
          }
          else{
            return await query
            .getMany();
          }
    }
    async save(data: any) : Promise<InsertResult> {
        const savedResult = this.writeReplicaclientManagerAssignRepository.create(data);
        return await this.writeReplicaclientManagerAssignRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
      data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaclientManagerAssignRepository.metadata);
        return await this.writeReplicaclientManagerAssignRepository.createQueryBuilder('clientManager')
            .update(ClientManagerAssignEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaclientManagerAssignRepository.delete(condition);
    }
    async assignCoachListRecord(fields: any[] = [],condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = await this.readReplicaclientManagerAssignRepository.createQueryBuilder('clientManager')
            .innerJoinAndMapOne(
              'clientManager.company',
              tableConstant.COMPANIES.TBL_COMPANY,
              'company',
              `company.id = clientManager.org_id`,
            )
            .leftJoinAndMapOne(
              'clientManager.user',
              tableConstant.TBL_USERS,
              'user',
              `user.id = clientManager.user_id`,
            )
            .select(fields)
            .where(condition)
            .orderBy(`clientManager.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
        return queryResult
    }
}