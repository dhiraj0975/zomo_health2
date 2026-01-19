import { activityTableConstant } from '@common-constants';
import {
    Entity
} from 'typeorm';
import { ActivityBaseEntity } from '../activitybase.entity';
@Entity({ name: activityTableConstant.TBL_BROKER })
export class BrokerEntity extends ActivityBaseEntity {}
