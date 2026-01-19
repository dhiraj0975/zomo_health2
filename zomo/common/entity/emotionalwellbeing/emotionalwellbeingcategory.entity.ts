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
@Entity({ name: tableConstant.EMOTIONAL_WELLBEING.TBL_EM_CATEGORY })
export class EmotionalWellBeingCategoryEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ nullable: false })
    org_id: number;
    @Column({ nullable: true })
    parent_id: number;
    @Column({ nullable: true })
    lft: number;
    @Column({ nullable: true })
    rght: number;
    @Column({ nullable: false, default: 0 })
    layout_type: number;
    @Column({ nullable: false })
    title: string;
    @Column({ nullable: false })
    description: string;
    @Column({ nullable: true })
    img: string;
    @Column({ type: 'int', default: 1 })
    status: number;
    @Column({ type: 'int'})
    created_by: number;
    @Column({ type: 'int'})
    updated_by: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
