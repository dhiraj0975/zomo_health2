import { activityTableConstant } from '@common-constants';
import { Entity } from 'typeorm';
import { ActivityBaseEntity } from '../activitybase.entity';
@Entity({ name: activityTableConstant.TBL_CH_CHALLENGE_TEAM })
export class ChallengeTeamEntity extends ActivityBaseEntity {}
