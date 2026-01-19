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
@Entity({ name: tableConstant.TBL_MARKETING_CAREER })
export class MarketingCareerEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'varchar', nullable: false })
    first_name: string;
    @Column({ type: 'varchar', nullable: false })
    last_name: string;
    @Column({ type: 'varchar', nullable: false })
    email: string;
    @Column({ type: 'varchar', nullable: false })
    role: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    mobile: string;
    @Column({ type: 'varchar', nullable: false })
    resume_cv: string;
    @Column({ type: 'varchar', nullable: true, default: null })
    supporting_document: string;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
