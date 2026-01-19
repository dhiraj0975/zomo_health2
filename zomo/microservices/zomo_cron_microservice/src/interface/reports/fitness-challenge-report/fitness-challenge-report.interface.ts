import {ChallengeEntity, ScheduleChallengeEntity} from "@common-constants";

export interface ScheduleChallengeInterface extends ScheduleChallengeEntity {
    ch: ChallengeEntity;
}