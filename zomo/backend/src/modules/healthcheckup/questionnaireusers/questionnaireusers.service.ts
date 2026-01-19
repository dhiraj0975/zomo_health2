import { appConstant, CommonArrayService, CommonFileService, QuestionnaireUsersEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateWithHealthCheckupInput } from 'src/input';
import { FindManyOptions, FindOptionsOrder, FindOptionsWhere, FindOptionsWhereProperty, Repository } from 'typeorm';
@Injectable()
export class QuestionnaireUsersService {
    constructor(
        @InjectRepository(QuestionnaireUsersEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuestionnaireUsersRepository: Repository<QuestionnaireUsersEntity>,
        @InjectRepository(QuestionnaireUsersEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuestionnaireUsersRepository: Repository<QuestionnaireUsersEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) { }
    async paginateList(condition: any, paginationParam: PaginateWithHealthCheckupInput) {
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
                : 'a.id';
        const queryResult = await this.readReplicaQuestionnaireUsersRepository.createQueryBuilder('a')
            .leftJoinAndMapOne(
                'a.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = a.org_id AND company.status = 1`,
            )
            .leftJoinAndMapOne(
                'a.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = a.user_id AND user.status = 1`,
            )
            .leftJoinAndMapOne(
                'user.settings',
                tableConstant.TBL_USERS_SETTINGS,
                'settings',
                `settings.user_id = user.id`,
            )
            .leftJoinAndMapOne(
                'user.role',
                tableConstant.MASTER.TBL_ROLES,
                'role',
                `role.id = user.role_id`,
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
        const savedResult = this.writeReplicaQuestionnaireUsersRepository.create(data);
        return await this.writeReplicaQuestionnaireUsersRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaQuestionnaireUsersRepository.metadata);
        return await this.writeReplicaQuestionnaireUsersRepository.createQueryBuilder('a')
            .update(QuestionnaireUsersEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaQuestionnaireUsersRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuestionnaireUsersRepository.createQueryBuilder('a')
            .leftJoinAndMapOne(
                'a.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = a.org_id AND company.status = 1`,
            )
            .leftJoinAndMapOne(
                'a.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = a.user_id AND user.status = 1`,
            )
            .leftJoinAndMapOne(
                'user.role',
                tableConstant.MASTER.TBL_ROLES,
                'role',
                `role.id = user.role_id`,
            )
            .where(condition)
            .orderBy(`a.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getOne();
    }
    async findOneUser(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuestionnaireUsersRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecords(condition: FindOptionsWhere<QuestionnaireUsersEntity>, orderBy: FindOptionsOrder<QuestionnaireUsersEntity> = null, fields: (keyof QuestionnaireUsersEntity)[] = ['id', 'org_id', 'user_id']) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let data = await this.readReplicaQuestionnaireUsersRepository.find({
            where: condition,
            order: orderBy,
            select: fields,
        });
        return data;
    }
}
