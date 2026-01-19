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
@Entity({ name: tableConstant.ACTIVITIES.TBL_CATEGORIES })
export class CategoryEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('varchar', { nullable: true })
    category_name: string;
    @Column('integer', { nullable: true })
    qty_req: number;
    @Column('integer', { nullable: true })
    reqby_usr: number;
    @Column('integer', { nullable: true })
    reqby_spouse: number;
    @Column('integer', { nullable: true })
    max_freto_earn_point: number;
    @Column('integer', { nullable: true })
    point_for_each	: number;
    @Column('integer', { nullable: true })
    max_point_per_cham	: number;
    @Column('text', { nullable: true })
    orgenization_code: string;
    @Column('text', { nullable: true })
    description: string;
    @Column('varchar', { nullable: true })
    plugin: string;
    @Column('varchar', { nullable: true })
    controller: string;
    @Column('varchar', { nullable: true })
    action: string;
    @Column('text', { nullable: true })
    newlink: string;
    @Column('varchar', { nullable: true })
    ext_link: string;
    // @Column('varchar', { nullable: true }) // removed as per instruction
    // icon: string;
    // @Column('text', { nullable: true })
    // image: string;
    @Column('integer', { nullable: true })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    added_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_date: Date;
}
