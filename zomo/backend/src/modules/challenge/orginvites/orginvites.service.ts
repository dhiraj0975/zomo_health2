import { appConstant, CommonArrayService, CommonFileService, OrgInvitesEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateWithChallengeInput } from 'src/input';
import { Repository } from 'typeorm';
@Injectable()
export class OrgInvitesService {
    constructor(
        @InjectRepository(OrgInvitesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaOrgInvitesRepository: Repository<OrgInvitesEntity>,
        @InjectRepository(OrgInvitesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaOrgInvitesRepository: Repository<OrgInvitesEntity>,
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
                : 'challenge.added_date';
        let queryResult = await this.readReplicaOrgInvitesRepository.createQueryBuilder('challenge')
        .leftJoinAndMapOne(
            'challenge.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = challenge.org_id AND company.status = 1`,
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
        const savedResult = this.writeReplicaOrgInvitesRepository.create(data);
        return await this.writeReplicaOrgInvitesRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaOrgInvitesRepository.metadata);
        return await this.writeReplicaOrgInvitesRepository.createQueryBuilder('aod')
            .update(OrgInvitesEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaOrgInvitesRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaOrgInvitesRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
}
