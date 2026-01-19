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
@Entity(tableConstant.MEDIA_FITNESS.TBL_ME_FOD_INSTRUCTOR)
export class MediaFitnessInstructorEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ nullable: true })
    e_id: number;
    @Column({ default: 0 })
    org_id: number;
    @Column({length: 251, nullable: true })
    first_name: string;
    @Column({length: 251, nullable: true })
    last_name: string;
    @Column({ nullable: true })
    full_name: string;
    @Column('int')
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
