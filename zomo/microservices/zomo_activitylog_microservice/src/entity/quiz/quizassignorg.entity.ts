import { activityTableConstant } from '@common-constants';
import { Entity } from 'typeorm';
import { ActivityBaseEntity } from '../activitybase.entity';
@Entity({ name: activityTableConstant.TBL_QUIZ_ASSIGN_ORGS })
export class QuizAssignOrgEntity extends ActivityBaseEntity {}
