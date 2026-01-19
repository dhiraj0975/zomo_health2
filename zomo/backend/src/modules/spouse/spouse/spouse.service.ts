import { appConstant, CommonArrayService, CommonFileService, SpouseEntity, UserEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithSpouseInput } from "../../../input";
@Injectable()
export class SpouseService {
    constructor(
        @InjectRepository(SpouseEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaSpouseRepository: Repository<SpouseEntity>,
        @InjectRepository(SpouseEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaSpouseRepository: Repository<SpouseEntity>,
        @InjectRepository(UserEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUserRepository: Repository<UserEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateWithSpouseInput) {
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
                : 'spouse.id';
        const queryResult = await this.readReplicaSpouseRepository.createQueryBuilder('spouse')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaSpouseRepository.createQueryBuilder('spouse')
            .where(condition)
            .getOne();
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'ASC' };
        }
        return await this.readReplicaSpouseRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaSpouseRepository.create(data);
        return await this.writeReplicaSpouseRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaSpouseRepository.metadata);
        return await this.writeReplicaSpouseRepository.createQueryBuilder('spouse')
            .update(SpouseEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaSpouseRepository.delete(condition);
    }
    async generateValidCode(roleId: number) {
        let flag = true;
        let code = '';
        while (flag) {
            const randomCode = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit random number
            if (roleId === 7 || roleId === 22) {
                code = `BF${randomCode}`;
            } else {
                code = `CI${randomCode}`;
            }
            const existingUser = await this.readReplicaUserRepository.findOne({
                where: { code },
            });
            if(existingUser || code == ''){
                flag = true;
            }else{
                flag = false;
            }
        }
        return code;
    }
    async generateUsername(firstName: string, lastName: string, birthYear: string, timeCount = 0): Promise<string> {
        let birthy2digit = birthYear;
        if (birthYear.length >= 2) {
            birthy2digit = birthYear.slice(-2);
        }
        let newUsername: string;
        if (timeCount === 0) {
            newUsername = `${firstName}${lastName}${birthYear}`;
        } else if (timeCount === 1) {
            newUsername = `${firstName}${lastName}${birthy2digit}${birthy2digit}`;
        } else {
            const length = 5;
            const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const randomStr = Array.from({ length }, () => characters[Math.floor(Math.random() * characters.length)]).join('');
            newUsername = `${firstName}${lastName}${randomStr}${birthYear}`;
        }
        const userExists = await this.readReplicaUserRepository.findOne({ where: { username: newUsername } });
        if (userExists) {
            return this.generateUsername(firstName, lastName, birthYear, timeCount + 1);
        } else {
            return newUsername;
        }
    }
}