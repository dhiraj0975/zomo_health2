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
@Entity(tableConstant.MEDIA_FITNESS.TBL_ME_CATEGORY)
export class MediaCategoryEntity {
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
    @Column('varchar',{length: 512, nullable: false })
    title: string;
    @Column('text',{ nullable: false })
    description: string;
    @Column('text',{ nullable: true })
    img: string;
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
