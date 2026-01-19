import { appConstant, CommonArrayService, CommonFileService, DataManagersEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateWithCompanyInput } from 'src/input';
import { Repository } from 'typeorm';
@Injectable()
export class DataManagersService {
    constructor(
        @InjectRepository(DataManagersEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaDataManagersRepository: Repository<DataManagersEntity>,
        @InjectRepository(DataManagersEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaDataManagersRepository: Repository<DataManagersEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaDataManagersRepository.create(data);
        return await this.writeReplicaDataManagersRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
      data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaDataManagersRepository.metadata);
        return await this.writeReplicaDataManagersRepository.createQueryBuilder('dm')
            .update(DataManagersEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaDataManagersRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaDataManagersRepository.createQueryBuilder('datamanager').leftJoinAndMapOne(
            'datamanager.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = datamanager.org_id AND company.status = 1`,
          )
          .leftJoinAndMapOne(
            'company.company_type',
            tableConstant.COMPANIES.TBL_COMPANY_TYPE,
            'company_type',
            `company_type.id = company.companytype_id`,
          )
          .leftJoinAndMapOne(
            'datamanager.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = datamanager.user_id`,
          )
            .where(condition)
            .orderBy('datamanager.id', 'DESC')
            .getOne();
    }
    async listRecord(condition: string | object, orderBy: object = null, fields: string[] = ['datamanager', 'company', 'company_type', 'user'], joinTable: any = []): Promise<DataManagersEntity[]> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = this.readReplicaDataManagersRepository.createQueryBuilder('datamanager')
        if(joinTable && joinTable.length > 0){
            for(let i = 0; i < joinTable.length; i++){
                if(joinTable[i].type == 'INNER'){
                    query = query.innerJoinAndMapOne(
                        `${joinTable[i].connect}.${joinTable[i].alias}`,
                        joinTable[i].table,
                        joinTable[i].alias,
                        joinTable[i].on,
                    );
                }else{
                    query = query.leftJoinAndMapOne(
                        `${joinTable[i].connect}.${joinTable[i].alias}`,
                        joinTable[i].table,
                        joinTable[i].alias,
                        joinTable[i].on,
                    );
                }
            }
        }
        else{
            query = query
            .leftJoinAndMapOne(
            'datamanager.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = datamanager.org_id AND company.status = 1`,
          )
          .leftJoinAndMapOne(
            'company.company_type',
            tableConstant.COMPANIES.TBL_COMPANY_TYPE,
            'company_type',
            `company_type.id = company.companytype_id`,
          )
          .leftJoinAndMapOne(
            'datamanager.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = datamanager.user_id`,
          )
        }
        query = query
            .where(condition)
            .orderBy(`datamanager.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        query = query.select(fields);
        return await query.getMany();
    }
    async paginateList(condition: string | object, paginationParam: PaginateWithCompanyInput) {
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
            : 'company.id';
        const queryResult = await this.readReplicaDataManagersRepository.createQueryBuilder('datamanager')
        .leftJoinAndMapOne(
          'datamanager.company',
          tableConstant.COMPANIES.TBL_COMPANY,
          'company',
          `company.id = datamanager.org_id `,
        )
        .leftJoinAndMapOne(
          'company.company_type',
          tableConstant.COMPANIES.TBL_COMPANY_TYPE,
          'company_type',
          `company_type.id = company.companytype_id`,
        )
          .where(condition)
          .orderBy(orderBy, <any>order)
          .take(paginateObj.take)
          .skip(paginateObj.skip)
          .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
      }
}
