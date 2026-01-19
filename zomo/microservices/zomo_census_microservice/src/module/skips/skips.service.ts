import { Injectable } from '@nestjs/common';
@Injectable()
export class SkipService {
    constructor() {}

    public async matchAndClassifyUsers(existingUsersRaw, uploadedUsers) {
        const comboData = {
            newDepartment: false,
            newLocation: false,
            skipCount: 0,
            rejectCount: 0,
        };

        const isValid = (val) =>
            val !== null && val !== undefined && val !== '';

        const groupKeys = [
            ['first_name', 'last_name', 'dob'],
            ['email'],
            ['employeeId'],
            ['securitycode'],
        ];

        const nullcheckkeys = [
            ['first_name', 'last_name', 'dob'],
            ['email'],
            ['employeeId'],
            ['securitycode'],
            ['code'],
        ];

        const codeMap = new Map<string, any>();
        const groupMaps = groupKeys.map(() => new Map<string, any>());
        const matchedExistingUserIds = new Set<number>();
        const uniqueNullCheckCombos = new Set<string>();

        for (const user of existingUsersRaw) {
            const code = user.code ?? user.settings?.code;
            if (isValid(code)) {
                codeMap.set(code, user);
            }

            groupKeys.forEach((group, index) => {
                const key = group.map((k) => user[k]).join('|');
                if (group.every((k) => isValid(user[k]))) {
                    groupMaps[index].set(key, user);
                }
            });
        }

        mainLoop: for (const uploadedUser of uploadedUsers) {
            const uploadedCompare = uploadedUser.compare || {};
            const uploadedCode = uploadedCompare.code;
            uploadedUser.tmp = uploadedUser.tmp || {};

            const allGroupsInvalid = nullcheckkeys.every((group) =>
                group.every((field) => !isValid(uploadedUser[field])),
            );
            if (allGroupsInvalid) {
                uploadedUser.__status = 'reject';
                uploadedUser.ErrorCode = "'1000'";
                comboData.rejectCount++;
                continue mainLoop;
            }

            for (const group of nullcheckkeys) {
                const allValid = group.every((field) =>
                    isValid(uploadedUser[field]),
                );
                if (!allValid) continue;

                const comboKey = group
                    .map((field) => uploadedUser[field])
                    .join('|');

                if (uniqueNullCheckCombos.has(comboKey)) {
                    uploadedUser.__status = 'reject';
                    uploadedUser.ErrorCode = "'1066'";
                    comboData.rejectCount++;
                    continue mainLoop;
                } else {
                    uniqueNullCheckCombos.add(comboKey);
                }
            }

            let matchedUser: any = null;
            let isFullMatch = false;
            let mismatchDetails: {
                key: string;
                uploaded: any;
                existing: any;
            }[] = [];

            matchedUser = existingUsersRaw.find((existing) =>
                Object.keys(uploadedCompare).every(
                    (key) => uploadedCompare[key] === existing[key],
                ),
            );
            isFullMatch = !!matchedUser;

            if (matchedUser && matchedExistingUserIds.has(matchedUser.id)) {
                uploadedUser.__status = 'reject';
                uploadedUser.ErrorCode = "'1066'";
                comboData.rejectCount++;
                continue mainLoop;
            }

            if (!isFullMatch && isValid(uploadedCode)) {
                matchedUser = codeMap.get(uploadedCode);
                if (matchedUser) {
                    if (matchedExistingUserIds.has(matchedUser.id)) {
                        uploadedUser.__status = 'reject';
                        uploadedUser.ErrorCode = "'1066'";
                        comboData.rejectCount++;
                        continue mainLoop;
                    }
                } else {
                    uploadedUser.tmp.invalid_code = true;
                }
            }

            if (!matchedUser && !isValid(uploadedCode)) {
                for (let i = 0; i < groupKeys.length; i++) {
                    const group = groupKeys[i];
                    const key = group.map((k) => uploadedCompare[k]).join('|');
                    const allValid = group.every((k) =>
                        isValid(uploadedCompare[k]),
                    );
                    if (!allValid) continue;

                    const existingUser = groupMaps[i].get(key);
                    if (existingUser) {
                        if (matchedExistingUserIds.has(existingUser.id)) {
                            uploadedUser.__status = 'reject';
                            uploadedUser.ErrorCode = "'1066'";
                            comboData.rejectCount++;
                            continue mainLoop;
                        }

                        matchedUser = existingUser;
                        uploadedUser.tmp.match_group = i;

                        if (
                            uploadedUser.tmp?.isSpouseExist &&
                            !uploadedCompare.code &&
                            uploadedUser.tmp?.childRowIndex !== undefined
                        ) {
                            const spouseRecord =
                                uploadedUsers[uploadedUser.tmp.childRowIndex];
                            if (
                                spouseRecord &&
                                spouseRecord.tmp?.isSpouse &&
                                spouseRecord.compare
                            ) {
                                spouseRecord.compare.relationship_code =
                                    existingUser.code;
                            }
                        }

                        break;
                    }
                }
            }

            if (matchedUser && matchedExistingUserIds.has(matchedUser.id)) {
                uploadedUser.__status = 'reject';
                uploadedUser.ErrorCode = "'1066'";
                comboData.rejectCount++;
                continue mainLoop;
            }

            if (matchedUser) {
                matchedExistingUserIds.add(matchedUser.id);
            }

            if (!isFullMatch && matchedUser) {
                mismatchDetails = Object.keys(uploadedCompare).reduce(
                    (acc, key) => {
                        const uploadedVal = uploadedCompare[key];
                        const existingVal = matchedUser[key];
                        if (uploadedVal !== existingVal) {
                            acc.push({
                                key,
                                uploaded: uploadedVal,
                                existing: existingVal,
                            });
                        }
                        return acc;
                    },
                    [],
                );

                uploadedUser.differenceField = mismatchDetails.map(
                    (d) => d.key,
                );
                uploadedUser.existingUserRawResult = matchedUser;
            }

            if (isFullMatch) {
                uploadedUser.__status = 'skip';
                uploadedUser.existingUserRawResult = { id: matchedUser.id };
                comboData.skipCount++;
                delete uploadedUser.compare;
            } else {
                if (matchedUser?.email_update === 1) {
                    uploadedUser.email = matchedUser.email;
                    uploadedUser.compare.email = matchedUser.email;
                }

                uploadedUser.__status = matchedUser ? 'update' : 'new';

                if (
                    uploadedCompare.department_id &&
                    !uploadedUser.tmp?.deptId &&
                    !comboData.newDepartment
                ) {
                    comboData.newDepartment = true;
                }

                if (
                    uploadedCompare.location &&
                    !uploadedUser.tmp?.locId &&
                    uploadedUser.tmp?.locationKey &&
                    !comboData.newLocation
                ) {
                    comboData.newLocation = true;
                }
            }
        }

        return {
            updatedUsers: uploadedUsers,
            comboData,
        };
    }
}
