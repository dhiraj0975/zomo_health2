import { appConstant, CommonArrayService, CommonFileService, CovidUserAnswersEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateCovidInput } from '../../../input';
@Injectable()
export class UserAnswersService {
    constructor(
        @InjectRepository(CovidUserAnswersEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicauserAnswersRepository: Repository<CovidUserAnswersEntity>,
        @InjectRepository(CovidUserAnswersEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicauserAnswersRepository: Repository<CovidUserAnswersEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(
        condition: any,
        paginationParam: PaginateCovidInput,
    ) {
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
                : 'userAnswers.id';
        const queryResult = await this.readReplicauserAnswersRepository
            .createQueryBuilder('userAnswers')
            .innerJoinAndMapOne(
                'userAnswers.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = userAnswers.user_id`,
            )
            .leftJoinAndMapOne(
                'userAnswers.VacType',
                tableConstant.COVID.COVID_VACCINATION_TYPE,
                'VacType',
                `VacType.id = userAnswers.vaccination_type`,
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
        return await this.readReplicauserAnswersRepository
            .createQueryBuilder('userAnswers')
            .leftJoinAndMapOne(
                'userAnswers.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = userAnswers.user_id`,
            )
            .leftJoinAndMapOne(
                'userAnswers.VacType',
                tableConstant.COVID.COVID_VACCINATION_TYPE,
                'VacType',
                `VacType.id = userAnswers.vaccination_type`,
            )
            .where(condition)
            .getOne();
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicauserAnswersRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicauserAnswersRepository.create(data);
        return await this.writeReplicauserAnswersRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicauserAnswersRepository.metadata);
        return await this.writeReplicauserAnswersRepository
            .createQueryBuilder('userAnswers')
            .update(CovidUserAnswersEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicauserAnswersRepository.delete(condition);
    }
}
