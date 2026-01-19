import {
    BaseEntity,
    Column,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity({ name: tableConstant.HEALTH_ASSESSMENT.TBL_HA_LMSPECIFICMETRICS })
export class lmspecificmetricsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: false })
    text_id: number;
    @Column('integer', { nullable: false })
    language_id: number;
    @Column('text', { nullable: false })
    learnmore: string;
}
