import { appConstant, CommonArrayService, CommonFileService, CovidPassportUserEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateCovidPassportInput } from "../../../input";
@Injectable()
export class PassportUsersService {
    constructor(
        @InjectRepository(CovidPassportUserEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicapassportUsersRepository: Repository<CovidPassportUserEntity>,
        @InjectRepository(CovidPassportUserEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicapassportUsersRepository: Repository<CovidPassportUserEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateCovidPassportInput) {
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
                : 'passportUsers.id';
        const queryResult = await this.readReplicapassportUsersRepository.createQueryBuilder('passportUsers')
            .leftJoinAndMapOne(
                'passportUsers.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = passportUsers.created_by AND user.status = 1`,
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
        return this.readReplicapassportUsersRepository.createQueryBuilder('passportUsers')
        .leftJoinAndMapOne(
            'passportUsers.setting',
            tableConstant.COVID.COVID_PASSPORT_SETTINGS,
            'setting',
            `setting.org_id = passportUsers.org_id`,
        )
        .where(condition)
        .orderBy('passportUsers.id', 'DESC')
        .getOne()
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicapassportUsersRepository.createQueryBuilder('passportUsers')
            .leftJoinAndMapOne(
                'passportUsers.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = passportUsers.created_by AND user.status = 1`,
            )
            .where(condition)
            .orderBy(`passportUsers.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicapassportUsersRepository.create(data);
        return await this.writeReplicapassportUsersRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicapassportUsersRepository.metadata);
        return await this.writeReplicapassportUsersRepository.createQueryBuilder('passportUsers')
            .update(CovidPassportUserEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicapassportUsersRepository.delete(condition);
    }
    async getRecordCount(condition: any){
        return await this.readReplicapassportUsersRepository.createQueryBuilder('passportUsers')
            .select(['COUNT(*) AS total',"SUM(IF(passportUsers.approval_status = '1', 1, 0)) AS approve","SUM(IF(passportUsers.approval_status = '0', 1, 0)) AS pending","SUM(IF(passportUsers.approval_status = '2', 1, 0)) AS reject"])
            .where(condition)
            .getRawOne();
    }
}