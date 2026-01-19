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
@Entity(tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_CLICK)
export class MediaFitnessVideoClickEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ nullable: true })
    v_id: number;
    @Column({ nullable: true })
    user_id: number;
    @Column({ nullable: true })
    activity_id: number;
    @Column('int')
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
