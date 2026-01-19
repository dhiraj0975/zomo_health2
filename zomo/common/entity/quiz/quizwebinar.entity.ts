import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
@Entity({ name: tableConstant.QUIZ.TBL_QZ_WEBINAR })
export class QuizWebinarEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    title: string;
    @Column({ type: 'text', nullable: true, default: null })
    description: string;
    @Column({ type: 'text', nullable: true, default: null })
    vimeo_shareable_link: string;
    @Column({ type: 'text', nullable: true, default: null })
    embedded_link: string;
    @Column('date', { nullable: true, default: null })
    webinar_date: string;
    @Column({ type: 'int', nullable: false, default: 1 })
    status: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    is_default: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    deleted: number;
    @Column({ type: 'bigint', nullable: false, default: 0 })
    duration: number;
    @Column({ type: 'int' })
    created_by: number;
    @Column({ type: 'int', default: null })
    updated_by: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
