import {
    appConstant,
    BaseService,
    CommonService,
    UserEntity,
    CommonArrayService,
    CommonDateService,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import validator from 'validator';
import { Request } from 'express';
@Injectable()
export class UserService extends BaseService<UserEntity> {
    constructor(
        @InjectRepository(UserEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUserRepository: Repository<UserEntity>,
        @InjectRepository(UserEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaUserRepository: Repository<UserEntity>,
        private readonly commonService: CommonService,
        private readonly commonDateService: CommonDateService,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaUserRepository,
            writeReplicaUserRepository,
            'user',
            commonArrayService,
        );
    }
    async upsert(
        conditions: FindOptionsWhere<UserEntity>,
        data: DeepPartial<UserEntity>,
    ): Promise<{ entity: UserEntity; isNew: boolean }> {
        const result = await super.upsert(conditions, data);
        if (result.isNew) {
            await this.writeReplicaUserRepository.save({
                onboarding: data.onboarding,
                new_password: data.new_password,
                id: result.entity.id,
            });
        }
        return result;
    }

    async save(createDto) {
        const entity = this.writeReplicaUserRepository.create(createDto);
        entity['onboarding'] = 1;
        return this.writeReplicaUserRepository.save(entity);
    }
    async updateStatusFromDb(passingItems: any[]) {
        // Step 1: Normalize input array
        const normalized = passingItems.map((item) => {
            const dob = this.commonDateService.DateTimeFormat(
                item['Birth Date'],
                'YYYY-MM-DD',
                'MM-DD-YYYY',
            );
            return {
                original: item,
                first_name: item['First Name'].trim(),
                last_name: item['Last Name'].trim(),
                dob,
                email: item.Email.trim().toLowerCase(),
            };
        });

        const emails = normalized.map((u) => u.email);

        // Step 2: Build query for email and name+dob
        const qb = this.readReplicaUserRepository.createQueryBuilder('user');

        qb.where('LOWER(user.email) IN (:...emails)', { emails });

        qb.orWhere(
            new Brackets((qbInner) => {
                normalized.forEach((u, i) => {
                    qbInner.orWhere(
                        `(LOWER(user.first_name) = :fn${i} AND LOWER(user.last_name) = :ln${i} AND user.dob = :dob${i})`,
                        {
                            [`fn${i}`]: u.first_name.toLowerCase(),
                            [`ln${i}`]: u.last_name.toLowerCase(),
                            [`dob${i}`]: u.dob,
                        },
                    );
                });
            }),
        );

        const matchedUsers = await qb.getMany();

        // Step 3: Create match sets
        const emailSet = new Set(
            matchedUsers.map((u) => u.email.toLowerCase()),
        );

        const nameDobSet = new Set(
            await Promise.all(
                matchedUsers.map(async (u) => {
                    const dob = await this.commonDateService.DateTimeFormat(
                        u.dob,
                        'YYYY-MM-DD',
                    );
                    return `${u.first_name.toLowerCase()}|${u.last_name.toLowerCase()}|${dob}`;
                }),
            ),
        );

        // Step 4: Update original array
        for (const user of normalized) {
            const nameDobKey = `${user.first_name.toLowerCase()}|${user.last_name.toLowerCase()}|${user.dob}`;

            if (nameDobSet.has(nameDobKey)) {
                user.original.Status = 'Duplicate by name and DOB';
            } else if (emailSet.has(user.email)) {
                user.original.Status = 'Duplicate by email';
            }
        }
        return passingItems;
    }
    async updateStatusFromDbJson(passingItems: any[][]) {
        if (!Array.isArray(passingItems) || passingItems.length < 2) {
            return { records: [], successCount: 0, rejectedCount: 0 };
        }

        // Step 1: Extract headers and rows
        const headers = passingItems[0];
        const rows = passingItems.slice(1);

        if (!headers.includes('Status')) {
            headers.push('Status');
        }

        // Convert rows to objects
        const dataObjects = rows.map((row) => {
            const obj: Record<string, any> = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] ?? '';
            });
            obj['Status'] = '';
            return obj;
        });

        // ---- Local duplicate check in uploaded file ----
        const emailCountMap = new Map<string, number>();
        for (const row of dataObjects) {
            const email = row.Email?.toLowerCase()?.trim();
            if (email) {
                emailCountMap.set(email, (emailCountMap.get(email) || 0) + 1);
            }
        }

        // ---- Step 2: Validate each record ----
        for (const row of dataObjects) {
            const errors: string[] = [];
            const firstName = row['First Name']?.trim();
            const lastName = row['Last Name']?.trim();
            const dobStr = row['Birth Date']?.trim();
            const email = row.Email?.trim().toLowerCase();

            // First/Last Name validation
            if (!firstName) errors.push('First Name required');
            if (!lastName) errors.push('Last Name required');

            // DOB validation
            let validDOB = false;
            if (!dobStr) {
                errors.push('DOB required');
            } else {
                const parts = dobStr.split('-'); // expecting MM-DD-YYYY
                if (parts.length === 3) {
                    const [mm, dd, yyyy] = parts.map((p) => parseInt(p, 10));
                    const date = new Date(yyyy, mm - 1, dd);
                    validDOB =
                        date.getFullYear() === yyyy &&
                        date.getMonth() === mm - 1 &&
                        date.getDate() === dd;

                    if (!validDOB) {
                        errors.push('Invalid DOB');
                    } else {
                        // Age check (18+)
                        const today = new Date();
                        let age = today.getFullYear() - yyyy;
                        if (
                            today.getMonth() < mm - 1 ||
                            (today.getMonth() === mm - 1 &&
                                today.getDate() < dd)
                        ) {
                            age--;
                        }
                        if (age < 18) {
                            errors.push('Must be 18 or older');
                        }
                    }
                } else {
                    errors.push('Invalid DOB');
                }
            }

            // Email validation
            if (!email || !validator.isEmail(email)) {
                errors.push('Invalid Email');
            } else if ((emailCountMap.get(email) || 0) > 1) {
                errors.push('Duplicate Email in file');
            }

            // Set Status if errors exist
            if (errors.length > 0) {
                row.Status = errors.join(', ');
            }
        }

        // ---- Step 3: Filter only valid rows for DB check ----
        const validRecords = dataObjects.filter((r) => !r.Status);

        const normalized = validRecords.map((item) => {
            const dob = this.commonDateService.DateTimeFormat(
                item['Birth Date'],
                'YYYY-MM-DD',
                'MM-DD-YYYY',
            );
            return {
                original: item,
                first_name: item['First Name'].trim(),
                last_name: item['Last Name'].trim(),
                dob,
                email: item.Email.trim().toLowerCase(),
            };
        });

        // If no valid records left, return early
        if (normalized.length === 0) {
            return {
                records: dataObjects,
                successCount: 0,
                rejectedCount: dataObjects.length,
            };
        }

        // ---- Step 4: DB Duplicate Check ----
        const emails = normalized.map((u) => u.email);
        const qb = this.readReplicaUserRepository.createQueryBuilder('user');

        qb.where('LOWER(user.email) IN (:...emails)', { emails });
        qb.orWhere(
            new Brackets((qbInner) => {
                normalized.forEach((u, i) => {
                    qbInner.orWhere(
                        `(LOWER(user.first_name) = :fn${i} AND LOWER(user.last_name) = :ln${i} AND user.dob = :dob${i})`,
                        {
                            [`fn${i}`]: u.first_name.toLowerCase(),
                            [`ln${i}`]: u.last_name.toLowerCase(),
                            [`dob${i}`]: u.dob,
                        },
                    );
                });
            }),
        );

        const matchedUsers = await qb.getMany();

        const emailSet = new Set(
            matchedUsers.map((u) => u.email.toLowerCase()),
        );
        const nameDobSet = new Set(
            await Promise.all(
                matchedUsers.map(async (u) => {
                    const dob = await this.commonDateService.DateTimeFormat(
                        u.dob,
                        'YYYY-MM-DD',
                    );
                    return `${u.first_name.toLowerCase()}|${u.last_name.toLowerCase()}|${dob}`;
                }),
            ),
        );

        for (const user of normalized) {
            const nameDobKey = `${user.first_name.toLowerCase()}|${user.last_name.toLowerCase()}|${user.dob}`;
            if (nameDobSet.has(nameDobKey)) {
                user.original.Status = 'Duplicate by name and DOB';
            } else if (emailSet.has(user.email)) {
                user.original.Status = 'Duplicate by email';
            }
        }

        // ---- Step 5: Count success/rejected ----
        const successCount = dataObjects.filter((r) => !r.Status).length;
        const rejectedCount = dataObjects.length - successCount;

        return {
            records: dataObjects,
            successCount,
            rejectedCount,
        };
    }
}
