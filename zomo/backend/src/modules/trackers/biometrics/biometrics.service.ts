import { appConstant, BaseService, CommonArrayService, CommonFileService, FtBiometricsEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithFoodInput } from '../input';
@Injectable()
export class FtBiometricsService extends BaseService<FtBiometricsEntity> {
    constructor(
        @InjectRepository(FtBiometricsEntity, appConstant.READ_REPLICA.toLowerCase())
            private readonly readReplicaBiometricsRepository: Repository<FtBiometricsEntity>,
        @InjectRepository(FtBiometricsEntity, appConstant.MAIN.toLowerCase())
            private readonly writeReplicaBiometricsRepository: Repository<FtBiometricsEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
        super(readReplicaBiometricsRepository,writeReplicaBiometricsRepository,'ftBiometrics',commonArrayService);
    }
    async paginateList(condition: any, paginationParam: PaginateWithFoodInput) {
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
                : 'food.id';
        const queryResult = await this.readReplicaBiometricsRepository.createQueryBuilder('food')
        .leftJoinAndMapOne(
            'food.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = food.user_id`,
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
        return await this.readReplicaBiometricsRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null,fields: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaBiometricsRepository.createQueryBuilder('food')
            .where(condition)
            .select(fields)
            .orderBy(`food.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getRawMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaBiometricsRepository.create(data);
        return await this.writeReplicaBiometricsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaBiometricsRepository.metadata);
        return await this.writeReplicaBiometricsRepository.createQueryBuilder('food')
            .update(FtBiometricsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaBiometricsRepository.delete(condition);
    }
}