import { activityTableConstant } from '@common-constants';
import {
    Entity
} from 'typeorm';
import { ActivityBaseEntity } from '../activitybase.entity';
@Entity({ name: activityTableConstant.TBL_FT_ACTIVITY_FEEDS })
export class ActivityFeedEntity extends ActivityBaseEntity {}
