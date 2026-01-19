import { activityTableConstant } from '@common-constants';
import { Entity } from 'typeorm';
import { ActivityBaseEntity } from '../activitybase.entity';
@Entity({ name: activityTableConstant.TBL_COMPANY_CLIENT_MANAGER_ASSIGN })
export class ClientManagerAssignEntity extends ActivityBaseEntity {}
