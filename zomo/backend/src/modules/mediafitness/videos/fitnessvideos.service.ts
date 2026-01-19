import { appConstant, CommonArrayService, CommonFileService, MediaFitnessVideosEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginationWithMediaFitnessInput } from '../input';
@Injectable()
export class FitnessVideosService {
    constructor(
        @InjectRepository(MediaFitnessVideosEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFitnessVideosRepository: Repository<MediaFitnessVideosEntity>,
        @InjectRepository(MediaFitnessVideosEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFitnessVideosRepository: Repository<MediaFitnessVideosEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(field: any[] = [],condition: any, paginationParam: PaginationWithMediaFitnessInput) {
        try{
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
                    : 'fitness.id';
            const sortFields = [
                { field1: "fitness.rating_avg_category", field2: "fitness.rating_count_category" },
                { field1: "fitness.rating_avg_series", field2: "fitness.rating_count_series" }
            ];
            if(paginationParam.sort_by == 3){
                paginationParam['saved_videos'] = true;
            }
            let queryResult: any = this.readReplicaFitnessVideosRepository.createQueryBuilder('fitness')
            if (paginationParam && !paginationParam['role'] ) {
                if (paginationParam && paginationParam.saved_videos && paginationParam.is_valid) {
                    queryResult = queryResult
                        .innerJoinAndMapOne(
                            'fitness.settings',
                            tableConstant.TBL_USERS_SETTINGS,
                            'settings',
                            `settings.user_id = ${paginationParam.user_id} AND settings.fitnessvideofavoriteslist != "" AND settings.fitnessvideofavoriteslist LIKE CONCAT('%"', fitness.id, '":"', fitness.id, '"%')`,
                        )
                        .leftJoinAndMapOne(
                            'fitness.fvStatus',
                            tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_STATUS,
                            'fvStatus',
                            `fvStatus.v_id = fitness.id AND fvStatus.org_id = ${paginationParam.org_id}`,
                        )
                    if (paginationParam.categories) {
                        queryResult = queryResult.innerJoinAndMapOne(
                            'fitness.fvc',
                            tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_CATEGORIES,
                            'fvc',
                            `fitness.id = fvc.v_id AND fvc.status NOT IN(0,2)`,
                        )
                        .addSelect(`CASE WHEN fvc.c_id IN(${paginationParam.categories}) THEN 1 ELSE 0 END`, `categories`)
                        .addOrderBy(`categories`, "DESC")
                    }
                    if (paginationParam.focus) {
                        queryResult = queryResult
                            .leftJoinAndMapOne(
                                'fitness.fvf',
                                tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_FOCUS,
                                'fvf',
                                `fitness.id = fvf.v_id AND fvf.status NOT IN(0,2)`,
                            )
                            .addSelect(`CASE WHEN fvf.f_id IN(${paginationParam.focus}) THEN 1 ELSE 0 END`, `focus`)
                            .addOrderBy(`focus`, "DESC")
                    }
                    if (paginationParam.equipment) {
                        queryResult = queryResult
                            .leftJoinAndMapOne(
                                'fitness.fve',
                                tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_EQUIPMENT,
                                'fve',
                                `fitness.id = fve.v_id AND fve.status NOT IN(0,2)`,
                            )
                            .addSelect(`CASE WHEN fve.e_id IN(${paginationParam.equipment}) THEN 1 ELSE 0 END`, `equipment`)
                            .addOrderBy(`equipment`, "DESC")
                    }
                    if (paginationParam.series) {
                        queryResult = queryResult
                            .leftJoinAndMapOne(
                                'fitness.fvs',
                                tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_SERIES,
                                'fvs',
                                `fitness.id = fvs.v_id AND fvs.status NOT IN(0,2)`,
                            )
                            .addSelect(`CASE WHEN fvs.s_id IN(${paginationParam.series}) THEN 1 ELSE 0 END`, `series`)
                            .addOrderBy(`series`, "DESC")
                    }
                    queryResult = queryResult
                        .select(field)
                        .where(condition)
                        .orderBy("fitness.rating_avg", "DESC")
                        .addOrderBy("fitness.rating_count", "DESC")
                    queryResult = await queryResult.take(paginateObj.take)
                        .skip(paginateObj.skip)
                        .getManyAndCount();
                } else {
                    queryResult = queryResult
                        .leftJoinAndMapOne(
                            'fitness.settings',
                            tableConstant.TBL_USERS_SETTINGS,
                            'settings',
                            `settings.user_id = ${paginationParam.user_id} AND settings.fitnessvideofavoriteslist != ""`,
                        )
                        .leftJoinAndMapOne(
                            'fitness.fvStatus',
                            tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_STATUS,
                            'fvStatus',
                            `fvStatus.v_id = fitness.id AND fvStatus.org_id = ${paginationParam.org_id}`,
                        )
                    if (paginationParam.categories) {
                            queryResult = queryResult
                                .leftJoinAndMapOne(
                                    'fitness.fvc',
                                    tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_CATEGORIES,
                                    'fvc',
                                    `fitness.id = fvc.v_id AND fvc.status NOT IN(0,2)`,
                                )
                                .addSelect(`CASE WHEN fvc.c_id IN(${paginationParam.categories}) THEN 1 ELSE 0 END`, `categories`)
                                .addOrderBy(`categories`, "DESC")
                    }
                    if (paginationParam.focus) {
                        queryResult = queryResult
                            .leftJoinAndMapOne(
                                'fitness.fvf',
                                tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_FOCUS,
                                'fvf',
                                `fitness.id = fvf.v_id AND fvf.status NOT IN(0,2)`,
                            )
                            .addSelect(`CASE WHEN fvf.f_id IN(${paginationParam.focus}) THEN 1 ELSE 0 END`, `focus`)
                            .addOrderBy(`focus`, "DESC")
                    }
                    if (paginationParam.equipment) {
                        queryResult = queryResult
                            .leftJoinAndMapOne(
                                'fitness.fve',
                                tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_EQUIPMENT,
                                'fve',
                                `fitness.id = fve.v_id AND fve.status NOT IN(0,2)`,
                            )
                            .addSelect(`CASE WHEN fve.e_id IN(${paginationParam.equipment}) THEN 1 ELSE 0 END`, `equipment`)
                            .addOrderBy(`equipment`, "DESC")
                    }
                    if (paginationParam.series) {
                        queryResult = queryResult
                            .leftJoinAndMapOne(
                                'fitness.fvs',
                                tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_SERIES,
                                'fvs',
                                `fitness.id = fvs.v_id AND fvs.status NOT IN(0,2)`,
                            )
                            .addSelect(`CASE WHEN fvs.s_id IN(${paginationParam.series}) THEN 1 ELSE 0 END`, `series`)
                            .addOrderBy(`series`, "DESC")
                    }
                    queryResult = queryResult
                        .select(field)
                        .addSelect(`CASE WHEN settings.fitnessvideofavoriteslist LIKE CONCAT('%"', fitness.id, '":"', fitness.id, '"%') THEN 1 ELSE 0 END`, 'fav_order_by')
                        .where(condition)
                        .groupBy('fitness.id,  settings.id')
                        .orderBy("fav_order_by", "DESC")
                    if (['1','2'].includes(String(paginationParam.sort_by)) && sortFields[paginationParam.sort_by-1]) {
                        let fields = sortFields[paginationParam.sort_by-1];
                        queryResult = queryResult.addOrderBy(fields.field1, 'DESC').addOrderBy(fields.field2, 'DESC').addOrderBy("fitness.id", "DESC");
                    } else {
                        queryResult = queryResult.addOrderBy("fitness.rating_avg", "DESC").addOrderBy("fitness.rating_count", "DESC")
                    }
                    queryResult = await queryResult.take(paginateObj.take)
                        .skip(paginateObj.skip)
                        .getManyAndCount();
                }
            } else {
                queryResult = await queryResult
                    .leftJoinAndMapOne(
                        'fitness.fvStatus',
                        tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_STATUS,
                        'fvStatus',
                        `fvStatus.v_id = fitness.id AND fvStatus.org_id = ${paginationParam.org_id}`,
                    )
                    .select(field)
                    .where(condition)
                    .orderBy(orderBy, <any>order)
                    .take(paginateObj.take)
                    .skip(paginateObj.skip)
                    .getManyAndCount();
            }
            const [result, total] = queryResult;
            return this.commonArrayService.paginationResponse(result, total, paginateObj);
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async findOne(condition: any) {
        return await this.readReplicaFitnessVideosRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any,field: any[] = [], tableData: any[] = [], orderBy: string = 'fitness.id',order = 'DESC') {
        let queryResult: any = this.readReplicaFitnessVideosRepository.createQueryBuilder('fitness')
        if (tableData.includes(tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_CATEGORIES)) {
            queryResult = queryResult.leftJoinAndMapMany(
                    'fitness.fvc',
                    tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_CATEGORIES,
                    'fvc',
                    `fitness.id = fvc.v_id AND fvc.status NOT IN(0,2)`,
                )
                .leftJoinAndMapMany(
                    'fvc.fc',
                    tableConstant.MEDIA_FITNESS.TBL_ME_FOD_CATEGORY,
                    'fc',
                    `fvc.c_id = fc.id AND fc.status NOT IN(0,2)`,
                )
        }
        if (tableData.includes(tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_FOCUS)) {
            queryResult = queryResult.leftJoinAndMapMany(
                'fitness.fvf',
                tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_FOCUS,
                'fvf',
                `fitness.id = fvf.v_id AND fvf.status NOT IN(0,2)`,
            )
            .leftJoinAndMapMany(
                'fvf.ff',
                tableConstant.MEDIA_FITNESS.TBL_ME_FOD_FOCUS,
                'ff',
                `fvf.f_id = ff.id AND fvf.status NOT IN(0,2)`,
            )
        }
        if (tableData.includes(tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_EQUIPMENT)) {
            queryResult = queryResult.leftJoinAndMapMany(
                'fitness.fve',
                tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_EQUIPMENT,
                'fve',
                `fitness.id = fve.v_id AND fve.status NOT IN(0,2)`,
            )
            .leftJoinAndMapMany(
                'fve.fe',
                tableConstant.MEDIA_FITNESS.TBL_ME_FOD_EQUIPMENT,
                'fe',
                `fve.e_id = fe.id AND fe.status NOT IN(0,2)`,
            )
        }
        if (tableData.includes(tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_SERIES)) {
            queryResult = queryResult.leftJoinAndMapMany(
                'fitness.fvs',
                tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_SERIES,
                'fvs',
                `fitness.id = fvs.v_id AND fvs.status NOT IN(0,2)`,
            )
            .leftJoinAndMapMany(
                'fvs.fs',
                tableConstant.MEDIA_FITNESS.TBL_ME_FOD_SERIES,
                'fs',
                `fvs.s_id = fs.id AND fs.status NOT IN(0,2)`,
            )
        }
        if (tableData.includes(tableConstant.MEDIA_FITNESS.TBL_ME_FOD_DIFFICULTY)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'fitness.fd',
                tableConstant.MEDIA_FITNESS.TBL_ME_FOD_DIFFICULTY,
                'fd',
                `fitness.difficulty_id = fd.id AND fd.status NOT IN(0,2)`,
            )
        }
        if (tableData.includes(tableConstant.MEDIA_FITNESS.TBL_ME_FOD_DURATION_RANGE)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'fitness.duration_range',
                tableConstant.MEDIA_FITNESS.TBL_ME_FOD_DURATION_RANGE,
                'duration_range',
                `fitness.duration_id = duration_range.id AND duration_range.status NOT IN(0,2)`,
            )
        }
        if (tableData.includes(tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_INSTRUCTORS)) {
            queryResult = queryResult.leftJoinAndMapMany(
                'fitness.fvi',
                tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_INSTRUCTORS,
                'fvi',
                `fitness.id = fvi.v_id AND fvi.status NOT IN(0,2)`,
            )
            .leftJoinAndMapOne(
                'fvi.fi',
                tableConstant.MEDIA_FITNESS.TBL_ME_FOD_INSTRUCTOR,
                'fi',
                `fvi.i_id = fi.id AND fi.status NOT IN(0,2)`,
            )
        }
        queryResult = queryResult.select(field)
        queryResult = queryResult
            .where(condition)
            .orderBy(orderBy, <any>order);
        queryResult = queryResult.getMany();
        return queryResult;
    }
    async save(data: any) {
        const savedResult = this.writeReplicaFitnessVideosRepository.create(data);
        return await this.writeReplicaFitnessVideosRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaFitnessVideosRepository.metadata);
        return await this.writeReplicaFitnessVideosRepository.createQueryBuilder('fitness')
            .update(MediaFitnessVideosEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaFitnessVideosRepository.delete(condition);
    }
}