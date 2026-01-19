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
@Entity({ name: tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST })
export class EmotionalWellBeingPostEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ nullable: false })
    org_id: number;
    @Column({ nullable: false })
    cat_id: number;
    @Column({ nullable: false })
    title: string;
    @Column({ nullable: false })
    link_title: string;
    @Column({ nullable: true })
    post_img: string;
    @Column('int')
    display_type: number;
    @Column({ nullable: true })
    display_area: string;
    @Column('int')
    atime: number;
    @Column('int')
    atime_type: number;
    @Column({ nullable: false })
    short_desc: string;
    @Column({ nullable: false })
    more_desc: string;
    @Column({ default: null })
    maincollection: string;
    @Column({ default: null })
    secondarycategory: string;
    @Column('int')
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
