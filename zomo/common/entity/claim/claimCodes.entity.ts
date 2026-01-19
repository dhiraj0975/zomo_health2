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
@Entity({ name: tableConstant.CLAIM.TBL_CL_CODES })
export class ClaimCodesEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'varchar', length: 50 })
    diagnosis_code: string;
    @Column({ type: 'varchar', length: 250 })
    long_description: string;
    @Column({ type: 'varchar', length: 50 })
    short_description: string;
    @Column({ type: 'varchar', length: 250 })
    icd_category: string;
    @Column({ type: 'varchar', length: 125 })
    chronic_category: string;
    @Column({ type: 'varchar', length: 50 })
    pr_chr_health_cond: string;
    @Column({ type: 'varchar', length: 250 })
    icd_general_category: string;
    @Column({ type: 'int', default: 1 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
