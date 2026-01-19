import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity({ name: tableConstant.EMOTIONAL_WELLBEING.TBL_EM_TAG_ASSIGN })
export class EmotionalWellBeingTagAssignEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('int',{nullable: false, default: 0})
    v_id: number;
    @Column('int',{nullable: false, default: 0})
    t_id: number;
    @Column('int',{nullable: false, default: 0})
    cat_id: number;
    @Column('int',{ default: 1 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
