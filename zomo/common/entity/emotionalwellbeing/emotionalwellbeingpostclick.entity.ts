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
@Entity({ name: tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST_CLICK })
export class EmotionalWellBeingPostClickEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('int',{ nullable: true })
    post_id: number;
    @Column('int',{ nullable: true })
    user_id: number;
    @Column('int',{ default: 5905 })
    activity_id: number;
    @Column({type: 'int', default: 1})
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_date: Date;
}
