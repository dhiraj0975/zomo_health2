import { appConstant, CommonArrayService, CommonFileService, EmotionalWellBeingCategoryEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithEmotionalWellBeingInput } from "../../../input";
@Injectable()
export class WellBeingCategoryService {
    constructor(
        @InjectRepository(EmotionalWellBeingCategoryEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaWellbeingCategoryRepository: Repository<EmotionalWellBeingCategoryEntity>,
        @InjectRepository(EmotionalWellBeingCategoryEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaWellbeingCategoryRepository: Repository<EmotionalWellBeingCategoryEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateWithEmotionalWellBeingInput) {
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
                : 'wellbeing.id';
        const queryResult = await this.readReplicaWellbeingCategoryRepository.createQueryBuilder('wellbeing')
        .leftJoinAndMapMany(
            'wellbeing.category',
            tableConstant.EMOTIONAL_WELLBEING.TBL_EM_CATEGORY,
            'category',
            `category.id = wellbeing.parent_id`,
        )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any,orderBy: any ='wbc.id',order: any = 'DESC', tableData = '') {
        let query = this.readReplicaWellbeingCategoryRepository.createQueryBuilder('wbc')
        if (tableData == tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST) {
            query = query.leftJoinAndMapOne(
                'wbc.post',
                tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST,
                'post',
                `post.cat_id = wbc.id AND post.org_id = wbc.org_id AND post.status = 1`,
            )
        }
        return await query.where(condition)
            .orderBy(orderBy, order)
            .getOne();
    }
    async listRecord(condition: any,orderBy: any = 'wbc.id',order: any = 'DESC', tableData = '') {
        let query = this.readReplicaWellbeingCategoryRepository.createQueryBuilder('wbc')
        if (tableData == tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST) {
            query = query.leftJoinAndMapMany(
                'wbc.post',
                tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST,
                'post',
                `wbc.id = post.cat_id AND wbc.org_id = post.org_id AND post.status = 1`,
            )
        }
        return await query.where(condition)
            .orderBy(orderBy, order)
            .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaWellbeingCategoryRepository.create(data);
        return await this.writeReplicaWellbeingCategoryRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaWellbeingCategoryRepository.metadata);
        return await this.writeReplicaWellbeingCategoryRepository.createQueryBuilder('wellbeing')
            .update(EmotionalWellBeingCategoryEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaWellbeingCategoryRepository.delete(condition);
    }
    async saveNew(data, parentId = null) {
        try{
            let insertLft, insertRgt;
            if (!parentId) {
                const rows = await this.readReplicaWellbeingCategoryRepository.createQueryBuilder('ep')
                .select(['MAX(rght) as max_rgt'])
                .where({})
                .getRawMany();
                const maxRgt = rows[0].max_rgt || 0;
                insertLft = maxRgt + 1;
                insertRgt = insertLft + 1;
            } else {
                const parent = await this.readReplicaWellbeingCategoryRepository.createQueryBuilder('ep')
                .select(['lft','rght'])
                .where(`ep.id = :parentId`, { parentId })
                .getRawMany();
                if (!parent.length) {
                throw new Error('Parent not found');
                }
                const parentLft = parent[0].lft;
                const parentRgt = parent[0].rght;
                const childRows = await this.readReplicaWellbeingCategoryRepository.createQueryBuilder('ep')
                .select(['MAX(rght) as max_rgt'])
                .where(`ep.parent_id = :parentId`, { parentId })
                .getRawMany();
                const lastChildRgt = childRows[0].max_rgt;
                if (!lastChildRgt) {
                insertLft = parentLft + 1;
                } else {
                insertLft = lastChildRgt + 1;
                }
                insertRgt = insertLft + 1;
                await this.writeReplicaWellbeingCategoryRepository
                .createQueryBuilder('wellbeing')
                .update(EmotionalWellBeingCategoryEntity)
                .set({
                    rght: () => 'rght + 2'  
                })
                .where('rght >= :insertLft', { insertLft })
                .execute();
                await this.writeReplicaWellbeingCategoryRepository
                .createQueryBuilder('wellbeing')
                .update(EmotionalWellBeingCategoryEntity)
                .set({
                    lft: () => 'lft + 2'  
                })
                .where('lft >= :insertLft', { insertLft })
                .execute();
            }
            const savedResult = this.writeReplicaWellbeingCategoryRepository.create({...data, parent_id: parentId, lft: insertLft, rght: insertRgt});
            const result = await this.writeReplicaWellbeingCategoryRepository.save(savedResult);
            return result;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async updateNew(postData, newParentId) {
        try{
            const rows = await this.readReplicaWellbeingCategoryRepository.createQueryBuilder('ep')
            .select(['lft','rght'])
            .where({id: postData.id})
            .getRawMany();
            if (rows.length === 0) throw new Error('Category not found');
            const node = rows[0];
            const width = node.rght - node.lft + 1;
            await this.writeReplicaWellbeingCategoryRepository
                .createQueryBuilder('wellbeing')
                .update(EmotionalWellBeingCategoryEntity)
                .set({
                    lft: () => '-lft',
                    rght: () => '-rght'
                })
                .where('lft >= :lft AND rght <= :rght', { lft: node.lft, rght: node.rght })
                .execute();
            await this.writeReplicaWellbeingCategoryRepository
                .createQueryBuilder('wellbeing')
                .update(EmotionalWellBeingCategoryEntity)
                .set({
                    lft: () => `lft - ${width}`
                })
                .where('lft > :rght', { rght: node.rght })
                .execute();
            await this.writeReplicaWellbeingCategoryRepository
                .createQueryBuilder('wellbeing')
                .update(EmotionalWellBeingCategoryEntity)
                .set({
                    rght: () => `rght - ${width}`
                })
                .where('rght > :rght', { rght: node.rght })
                .execute();
            let newParentLft;
            if (newParentId === null) {
            const maxRgt = await this.readReplicaWellbeingCategoryRepository.createQueryBuilder('ep')
            .select(['MAX(rght) as max_rgt'])
            .where({})
            .getRawMany();
            newParentLft = (maxRgt[0].max_rgt || 0) + 1;
            } 
            else {
            const newParent = await this.readReplicaWellbeingCategoryRepository.createQueryBuilder('ep')
            .select(['lft'])
            .where({id: newParentId})
            .getRawMany();
            if (!newParent.length) throw new Error('New parent not found');
            newParentLft = newParent[0].lft + 1;
            }
            await this.writeReplicaWellbeingCategoryRepository
                .createQueryBuilder('wellbeing')
                .update(EmotionalWellBeingCategoryEntity)
                .set({
                    rght: () => `rght + ${width}`
                })
                .where('rght >= :newParentLft', { newParentLft })
                .execute();
            await this.writeReplicaWellbeingCategoryRepository
                .createQueryBuilder('wellbeing')
                .update(EmotionalWellBeingCategoryEntity)
                .set({
                    lft: () => `lft + ${width}`
                })
                .where('lft >= :newParentLft', { newParentLft })
                .execute();
            const shift = newParentLft - node.lft;
            await this.writeReplicaWellbeingCategoryRepository
                .createQueryBuilder('wellbeing')
                .update(EmotionalWellBeingCategoryEntity)
                .set({
                    lft: () => `-lft + ${shift}`,
                    rght: () => `-rght + ${shift}`
                })
                .where('lft < 0 AND rght < 0')
                .execute();
            await this.writeReplicaWellbeingCategoryRepository
                .createQueryBuilder('wellbeing')
                .update(EmotionalWellBeingCategoryEntity)
                .set({
                    ...postData,
                    parent_id: newParentId
                })
                .where('id = :id', { id: postData.id })
                .execute();
        }catch (error) {
            throw new Error(error.message); 
        }
    }
}