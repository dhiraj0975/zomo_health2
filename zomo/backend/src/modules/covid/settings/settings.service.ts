import { appConstant, CommonArrayService, CommonFileService, CovidSettingsEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateCovidSettingsInput } from "../../../input";
@Injectable()
export class SettingsService {
    constructor(
        @InjectRepository(CovidSettingsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicasettingsRepository: Repository<CovidSettingsEntity>,
        @InjectRepository(CovidSettingsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicasettingsRepository: Repository<CovidSettingsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateCovidSettingsInput) {
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
                : 'settings.id';
        const queryResult = await this.readReplicasettingsRepository.createQueryBuilder('settings')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicasettingsRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicasettingsRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicasettingsRepository.create(data);
        return await this.writeReplicasettingsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicasettingsRepository.metadata);
        return await this.writeReplicasettingsRepository.createQueryBuilder('settings')
            .update(CovidSettingsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicasettingsRepository.delete(condition);
    }
    async surveyPopupData(fields: any, condition: any,org_id:any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicasettingsRepository.createQueryBuilder('Covidsettings')
        .leftJoinAndMapMany(
            'Covidsettings.Covidquestions',
            tableConstant.COVID.COVID_QUESTIONS,
            'Covidquestions',
            `Covidquestions.org_id = ${org_id} AND Covidquestions.status = 1`,
        )
        .leftJoinAndMapMany(
            'Covidquestions.CovidAnswer',
            tableConstant.COVID.COVID_ANSWERS,
            'CovidAnswer',
            `CovidAnswer.q_id = Covidquestions.id AND CovidAnswer.status = 1`,
        )
        .leftJoinAndMapMany(
            'Covidsettings.Covidvaccinationtyp',
            tableConstant.COVID.COVID_VACCINATION_TYPE,
            'Covidvaccinationtyp',
            `Covidvaccinationtyp.status = 1 AND (Covidvaccinationtyp.org_id = 0 OR Covidvaccinationtyp.org_id = ${org_id})`
        )
        .where(condition)
        .select(fields)
        .getOne();
    }
    async covidPopupData(org_id:any,user_id:any,fields: any){
        return await this.readReplicasettingsRepository.createQueryBuilder('Covidsettings')
        .leftJoinAndMapMany(
            'Covidsettings.Coviduseranswers',
            tableConstant.COVID.COVID_USER_ANSWERS,
            'Coviduseranswers',
            `Coviduseranswers.org_id = ${org_id} AND Coviduseranswers.user_id=${user_id} AND Coviduseranswers.status = 1`,
        )
        .where(`Covidsettings.org_id = ${org_id}`)
        .select(fields)
        .getOne();
    }
    async covidUserAnswerData(org_id:any,user_id:any,fields: any = ['Covidsettings','Coviduseranswers','Covidquestions','CovidAnswer.title','CovidAnswer.id','CovidAnswer.q_id']){
        return await this.readReplicasettingsRepository.createQueryBuilder('Covidsettings')
        .leftJoinAndMapMany(
            'Covidsettings.Coviduseranswers',
            tableConstant.COVID.COVID_USER_ANSWERS,
            'Coviduseranswers',
            `Coviduseranswers.org_id = ${org_id} AND Coviduseranswers.user_id=${user_id} AND Coviduseranswers.status = 1`,
        )
        .leftJoinAndMapMany(
            'Covidsettings.Covidquestions',
            tableConstant.COVID.COVID_QUESTIONS,
            'Covidquestions',
            `Covidquestions.org_id = ${org_id} AND Covidquestions.status = 1`,
        )
        .leftJoinAndMapOne(
            'Covidquestions.CovidAnswer',
            tableConstant.COVID.COVID_ANSWERS,
            'CovidAnswer',
            `CovidAnswer.q_id = Covidquestions.id AND CovidAnswer.status = 1`,
        )
        .where(`Covidsettings.org_id = ${org_id}`)
        .select(fields)
        .orderBy('CovidAnswer.id','ASC')
        .addOrderBy('Coviduseranswers.id','DESC')
        .getOne();
    }
}