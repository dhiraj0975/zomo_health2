import { appConstant, ChatEntity, CommonArrayService, CommonFileService, tableConstant, UserEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class ChatService {
    constructor(
        @InjectRepository(ChatEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaChatRepository: Repository<ChatEntity>,
        @InjectRepository(ChatEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaChatRepository: Repository<ChatEntity>,
        @InjectRepository(UserEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUserRepository: Repository<UserEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaChatRepository.create(data);
        return await this.writeReplicaChatRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaChatRepository.metadata);
        return await this.writeReplicaChatRepository.createQueryBuilder('c')
            .update(ChatEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaChatRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaChatRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(fields: any, condition: any, orderBy: any = null, limit: number = null,offset = null, joinTable: any = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = this.readReplicaChatRepository.createQueryBuilder('ch_chat')
        if(joinTable && joinTable.length > 0){
            for(let i = 0; i < joinTable.length; i++){
                if(joinTable[i].type == 'INNER'){
                    query = query.innerJoinAndMapOne(
                        `${joinTable[i].connect}.${joinTable[i].alias}`,
                        joinTable[i].table,
                        joinTable[i].alias,
                        joinTable[i].on,
                    );
                }else{
                    query = query.leftJoinAndMapOne(
                        `${joinTable[i].connect}.${joinTable[i].alias}`,
                        joinTable[i].table,
                        joinTable[i].alias,
                        joinTable[i].on,
                    );
                }
            }
        }
        else{
            query = query
            .leftJoinAndMapOne(
                'ch_chat.sender',
                tableConstant.TBL_USERS,
                'sender',
                `sender.id = ch_chat.sender_id AND sender.status = 1`,
            )
            .leftJoinAndMapOne(
                'ch_chat.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = ch_chat.user_id AND user.status = 1`,
            )
        }
        query = query
            .where(condition)
            .orderBy(`ch_chat.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        if (limit !== null) {
            query = query.take(limit);
            if (offset !== null) {
                query = query.skip(offset);
            }
        }
        query = query.select(fields);
        return await query.getMany();
    }

    async PaginateListRecord(fields: any, condition: any, paginationParam: any = null, joinTable: any = []) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        const order = paginationParam && paginationParam.order ? paginationParam.order : 'DESC';
        const orderBy = paginationParam && paginationParam.order_by ? paginationParam.order_by : 'id';
    
        let query = this.readReplicaChatRepository.createQueryBuilder('ch_chat')
        if(joinTable && joinTable.length > 0){
            for(let i = 0; i < joinTable.length; i++){
                if(joinTable[i].type == 'INNER'){
                    query = query.innerJoinAndMapOne(
                        `${joinTable[i].connect}.${joinTable[i].alias}`,
                        joinTable[i].table,
                        joinTable[i].alias,
                        joinTable[i].on,
                    );
                }else{
                    query = query.leftJoinAndMapOne(
                        `${joinTable[i].connect}.${joinTable[i].alias}`,
                        joinTable[i].table,
                        joinTable[i].alias,
                        joinTable[i].on,
                    );
                }
            }
        }
        else{
            query = query
            .leftJoinAndMapOne(
                'ch_chat.sender',
                tableConstant.TBL_USERS,
                'sender',
                `sender.id = ch_chat.sender_id AND sender.status = 1`,
            )
            .leftJoinAndMapOne(
                'ch_chat.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = ch_chat.user_id AND user.status = 1`,
            )
        }
        let queryResult = await query
            .where(condition)
            .select(fields)
            .orderBy(`ch_chat.${orderBy}`, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }

    async paginateList(condition: any, field:any = ['chat'], paginationParam: any) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        const order = paginationParam && paginationParam.order ? paginationParam.order : 'DESC';
        const orderBy = paginationParam && paginationParam.order_by ? paginationParam.order_by : 'id';
        let queryResult = await this.readReplicaChatRepository.createQueryBuilder('chat')
            .leftJoinAndMapOne(
                'chat.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = chat.sender_id AND user.status = 1`,
            )
            .where(condition)
            .select(field)
            .orderBy(`chat.${orderBy}`, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async coachListRecord(fields: any, condition: any, orderBy: any = null, groupBy: any = null, subQuery: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let chatSubQuery = await this.readReplicaChatRepository.createQueryBuilder('ch_chat')
        .where(`                                                     
            ch_chat.read_by REGEXP '^${subQuery?.user_id},' OR
            ch_chat.read_by REGEXP ',${subQuery?.user_id}$' OR
            ch_chat.read_by REGEXP ',${subQuery?.user_id},' OR
            ch_chat.read_by = ${subQuery?.user_id} 
        `)
        .select('ch_chat.id');
        if(subQuery){
            condition += ` AND ch_chat.id IN (${chatSubQuery.getQuery()})`
        }
        let query = await this.readReplicaChatRepository.createQueryBuilder('ch_chat')
        .leftJoinAndMapOne(
            'ch_chat.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = ch_chat.sender_id AND user.status = 1`,
        )
            .where(condition)
            .select(fields)
            .orderBy(`ch_chat.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        if(groupBy){
            return await query
                .groupBy(groupBy)
                .getMany(); /// may be we have to use getRawMany()
        }
        else{
            return await query.getMany();
        }
    }
    async userChat(condition: any, orderBy: any = null, fields: any, joinCond: string) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaChatRepository.createQueryBuilder('ch_chat')
        .leftJoinAndMapOne(
            'ch_chat.user',
            tableConstant.TBL_USERS,
            'user',
            joinCond,
        )
            .where(condition)
            .select(fields)
            .groupBy('user.id')
            .orderBy(`ch_chat.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
    }
    async eventChatUserList(condition: any, paginationParam: any = null, user_id, event_id) {
    const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
      const order = paginationParam && paginationParam.order ? paginationParam.order : 'DESC';
      const orderBy = paginationParam && paginationParam.order_by ? paginationParam.order_by : 'id';
      const query = await this.readReplicaUserRepository
      .createQueryBuilder('user')
      .select('user.id')
      .where(condition)
      .orderBy(`user.${orderBy}`, <any>order);

      let total = await query.clone().getCount();
      const paginatedUserIds = await query
      .skip(paginateObj.skip)
      .take(paginateObj.take)
      .getRawMany()
      let ids = paginatedUserIds.map(u => u.user_id);
    let fields = ['user.id','user.profile_image','user.first_name','user.last_name',
      'CONCAT(COALESCE(user.first_name, ""), " ", COALESCE(user.last_name, "")) AS name',
      'COALESCE(cnt.total, 0) AS total'];
    let users= await this.readReplicaUserRepository.createQueryBuilder('user')
    .leftJoin(
      qb => {
        return qb
          .select(`COUNT(CASE WHEN 
             Chats.read_by NOT REGEXP '^${user_id},' 
                AND Chats.read_by NOT REGEXP ',${user_id}$' 
                AND Chats.read_by != ${user_id} 
                AND Chats.read_by NOT REGEXP ',${user_id},'
                THEN 1 ELSE NULL END)`
            , 'total')
          .addSelect('Chats.sender_id', 'sender_id')
          .from(tableConstant.CHALLENGE.TBL_CH_CHAT, 'Chats')
          .where(`Chats.user_id = ${user_id}`)
          .andWhere(`Chats.event_id = ${event_id}`)
          .andWhere('Chats.is_private = 1')
          .groupBy('Chats.sender_id');
      },
      'cnt',
      'user.id = cnt.sender_id'
    )
      .select(fields)
      .whereInIds(ids)
      .getRawMany();
      if(users && users.length){
        users = users.map((item) => {
            const newItem = {};
            Object.entries(item).forEach(([key, value]) => {
              const newKey = key.startsWith('user_') ? key.replace('user_', '') : key;
              newItem[newKey] = value;
            });
            return newItem;
          });
      }
      return this.commonArrayService.paginationResponse(users, total, paginateObj);
  }
  async getUsersWithChatCount(condition, user_id, paginationParam: any = null,) {
    try {  
      const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
      const order = paginationParam && paginationParam.order ? paginationParam.order : 'DESC';
      const orderBy = paginationParam && paginationParam.order_by ? paginationParam.order_by : 'id';
      const query = await this.readReplicaUserRepository
      .createQueryBuilder('user')
      .select('user.id')
      .where(condition)
      .orderBy(`user.${orderBy}`, <any>order);

      let total = await query.clone().getCount();
      const paginatedUserIds = await query
      .skip(paginateObj.skip)
      .take(paginateObj.take)
      .getRawMany()
      let ids = paginatedUserIds.map(u => u.user_id);
      let users = await this.readReplicaUserRepository
        .createQueryBuilder('user')
        .leftJoin(
          (qb) => {
            return qb
              .select('COUNT(chat.id)', 'total')
              .addSelect('chat.sender_id','sender_id')
              .from(tableConstant.CHALLENGE.TBL_CH_CHAT, 'chat')
              .where('chat.is_private = 0')
              .andWhere(`chat.user_id = ${user_id}`)
              .andWhere(`chat.read_by NOT REGEXP '^${user_id}'`)
              .andWhere(`chat.read_by NOT REGEXP '${user_id}$'`)
              .andWhere(`chat.read_by != ${user_id}`)
              .andWhere(`chat.read_by NOT REGEXP '${user_id}'`)
              .groupBy('chat.sender_id');
          },
          'chatCount',
          'user.id = chatCount.sender_id'
        )
        .whereInIds(ids)
        .orderBy(`user.${orderBy}`, <any>order)
        .select([
          'user.first_name',
          'user.last_name',
          'user.id',
          'CONCAT(COALESCE(user.first_name, ""), " ", COALESCE(user.last_name, "")) AS name',
          'COALESCE(chatCount.total, 0) AS total'
        ])
        .getRawMany();
        if(users && users.length){
          users = users.map((item) => {
              const newItem = {};
              Object.entries(item).forEach(([key, value]) => {
                const newKey = key.startsWith('user_') ? key.replace('user_', '') : key;
                newItem[newKey] = value;
              });
              return newItem;
            });
        }
      return this.commonArrayService.paginationResponse(users, total, paginateObj);
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }
}
