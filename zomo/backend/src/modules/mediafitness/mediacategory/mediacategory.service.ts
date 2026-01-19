import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonFileService,
    MediaCategoryEntity,
    tableConstant
} from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginationWithMediaFitnessInput } from '../input';
@Injectable()
export class MediaCategoryService extends BaseService<MediaCategoryEntity> {
    constructor(
        @InjectRepository(MediaCategoryEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMediaCategoryRepository: Repository<MediaCategoryEntity>,
        @InjectRepository(MediaCategoryEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMediaCategoryRepository: Repository<MediaCategoryEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
        super(readReplicaMediaCategoryRepository, writeReplicaMediaCategoryRepository, 'mediaCategory', commonArrayService );
    }
    async paginateList(condition: any, paginationParam: PaginationWithMediaFitnessInput) {
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
                : 'media.id';
        const queryResult = await this.readReplicaMediaCategoryRepository.createQueryBuilder('media')
            .leftJoinAndMapMany(
                'media.category',
                tableConstant.MEDIA_FITNESS.TBL_ME_CATEGORY,
                'category',
                `category.id = media.parent_id`,
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
        return await this.readReplicaMediaCategoryRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any,orderBy: any = 'fc.id',order: any = 'DESC', tableData = '') {
        let query = this.readReplicaMediaCategoryRepository.createQueryBuilder('fc')
        if (tableData == tableConstant.MEDIA_FITNESS.TBL_ME_POST) {
            query = query.leftJoinAndMapMany(
                'fc.post',
                tableConstant.MEDIA_FITNESS.TBL_ME_POST,
                'post',
                `fc.id = post.cat_id AND fc.org_id = post.org_id AND post.status = 1`,
            )
        }
        return await query.where(condition)
            .orderBy(orderBy, order)
            .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaMediaCategoryRepository.create(data);
        return await this.writeReplicaMediaCategoryRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaMediaCategoryRepository.metadata);
        return await this.writeReplicaMediaCategoryRepository.createQueryBuilder('media')
            .update(MediaCategoryEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaMediaCategoryRepository.delete(condition);
    }
    async saveNew(data, parentId = null) {
        try{
                let insertLft, insertRgt;
                if (!parentId) {
                    const rows = await this.readReplicaMediaCategoryRepository.createQueryBuilder('ep')
                    .select(['MAX(rght) as max_rgt'])
                    .where({})
                    .getRawMany();
                    const maxRgt = rows[0].max_rgt || 0;
                    insertLft = maxRgt + 1;
                    insertRgt = insertLft + 1;
                } else {
                    const parent = await this.readReplicaMediaCategoryRepository.createQueryBuilder('ep')
                    .select(['lft','rght'])
                    .where(`ep.id = :parentId`, { parentId })
                    .getRawMany();
                    if (!parent.length) {
                    throw new Error('Parent not found');
                    }
                    const parentLft = parent[0].lft;
                    const parentRgt = parent[0].rght;
                    const childRows = await this.readReplicaMediaCategoryRepository.createQueryBuilder('ep')
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
                    await this.writeReplicaMediaCategoryRepository
                    .createQueryBuilder('wellbeing')
                    .update(MediaCategoryEntity)
                    .set({
                        rght: () => 'rght + 2'  
                    })
                    .where('rght >= :insertLft', { insertLft })
                    .execute();
                    await this.writeReplicaMediaCategoryRepository
                    .createQueryBuilder('wellbeing')
                    .update(MediaCategoryEntity)
                    .set({
                        lft: () => 'lft + 2'  
                    })
                    .where('lft >= :insertLft', { insertLft })
                    .execute();
                }
                const savedResult = this.writeReplicaMediaCategoryRepository.create({...data, parent_id: parentId, lft: insertLft, rght: insertRgt});
                const result = await this.writeReplicaMediaCategoryRepository.save(savedResult);
                return result;
        }catch (error) {
            throw new Error(error.message); 
        }
        }
        async updateNew(postData, newParentId) {
            try{
            const rows = await this.readReplicaMediaCategoryRepository.createQueryBuilder('ep')
                .select(['lft','rght'])
                .where({id: postData.id})
                .getRawMany();
                if (rows.length === 0) throw new Error('Category not found');
                const node = rows[0];
                const width = node.rght - node.lft + 1;
                await this.writeReplicaMediaCategoryRepository
                    .createQueryBuilder('wellbeing')
                    .update(MediaCategoryEntity)
                    .set({
                        lft: () => '-lft',
                        rght: () => '-rght'
                    })
                    .where('lft >= :lft AND rght <= :rght', { lft: node.lft, rght: node.rght })
                    .execute();
                await this.writeReplicaMediaCategoryRepository
                    .createQueryBuilder('wellbeing')
                    .update(MediaCategoryEntity)
                    .set({
                        lft: () => `lft - ${width}`
                    })
                    .where('lft > :rght', { rght: node.rght })
                    .execute();
                await this.writeReplicaMediaCategoryRepository
                    .createQueryBuilder('wellbeing')
                    .update(MediaCategoryEntity)
                    .set({
                        rght: () => `rght - ${width}`
                    })
                    .where('rght > :rght', { rght: node.rght })
                    .execute();
                let newParentLft;
                if (newParentId === null) {
                const maxRgt = await this.readReplicaMediaCategoryRepository.createQueryBuilder('ep')
                .select(['MAX(rght) as max_rgt'])
                .where({})
                .getRawMany();
                newParentLft = (maxRgt[0].max_rgt || 0) + 1;
                } 
                else {
                const newParent = await this.readReplicaMediaCategoryRepository.createQueryBuilder('ep')
                .select(['lft'])
                .where({id: newParentId})
                .getRawMany();
                if (!newParent.length) throw new Error('New parent not found');
                newParentLft = newParent[0].lft + 1;
                }
                await this.writeReplicaMediaCategoryRepository
                    .createQueryBuilder('wellbeing')
                    .update(MediaCategoryEntity)
                    .set({
                        rght: () => `rght + ${width}`
                    })
                    .where('rght >= :newParentLft', { newParentLft })
                    .execute();
                await this.writeReplicaMediaCategoryRepository
                    .createQueryBuilder('wellbeing')
                    .update(MediaCategoryEntity)
                    .set({
                        lft: () => `lft + ${width}`
                    })
                    .where('lft >= :newParentLft', { newParentLft })
                    .execute();
                const shift = newParentLft - node.lft;
                await this.writeReplicaMediaCategoryRepository
                    .createQueryBuilder('wellbeing')
                    .update(MediaCategoryEntity)
                    .set({
                        lft: () => `-lft + ${shift}`,
                        rght: () => `-rght + ${shift}`
                    })
                    .where('lft < 0 AND rght < 0')
                    .execute();
                await this.writeReplicaMediaCategoryRepository
                    .createQueryBuilder('wellbeing')
                    .update(MediaCategoryEntity)
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