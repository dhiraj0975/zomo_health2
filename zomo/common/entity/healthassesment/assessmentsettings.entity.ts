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
@Entity({ name: tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_SETTINGS })
export class AssessmentSettingsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: false })
    organization_id: number;
    @Column('varchar', { length: 512, nullable: false })
    banner_title: string;
    @Column('text', { nullable: true })
    banner_description: string;
    @Column('varchar', { length: 512, nullable: true })
    banner_image: string;
    @Column('text', { nullable: true })
    result_top_decscription: string;
    @Column('text', { nullable: true })
    result_bottom_decscription: string;
    @Column('integer', { nullable: false, default: 0 })
    copied_organization: number;
    @Column('integer', { nullable: false, default: 1 })
    status: number;
    @Column('integer', { nullable: false, default: 0 })
    created_by: number;
    @Column('integer', { nullable: false, default: 0 })
    updated_by: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
