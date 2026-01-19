import { activityTableConstant } from '@common-constants';
import { Entity } from 'typeorm';
import { ActivityBaseEntity } from '../activitybase.entity';
@Entity({ name: activityTableConstant.TBL_EVENT_OTHER })
export class EventOtherEntity extends ActivityBaseEntity {}
