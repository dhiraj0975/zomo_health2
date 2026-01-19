import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity(tableConstant.MEDIA_FITNESS.TBL_ME_POST)
export class MediaPostEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ nullable: false })
    org_id: number;
    @Column({ nullable: true })
    cat_id: number;
    @Column({ default: 0 })
    activity_id: number;
    @Column('varchar',{length: 512, nullable: false })
    title: string;
    @Column({ nullable: false })
    link_title: string;
    @Column('text',{ nullable: true })
    post_img: string;
    @Column('integer',{ nullable: false })
    display_type: number;
    @Column('varchar',{length: 512, nullable: false })
    display_area: string;
    @Column('integer',{ nullable: false })
    atime: number;
    @Column('integer',{ default: 0 })
    atime_type: number;
    @Column('text',{ nullable: true })
    short_desc: string;
    @Column('text',{ nullable: true })
    more_desc: string;
    @Column('int')
    created_by: number;
    @Column('int')
    updated_by: number;
    @Column('int')
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
