import {
    CommonArrayService,
    CommonDateService,
    CommonHealthService,
    ScheduleChallengeEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { CardsService } from 'src/module/challenge/cards/cards.service';
import { SquaresService } from 'src/module/challenge/squares/squares.service';
import { SquareUsersService } from 'src/module/challenge/squareusers/squareusers.service';
import { UserService } from 'src/module/user/user.service';
import { In } from 'typeorm';

@Injectable()
export class BingoChallengeReportService {
    constructor(
        private readonly userService: UserService,
        private readonly squareUsersService: SquareUsersService,
        private readonly squaresService: SquaresService,
        private readonly cardsService: CardsService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonHealthService: CommonHealthService,
    ) {}

    async bingoChallengeReport(
        schedule: Partial<ScheduleChallengeEntity>,
        condition: string = '',
        result_type: number = 1,
        paginateObj: any = null,
        teamCondition: string = '',
        groupCondition: string = '',
        clm_name_arr: string[],
    ) {
        try {
            const squareCompleteLimit = schedule?.square_complete_limit ?? 0;
            const cardCompleteLimit = schedule?.card_complete_limit ?? 0;
            const orgId = schedule?.org_id;
            const scheduleId = schedule?.id;

            // Parallel data fetching
            const [users, squares] = await Promise.all([
                this.userService.challengeReportPaginate(
                    `${condition} AND User.org_id = ${orgId}`,
                    null,
                    [
                        'User',
                        'Location',
                        'department.id',
                        'department.dept_name',
                        'company.id',
                        'company.company_name',
                        'companySetting.spouse_option',
                        'scj.id',
                        'scj.schedule_id',
                        'scj.challenge_id',
                    ],
                    [],
                ),
                this.squaresService.getAll({
                    org_id: orgId,
                    schedule_id: scheduleId,
                }),
            ]);
            //console.log('users:', users);
            if (!users?.length || !squares?.length) {
                return result_type === 1
                    ? { data: [], total: 0 }
                    : { clmNameArr: [], clm_data: [] };
            }

            const squareIds = squares.map((sq) => sq.id);

            // Pre-calculate squaresList
            const squaresList = squares.reduce((acc, sq) => {
                acc[sq.card_id] = (acc[sq.card_id] || 0) + 1;
                return acc;
            }, {});

            const squareUsers = await this.squareUsersService.getAll({
                square_id: In(squareIds),
                verified_status: 1,
            });

            // Build squareUserMap efficiently
            const squareUserMap = squareUsers.reduce((acc, user) => {
                if (!acc[user.square_id]) acc[user.square_id] = [];
                acc[user.square_id].push(user);
                return acc;
            }, {});

            // Process cardData and completeCard in single loop
            const cardData = {};
            const completeCard = {};
            for (const square of squares) {
                const cardId = square.card_id;
                const squareId = square.id;
                const squareUsersForSquare = squareUserMap[square.id] || [];
                const seenUserIds = new Set();

                for (const user of squareUsersForSquare) {
                    const userId = user.user_id;

                    if (seenUserIds.has(userId)) continue;
                    seenUserIds.add(userId);

                    const modifiedDate = new Date(user.modified_date).getTime();

                    if (!cardData[userId]) cardData[userId] = {};
                    if (!cardData[userId][cardId]) {
                        cardData[userId][cardId] = {
                            total: 1,
                            squaredata: { [squareId]: modifiedDate },
                            date: modifiedDate,
                        };
                    } else {
                        cardData[userId][cardId].total += 1;
                        cardData[userId][cardId].squaredata[squareId] =
                            modifiedDate;
                        if (cardData[userId][cardId].date < modifiedDate) {
                            cardData[userId][cardId].date = modifiedDate;
                        }
                    }

                    const totalCompleted = cardData[userId][cardId].total;
                    const requiredToComplete =
                        squareCompleteLimit !== 0
                            ? squareCompleteLimit
                            : squaresList[cardId];

                    if (totalCompleted === requiredToComplete) {
                        completeCard[userId] = (completeCard[userId] || 0) + 1;
                    }
                }
            }
            if (result_type === 1) {
                // Build result array
                const totalCards = Object.keys(squaresList).length;
                const result = users
                    .map((user) => {
                        const userId = user.id;
                        const completedCards = completeCard[userId] || 0;
                        const percent =
                            totalCards > 0
                                ? Number(
                                      (
                                          (completedCards / totalCards) *
                                          100
                                      ).toFixed(2),
                                  )
                                : 0;

                        return {
                            user_id: userId,
                            first_name: user.first_name || '',
                            last_name: user.last_name || '',
                            company_name: user.company?.company_name || '',
                            department_name: user.department?.dept_name || '',
                            employee_id: user?.employeeid || '',
                            completed_cards: completedCards,
                            total_cards: totalCards,
                            percent,
                        };
                    })
                    .sort((a, b) => {
                        if (b.percent !== a.percent)
                            return b.percent - a.percent;
                        return b.completed_cards - a.completed_cards;
                    });

                const finalPaginateObj = {
                    page: paginateObj?.page || 1,
                    take: paginateObj?.limit || 10,
                };

                return this.commonArrayService.paginationResponseChallengeReport(
                    result,
                    result.length,
                    finalPaginateObj,
                );

            } else {
                // Export mode
                const cards = await this.cardsService.getAll(
                    {
                        org_id: orgId,
                        schedule_id: scheduleId,
                    },
                    ['id', 'name'],
                    { order_no: 'ASC' },
                );

                const squaresByCardId = squares.reduce((acc, square) => {
                    if (!acc[square.card_id]) acc[square.card_id] = [];
                    acc[square.card_id].push(square);
                    return acc;
                }, {});
                //const clm_name_arr: string[] = [];
                let cardIndex = 1;

                for (const card of cards) {
                    clm_name_arr.push(`Card ${cardIndex} : ${card.name}`);
                    clm_name_arr.push(`DATE OF CARD ${cardIndex} Completion`);
                    const cardSquares = squaresByCardId[card.id] || [];
                    for (const square of cardSquares) {
                        clm_name_arr.push(square.name);
                        clm_name_arr.push(`DATE OF Completion`);
                    }
                    clm_name_arr.push(
                        `NUMBER OF ACTIVITIES Completed In Card ${cardIndex}`,
                    );
                    cardIndex++;
                }
                clm_name_arr.push('NUMBER OF CARDS COMPLETED');
                clm_name_arr.push('CHALLENGE GOAL COMPLETED (YES/NO)');

                const clm_data = await Promise.all(
                    users.map(async (user) => {
                        const userId = user.id;
                        const row: any[] = [];

                        const tempdatainfo =
                            await this.commonHealthService.CommonFieldDataCallingCovid(
                                user,
                                clm_name_arr,
                            );
                        row.push(...Object.values(tempdatainfo));

                        for (const card of cards) {
                            const cardId = card.id;
                            const cardDataForUser = cardData[userId]?.[cardId];
                            const requiredToComplete =
                                squareCompleteLimit !== 0
                                    ? squareCompleteLimit
                                    : squaresByCardId[cardId]?.length || 0;

                            if (
                                cardDataForUser &&
                                cardDataForUser.total >= requiredToComplete
                            ) {
                                row.push('Yes');
                                row.push(
                                    this.commonDateService.DateTimeFormat(
                                        cardDataForUser.date,
                                        'MM-DD-YYYY',
                                    ),
                                );
                            } else {
                                row.push('No');
                                row.push('');
                            }

                            const cardSquares = squaresByCardId[cardId] || [];
                            for (const square of cardSquares) {
                                const squareId = square.id;
                                const squareDate =
                                    cardDataForUser?.squaredata?.[squareId];
                                if (squareDate) {
                                    row.push('Yes');
                                    row.push(
                                        this.commonDateService.DateTimeFormat(
                                            squareDate,
                                            'MM-DD-YYYY',
                                        ),
                                    );
                                } else {
                                    row.push('No');
                                    row.push('');
                                }
                            }
                            row.push(cardDataForUser?.total || 0);
                        }
                        const completedCards = completeCard[userId] || 0;
                        row.push(completedCards);
                        row.push(
                            completedCards >= cardCompleteLimit ? 'Yes' : 'No',
                        );
                        return row;
                    }),
                );
                return [clm_name_arr, ...clm_data];
            }
        } catch (error) {
            console.error('bingoChallengeReport error:', error);
            throw new Error(error);
        }
    }
}
