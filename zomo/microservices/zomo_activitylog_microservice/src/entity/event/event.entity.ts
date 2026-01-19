import { activityTableConstant } from '@common-constants';
import { Entity } from 'typeorm';
import { ActivityBaseEntity } from '../activitybase.entity';
@Entity({ name: activityTableConstant.TBL_EVENT })
export class EventEntity extends ActivityBaseEntity {}
