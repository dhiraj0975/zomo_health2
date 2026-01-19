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
@Entity({ name: tableConstant.CHALLENGE.TBL_CH_TOKENS })
export class TokensEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true, default: null})
    org_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    user_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    schedule_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    challege_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    team_id: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    token_number: number;
    @Column({ type: 'varchar', length: 255, nullable: true, default: null})
    token_type: string;
    @Column({ type: 'int', nullable: true, default: null})
    to_user_id: number;
    @Column({ type: 'datetime', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    submission_date: Date;
    @Column({ type: 'text', nullable: true, default: null})
    comment: string;
    @Column({ type: 'int', nullable: false, default: 1 })
    status: number;
    @CreateDateColumn({ type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    update: Date;
}
