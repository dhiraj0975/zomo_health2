import {
    appConstant,
    CommonService,
    MediaFitnessVideosEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class FitnessVideosService {
    constructor(
        @InjectRepository(
            MediaFitnessVideosEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaFitnessVideosRepository: Repository<MediaFitnessVideosEntity>,
        @InjectRepository(
            MediaFitnessVideosEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaFitnessVideosRepository: Repository<MediaFitnessVideosEntity>,
        private readonly commonService: CommonService,
    ) {}
    async findOne(condition: any) {
        return await this.readReplicaFitnessVideosRepository.findOne({
            where: condition,
        });
    }
    async listRecord(
        condition: any,
        field: any[] = [],
        tableData: any[] = [],
        orderBy: string = 'fitness.id',
        order = 'DESC',
    ) {
        try {
            let queryResult: any =
                this.readReplicaFitnessVideosRepository.createQueryBuilder(
                    'fitness',
                );
            if (
                tableData.includes(
                    tableConstant.REPORT.TBL_ME_FOD_VIDEO_CATEGORIES,
                )
            ) {
                queryResult = queryResult
                    .leftJoinAndMapMany(
                        'fitness.fvc',
                        tableConstant.REPORT.TBL_ME_FOD_VIDEO_CATEGORIES,
                        'fvc',
                        `fitness.id = fvc.v_id AND fvc.status NOT IN(0,2)`,
                    )
                    .leftJoinAndMapMany(
                        'fvc.fc',
                        tableConstant.REPORT.TBL_ME_FOD_CATEGORY,
                        'fc',
                        `fvc.c_id = fc.id AND fc.status NOT IN(0,2)`,
                    );
            }
            if (
                tableData.includes(tableConstant.REPORT.TBL_ME_FOD_VIDEO_FOCUS)
            ) {
                queryResult = queryResult
                    .leftJoinAndMapMany(
                        'fitness.fvf',
                        tableConstant.REPORT.TBL_ME_FOD_VIDEO_FOCUS,
                        'fvf',
                        `fitness.id = fvf.v_id AND fvf.status NOT IN(0,2)`,
                    )
                    .leftJoinAndMapMany(
                        'fvf.ff',
                        tableConstant.REPORT.TBL_ME_FOD_FOCUS,
                        'ff',
                        `fvf.f_id = ff.id AND fvf.status NOT IN(0,2)`,
                    );
            }
            if (
                tableData.includes(
                    tableConstant.REPORT.TBL_ME_FOD_VIDEO_EQUIPMENT,
                )
            ) {
                queryResult = queryResult
                    .leftJoinAndMapMany(
                        'fitness.fve',
                        tableConstant.REPORT.TBL_ME_FOD_VIDEO_EQUIPMENT,
                        'fve',
                        `fitness.id = fve.v_id AND fve.status NOT IN(0,2)`,
                    )
                    .leftJoinAndMapMany(
                        'fve.fe',
                        tableConstant.REPORT.TBL_ME_FOD_EQUIPMENT,
                        'fe',
                        `fve.e_id = fe.id AND fe.status NOT IN(0,2)`,
                    );
            }
            if (
                tableData.includes(tableConstant.REPORT.TBL_ME_FOD_VIDEO_SERIES)
            ) {
                queryResult = queryResult
                    .leftJoinAndMapMany(
                        'fitness.fvs',
                        tableConstant.REPORT.TBL_ME_FOD_VIDEO_SERIES,
                        'fvs',
                        `fitness.id = fvs.v_id AND fvs.status NOT IN(0,2)`,
                    )
                    .leftJoinAndMapMany(
                        'fvs.fs',
                        tableConstant.REPORT.TBL_ME_FOD_SERIES,
                        'fs',
                        `fvs.s_id = fs.id AND fs.status NOT IN(0,2)`,
                    );
            }
            if (
                tableData.includes(tableConstant.REPORT.TBL_ME_FOD_DIFFICULTY)
            ) {
                queryResult = queryResult.leftJoinAndMapOne(
                    'fitness.fd',
                    tableConstant.REPORT.TBL_ME_FOD_DIFFICULTY,
                    'fd',
                    `fitness.difficulty_id = fd.id AND fd.status NOT IN(0,2)`,
                );
            }
            if (
                tableData.includes(
                    tableConstant.REPORT.TBL_ME_FOD_DURATION_RANGE,
                )
            ) {
                queryResult = queryResult.leftJoinAndMapOne(
                    'fitness.duration_range',
                    tableConstant.REPORT.TBL_ME_FOD_DURATION_RANGE,
                    'duration_range',
                    `fitness.duration_id = duration_range.id AND duration_range.status NOT IN(0,2)`,
                );
            }
            if (
                tableData.includes(
                    tableConstant.REPORT.TBL_ME_FOD_VIDEO_INSTRUCTORS,
                )
            ) {
                queryResult = queryResult
                    .leftJoinAndMapMany(
                        'fitness.fvi',
                        tableConstant.REPORT.TBL_ME_FOD_VIDEO_INSTRUCTORS,
                        'fvi',
                        `fitness.id = fvi.v_id AND fvi.status NOT IN(0,2)`,
                    )
                    .leftJoinAndMapOne(
                        'fvi.fi',
                        tableConstant.REPORT.TBL_ME_FOD_INSTRUCTOR,
                        'fi',
                        `fvi.i_id = fi.id AND fi.status NOT IN(0,2)`,
                    );
            }
            queryResult = queryResult.select(field);
            queryResult = queryResult
                .where(condition)
                .orderBy(orderBy, <any>order);
            queryResult = queryResult.getMany();
            return queryResult;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}
