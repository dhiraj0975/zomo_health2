import {
    appConstant,
    AssessmentHraBiometricEntity,
    BaseService,
    CommonArrayService,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class AssessmentHraBiometricService extends BaseService<AssessmentHraBiometricEntity> {
    constructor(
        @InjectRepository(
            AssessmentHraBiometricEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaAssessmentHraBiometricsRepository: Repository<AssessmentHraBiometricEntity>,
        @InjectRepository(
            AssessmentHraBiometricEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaAssessmentHraBiometricsRepository: Repository<AssessmentHraBiometricEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaAssessmentHraBiometricsRepository,
            writeReplicaAssessmentHraBiometricsRepository,
            'hraBiometric',
            commonArrayService,
        );
    }
    async listRecord(condition: any, orderBy: any = null, select: any[] =[],tableData: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = this.readReplicaAssessmentHraBiometricsRepository.createQueryBuilder('healthassessment')
            if (tableData.includes(tableConstant.TBL_USERS)) {
                queryResult = queryResult.leftJoinAndMapOne(
                    'healthassessment.user',
                    tableConstant.TBL_USERS,
                    'user',
                    `user.id = healthassessment.user_id AND user.status = 1`,
                )
            }
        queryResult = await queryResult.where(condition)
        .select(select)
        .orderBy(`healthassessment.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getRawMany();
        return queryResult;
    }
}
