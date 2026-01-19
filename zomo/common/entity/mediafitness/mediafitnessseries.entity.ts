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
@Entity(tableConstant.MEDIA_FITNESS.TBL_ME_FOD_SERIES)
export class MediaFitnessSeriesEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ nullable: true })
    s_id: number;
    @Column({ default: 0 })
    org_id: number;
    @Column({length: 501, nullable: true })
    code: string;
    @Column({ nullable: true })
    name: string;
    @Column({ nullable: true })
    img: string;
    @Column('int')
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
