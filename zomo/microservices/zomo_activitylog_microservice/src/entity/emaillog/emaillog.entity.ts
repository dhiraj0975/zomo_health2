import { activityTableConstant } from '@common-constants';
import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
@Entity({ name: activityTableConstant.TBL_EMAIL_LOG })
export class EmailLogEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int', unsigned: true })
    id: number;
    @Column({  type: 'varchar', length: 255, nullable: true ,default: null })
    sender_email: string;
    @Column({  type: 'text',nullable: true ,default: null })
    payload: string;
    @Column({  type: 'text',nullable: true ,default: null })
    attachment: string;
    @Column({  type: 'varchar', length: 255, nullable: true ,default: null })
    message: string;
    @Column({ type: 'text',nullable: true ,default: null })
    log: string;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', onUpdate: 'CURRENT_TIMESTAMP', nullable: true, default: null })
    updated: Date;
}