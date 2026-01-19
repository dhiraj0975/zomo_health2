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
@Entity({ name: tableConstant.BIOMETRIC.BIR_BIOMETRIC_ORG_SETTING })
export class BiometricOrgSettingEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    org_id: number;
    @Column({ type: 'int', default: 0 })
    is_based: number;
    @Column({ type: 'int', default: 0 })
    is_hire: number;
    @Column({ type: 'text', nullable: true })
    is_hire_date: string;
    @Column({ type: 'int', default: 0 })
    is_required: number;
    @Column({ type: 'int', default: 0 })
    qualifie_type: number;
    @Column({ type: 'float', default: 0 })
    option: number;
    @Column({ type: 'int', default: 1 })
    category_option: number;
    @Column({ type: 'text', nullable: true })
    is_physician_follow: string;
    @Column({ type: 'text', nullable: true })
    is_talk_to_coach: string;
    @Column({ type: 'text', nullable: true })
    is_join_challenge: string;
    @Column({ type: 'text', nullable: true })
    is_learn_more: string;
    @Column({ type: 'text', nullable: true })
    is_complete_message: string;
    @Column({ type: 'text', nullable: true })
    is_incomplete_message: string;
    @Column({ type: 'int', default: 1 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
