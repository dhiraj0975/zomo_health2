import { Injectable } from "@nestjs/common";
import { CommunicationEmailToService } from "./emailto/communicationemailto.service";
import { TranslationService } from "../translation/translation.service";
import { CommunicationEmailService } from "./email/communicationemail.service";
import { In } from "typeorm";

@Injectable()
export class CommunicationHelperService {
    constructor(
        private readonly communicationEmailToService: CommunicationEmailToService,
        private readonly translatorService: TranslationService,
        private readonly communicationEmailService: CommunicationEmailService,
    ) { }
    // count of uread emails in inbox, sent, draft, trash and spam.
    async getEmailCounting(postData: any, req: any) {
        try {
            let coachId = postData?.coach_id;
            if (!coachId) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const baseWhere = {
                user_id: coachId,
                status: 0,
                is_send: 1,
            };
            const [inboxMailIds, spamMailIds, trashMailIds] = await Promise.all([
                this.communicationEmailToService.listRecord(
                    { ...baseWhere, is_spam: 0, is_trash: 0 },
                    null,
                    { mail_id: true }
                ).then(res => res.map(r => r.mail_id)),
                this.communicationEmailToService.listRecord(
                    { ...baseWhere, is_spam: 1, is_trash: 0 },
                    null,
                    { mail_id: true }
                ).then(res => res.map(r => r.mail_id)),
                this.communicationEmailToService.listRecord(
                    { ...baseWhere, is_spam: 0, is_trash: 1 },
                    null,
                    { mail_id: true }
                ).then(res => res.map(r => r.mail_id)),
            ]);
            const allReceivedIds = [...new Set([
                ...inboxMailIds
            ])];
            const allSpamIds = [...new Set([
                ...spamMailIds
            ])];
            const allTrashIds = [...new Set([
                ...trashMailIds
            ])];
            let inboxThreadRoots: number[] = [];
            if (allReceivedIds.length > 0) {
                const parents = await this.communicationEmailService.listRecord(
                    { id: In(allReceivedIds) },
                    null,
                    { parent_id: true }
                );
                inboxThreadRoots = [...new Set([
                    ...allReceivedIds,
                    ...parents.map(p => p.parent_id).filter(Boolean),
                ])];
            }
            const inboxCount = inboxThreadRoots.length > 0
                ? await this.communicationEmailService.count(
                    {
                        id: In(inboxThreadRoots)
                    }
                )
                : 0;
            const draftCount = await this.communicationEmailService.count(
                {
                    from_user_id: coachId,
                    is_send: 0,
                    is_spam: 0,
                    is_trash: 0,
                    status: 0,
                }
            );
            const trashCount = allTrashIds.length > 0
                ? await this.communicationEmailService.count(
                    {
                        id: In(allTrashIds)
                    }
                )
                : 0;
            const spamCount = allSpamIds.length > 0
                ? await this.communicationEmailService.count(
                    {
                        id: In(allSpamIds)
                    }
                )
                : 0;
            const getThreadCount = async (extraWhere: any) => {
                const sentItems = await this.communicationEmailService.listRecord(
                    {
                        from_user_id: coachId,
                        is_send: 1,
                        status: 0,
                        ...extraWhere,
                    },
                    null,
                    { id: true, parent_id: true }
                );
                if (sentItems.length === 0) return 0;
                const allIds = [...new Set([
                    ...sentItems.map(i => i.id),
                    ...sentItems.map(i => i.parent_id).filter(Boolean),
                ])];
                return this.communicationEmailService.count(
                    {
                        id: In(allIds),
                    }
                );
            };
            // const [sentCount, trashCount, spamCount] = await Promise.all([
            const [sentCount] = await Promise.all([
                getThreadCount({ is_spam: 0, is_trash: 0 }),
                // getThreadCount({ is_spam: 0, is_trash: 1 }),
                // getThreadCount({ is_spam: 1, is_trash: 0 }),
            ]);
            const result = {
                inbox: inboxCount,
                sent: sentCount,
                draft: draftCount,
                trash: trashCount,
                spam: spamCount,
            };
            return result;
        } catch (error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }

}