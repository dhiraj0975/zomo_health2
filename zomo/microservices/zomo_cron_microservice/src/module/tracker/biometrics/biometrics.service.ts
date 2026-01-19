import {
    appConstant,
    BaseService,
    CommonArrayService,
    FtBiometricsEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class FtBiometricsService extends BaseService<FtBiometricsEntity> {
    constructor(
        @InjectRepository(
            FtBiometricsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaBiometricsRepository: Repository<FtBiometricsEntity>,
        @InjectRepository(FtBiometricsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaBiometricsRepository: Repository<FtBiometricsEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaBiometricsRepository,
            writeReplicaBiometricsRepository,
            'ftBiometrics',
            commonArrayService,
        );
    }
    async listRecord(condition: any, orderBy: any = null,fields: any[] = ['food']) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaBiometricsRepository.createQueryBuilder('food')
            .leftJoinAndMapOne(
                'food.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = food.user_id`,
            )
            .where(condition)
            .select(fields)
            .orderBy(`food.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getRawMany();
    }
}
