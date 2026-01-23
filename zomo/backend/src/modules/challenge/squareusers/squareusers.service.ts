import { appConstant, CommonFileService, SquareUsersEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class SquareUsersService {
    constructor(
        @InjectRepository(SquareUsersEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaSquareUsersRepository: Repository<SquareUsersEntity>,
        @InjectRepository(SquareUsersEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaSquareUsersRepository: Repository<SquareUsersEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaSquareUsersRepository.create(data);
        return await this.writeReplicaSquareUsersRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaSquareUsersRepository.metadata);
        return await this.writeReplicaSquareUsersRepository.createQueryBuilder('su')
            .update(SquareUsersEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaSquareUsersRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaSquareUsersRepository.createQueryBuilder('squareuser')
       .leftJoinAndMapOne(
            'squareuser.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = squareuser.user_id AND user.status = 1`,
        )
        .where(condition)
        .select(['squareuser','user.id','user.first_name','user.last_name','user.username','user.profile_image'])
        .orderBy(`squareuser.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getOne()
    }
    async GetVerificationRequest(condition: any) {
        let query = this.readReplicaSquareUsersRepository.createQueryBuilder('squareuser')
        .leftJoinAndMapOne(
            'squareuser.sc',
            tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,
            'sc',
            `sc.id = squareuser.schedule_id AND sc.status = 1`,
        )
        .leftJoinAndMapOne(
            'squareuser.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = squareuser.user_id AND user.status = 1`,
        )
        .leftJoinAndMapOne(
            'squareuser.square',
            tableConstant.CHALLENGE.TBL_CH_SQUARES,
            'square',
            `square.id = squareuser.square_id AND square.status = 1`,
        )
        .leftJoinAndMapOne(
            'squareuser.verified_user',
            tableConstant.TBL_USERS,
            'verified_user',
            `verified_user.id = squareuser.verified_userid AND verified_user.status = 1`,
        )
        .where(condition)
        .select(['squareuser','user.id','user.first_name','user.last_name','user.profile_image','square.id','square.name','square.org_id','verified_user.id','verified_user.first_name','verified_user.last_name','verified_user.profile_image','sc.id','sc.custom_cname','sc.org_id'])
        .orderBy({
            'squareuser.verified_status' : 'ASC',
            'squareuser.created_date' : 'ASC'
        });
        return await query.getMany()
    }
    async listRecord(condition: any, orderBy: any = null, groupBy: any = null,) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
       return await this.readReplicaSquareUsersRepository.createQueryBuilder('squareuser')
       .leftJoinAndMapOne(
        'squareuser.user',
        tableConstant.TBL_USERS,
        'user',
        `user.id = squareuser.user_id AND user.status = 1`,
      )
      .leftJoinAndMapOne(
        'squareuser.verified_user',
        tableConstant.TBL_USERS,
        'verified_user',
        `verified_user.id = squareuser.verified_userid AND verified_user.status = 1`,
      )
        .where(condition)
        .select(['squareuser','user.id','user.first_name','user.last_name','user.profile_image','verified_user.id','verified_user.first_name','verified_user.last_name','verified_user.profile_image'])
        .groupBy(groupBy)
        .orderBy(`squareuser.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany()
    }
}
