import { activityTableConstant } from '@common-constants';
import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
@Entity({ name: activityTableConstant.TBL_ERROR_LOG })
export class ErrorLogEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int', unsigned: true })
    id: number;
    @Column({ type: 'integer', unsigned: true })
    user_id: number;
    @Column({  type: 'varchar', length: 255, nullable: true ,default: null })
    end_point: string;
    @Column({  type: 'varchar', length: 255, nullable: true ,default: null })
    message: string;
    @Column({ type: 'text',nullable: true ,default: null })
    log: string;
    @Column({ type: 'text',nullable: true ,default: null })
    req: string;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', onUpdate: 'CURRENT_TIMESTAMP', nullable: true, default: null })
    updated: Date;
}
