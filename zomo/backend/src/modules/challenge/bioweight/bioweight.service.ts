import {
    appConstant,
    BaseService,
    BioWeightEntity,
    CommonArrayService,
    CommonFileService,
    tableConstant
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class BioWeightService extends BaseService<BioWeightEntity> {
    constructor(
        @InjectRepository(BioWeightEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaBioWeightRepository: Repository<BioWeightEntity>,
        @InjectRepository(BioWeightEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaBioWeightRepository: Repository<BioWeightEntity>,
        private readonly commonFileService: CommonFileService,
        commonArrayService: CommonArrayService,
    ) {
        super(readReplicaBioWeightRepository, writeReplicaBioWeightRepository, 'assessmentResults', commonArrayService);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaBioWeightRepository.create(data);
        return await this.writeReplicaBioWeightRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaBioWeightRepository.metadata);
        return await this.writeReplicaBioWeightRepository.createQueryBuilder('weight')
            .update(BioWeightEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaBioWeightRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaBioWeightRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null, fields: any = ['weight'], groupBy : any = null, joinTable: any = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = this.readReplicaBioWeightRepository.createQueryBuilder('weight');
        if(joinTable && joinTable.length > 0){
            joinTable.forEach((table: any) => {
                if(table == 'user'){
                    query = query.leftJoinAndMapOne(
                        'weight.user',
                        tableConstant.TBL_USERS,
                        'user',
                        `user.id = weight.user_id AND user.status = 1`,
                    );
                };

                if(table == 'userinner'){
                    query = query.innerJoinAndMapOne(
                        'weight.user',
                        tableConstant.TBL_USERS,
                        'user',
                        `user.id = weight.user_id AND user.status = 1`,
                    );
                };
            });
        }
        query = query.where(condition)
        .select(fields)
        if(Object.keys(orderBy).length != 1){
            query = query.orderBy(orderBy);
        }
        else{
            query = query.orderBy(`weight.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        }
        if(groupBy){
            query = query.groupBy(groupBy);
        }
        return await query.getMany();
    }
}
