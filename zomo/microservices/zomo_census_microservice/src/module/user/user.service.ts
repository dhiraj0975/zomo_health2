import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonService,
    tableConstant,
    UserEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class UserService extends BaseService<UserEntity> {
    constructor(
        @InjectRepository(UserEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUserRepository: Repository<UserEntity>,
        @InjectRepository(UserEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaUserRepository: Repository<UserEntity>,
        private readonly commonService: CommonService,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaUserRepository,
            writeReplicaUserRepository,
            'user',
            commonArrayService,
        );
    }

    async updateStatusByIds(ids: number[], status: number) {
        return this.writeReplicaUserRepository
            .createQueryBuilder()
            .update(UserEntity)
            .set({ status })
            .where('id IN (:...ids)', { ids })
            .execute();
    }
    async listRecord(
        condition: any,
        orderBy: any = null,
        fields: any[] = null,
        groupBy: any = null,
        joinTable: any = [],
    ) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let data = this.readReplicaUserRepository.createQueryBuilder('user');
        if (joinTable && joinTable.length > 0) {
            for (let i = 0; i < joinTable.length; i++) {
                if (joinTable[i].type == 'INNER') {
                    data = data.innerJoinAndMapOne(
                        `${joinTable[i].connect}.${joinTable[i].alias}`,
                        joinTable[i].table,
                        joinTable[i].alias,
                        joinTable[i].on,
                    );
                } else {
                    data = data.leftJoinAndMapOne(
                        `${joinTable[i].connect}.${joinTable[i].alias}`,
                        joinTable[i].table,
                        joinTable[i].alias,
                        joinTable[i].on,
                    );
                }
            }
        } else {
            data = data
                .leftJoinAndMapOne(
                    'user.department',
                    tableConstant.COMPANIES.TBL_DEPARTMENT,
                    'department',
                    `department.id = user.department_id`,
                )
                .leftJoinAndMapOne(
                    'user.settings',
                    tableConstant.TBL_USERS_SETTINGS,
                    'settings',
                    `settings.user_id = user.id`,
                )
                .leftJoinAndMapOne(
                    'user.location',
                    tableConstant.COMPANIES.TBL_LOCATION,
                    'location',
                    `location.id = user.location`,
                );
        }
        data = data
            .select(fields)
            .where(condition)
            .orderBy(
                `user.${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            );
        if (groupBy !== null) {
            data.groupBy(groupBy);
        }
        return await data.getMany();
    }

    async listUDLCSRecords(
        condition: any,
        orderBy: any = null,
        fields: any[] = [],
    ) {
        if (!orderBy) {
            orderBy = { code: 'ASC' };
        }

        const query = this.readReplicaUserRepository
            .createQueryBuilder('user')
            .innerJoinAndMapOne(
                'user.settings',
                tableConstant.TBL_USERS_SETTINGS,
                'settings',
                'settings.user_id = user.id',
            )
            .where(condition)
            .orderBy(
                `user.${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            );
        /*if (fields.length > 0) {
            const fieldSelections = fields.map((field) => `${field}`);
            query.select(fieldSelections);
        }*/
        if (fields.length > 0) {
            query.select(fields);
        }
        const users = await query.getMany();
        const flattenedUsers = users.map((user) => {
            const {
                settings,
                id: userId,
                ...rest
            } = user as UserEntity & {
                settings: any;
            };
            return {
                ...rest,
                ...settings,
                sid: settings?.id,
                id: userId,
            };
        });

        return flattenedUsers;
    }
    async findOne(
        condition: any,
        fields: any[] = [],
        orderBy: any = { id: 'DESC' },
    ) {
        const query = this.readReplicaUserRepository
            .createQueryBuilder('user')
            .innerJoinAndMapOne(
                'user.settings',
                tableConstant.TBL_USERS_SETTINGS,
                'settings',
                'settings.user_id = user.id',
            )
            .where(condition)
            .orderBy(
                `user.${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            )
            .take(1);

        if (fields.length > 0) {
            const fieldSelections = fields.map((field) => `${field}`);
            query.select(fieldSelections);
        }

        const user = await query.getOne();

        if (!user) return null;

        const { settings, ...rest } = user as UserEntity & { settings: any };
        const flattenedUser = {
            ...rest,
            ...settings,
        };

        return flattenedUser;
    }

    async findManySys(
        conditionsArray: Record<string, any>[],
        relations: string[] = [],
    ): Promise<any[]> {
        if (!conditionsArray || conditionsArray.length === 0) {
            return [];
        }

        try {
            const query = this.readReplicaUserRepository
                .createQueryBuilder('user')
                .leftJoinAndMapOne(
                    'user.settings',
                    tableConstant.TBL_USERS_SETTINGS,
                    'settings',
                    'settings.user_id = user.id',
                );

            const parameters: Record<string, any> = {};
            const orConditions: string[] = [];

            conditionsArray.forEach((cond, i) => {
                const conditionParts = Object.entries(cond).map(
                    ([key, value]) => {
                        const paramKey = `${key}_${i}`;
                        parameters[paramKey] = value;
                        return `user.${key} = :${paramKey}`;
                    },
                );

                if (conditionParts.length) {
                    orConditions.push(`(${conditionParts.join(' AND ')})`);
                }
            });

            if (orConditions.length) {
                query.where(orConditions.join(' OR '), parameters);
            }

            const users = await query.getMany();

            if (!users || users.length === 0) return [];

            return users.map((user: UserEntity & { settings: any }) => {
                const { settings, id: userId, ...rest } = user;

                return {
                    ...rest,
                    ...settings,
                    sid: settings?.id,
                    user_id: userId,
                    id: userId,
                };
            });
        } catch (error) {
            console.error('findManySys error:', error);
            return [];
        }
    }

    async findOneSys(
        conditions: Record<string, any>[],
        fields: string[] = [],
        orderBy: Record<string, 'ASC' | 'DESC'> = { id: 'DESC' },
    ) {
        const query = this.readReplicaUserRepository
            .createQueryBuilder('user')
            .leftJoinAndMapOne(
                'user.settings',
                tableConstant.TBL_USERS_SETTINGS,
                'settings',
                'settings.user_id = user.id',
            );

        const parameters: Record<string, any> = {};
        const orConditions: string[] = [];

        conditions.forEach((cond, i) => {
            const conditionParts = Object.entries(cond).map(([key, value]) => {
                const paramKey = `${key}_${i}`;
                parameters[paramKey] = value;
                return `user.${key} = :${paramKey}`;
            });

            if (conditionParts.length) {
                orConditions.push(`(${conditionParts.join(' AND ')})`);
            }
        });

        if (orConditions.length) {
            query.where(orConditions.join(' OR '), parameters);
        }

        const [orderKey, orderDirection] = Object.entries(orderBy)[0];
        query.orderBy(`user.${orderKey}`, orderDirection).take(1);

        if (fields.length > 0) {
            //query.select(fields.map((field) => `user.${field}`));
            query.select(fields);
        }

        const user = await query.getOne();
        if (!user) return null;

        const {
            settings,
            id: userId,
            ...rest
        } = user as UserEntity & { settings: any };

        return {
            ...rest,
            ...settings,
            sid: settings?.id,
            id: userId,
        };
    }

    async save(data: any) {
        if (data.id) {
            return await this.writeReplicaUserRepository.update(
                { id: data.id },
                data,
            );
        } else {
            const savedResult = this.writeReplicaUserRepository.create({
                ...data,
            });
            return await this.writeReplicaUserRepository.save(savedResult);
        }
    }
    async listTerminateRecords(
        condition: any,
        orderBy: any = null,
        fields: any[] = null,
        groupBy: any = null,
    ) {
        if (!orderBy) {
            orderBy = { code: 'ASC' };
        }
        const data = await this.readReplicaUserRepository
            .createQueryBuilder('User')
            .leftJoinAndMapOne(
                'User.department',
                tableConstant.COMPANIES.TBL_DEPARTMENT,
                'department',
                `department.id = User.department_id`,
            )
            .leftJoinAndMapOne(
                'User.location',
                tableConstant.COMPANIES.TBL_LOCATION,
                'location',
                `location.id = User.location`,
            )
            .leftJoinAndMapOne(
                'User.settings',
                tableConstant.TBL_USERS_SETTINGS,
                'settings',
                'settings.user_id = User.id',
            )
            .where(condition)
            .orderBy(
                `User.${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            );
        if (fields) {
            data.select(fields);
        }
        return data.getMany();
    }
    async threeTimeUserName(
        firstName: string,
        lastName: string,
        birthYear: string,
        timeCount = 0,
    ): Promise<string> {
        try {
            let birthYear2Digit = birthYear;
            if (birthYear.length >= 2) {
                birthYear2Digit = birthYear.slice(-2);
            }

            let newUsername: string;

            if (timeCount === 0) {
                newUsername = `${firstName}${lastName}${birthYear2Digit}${birthYear2Digit}`;
            } else {
                const length = 5;
                const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                const randomStr = Array.from({ length })
                    .map(() =>
                        characters.charAt(
                            Math.floor(Math.random() * characters.length),
                        ),
                    )
                    .join('');
                newUsername = `${firstName}${lastName}${randomStr}${birthYear}`;
            }
            const existingUser = await this.findOne({
                username: newUsername,
            });

            if (existingUser) {
                return this.threeTimeUserName(
                    firstName,
                    lastName,
                    birthYear,
                    timeCount + 1,
                );
            }

            return newUsername;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    async generateUniqueCode(): Promise<string> {
        let attempts = 0;
        while (attempts < 1000) {
            const code = await this.commonService.userValidDefaultCode(1);
            const exists = await this.findOne({ code });

            if (!exists) return code;
            attempts++;
        }
        throw new Error('Unable to generate unique code');
    }
}
