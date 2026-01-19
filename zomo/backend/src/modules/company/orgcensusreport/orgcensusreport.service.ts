import { appConstant, CommonArrayService, OrgCensusReportEntity} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class OrgCensusReportService {
    constructor(
        @InjectRepository(OrgCensusReportEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaOrgCensusReportRepository: Repository<OrgCensusReportEntity>,
        private readonly commonArrayService: CommonArrayService,
    ) { }
    async paginateList(condition: any, paginationParam: PaginateWithCompanyInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        const order = paginationParam && paginationParam.order ? paginationParam.order : 'DESC';
        const orderBy = paginationParam && paginationParam.order_by ? `orgcensusreport.`+paginationParam.order_by : 'orgcensusreport.id';
        const queryResult = await this.readReplicaOrgCensusReportRepository.createQueryBuilder('orgcensusreport')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
}