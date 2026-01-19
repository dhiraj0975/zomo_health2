import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
import { Enum } from '../../enum/enum';
;
@Entity(tableConstant.QUIZ.TBL_QZ_QUIZ_SECTIONS)
export class QuizSectionEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'varchar', length: 250 })
    name:  string;
    @Column({ type: 'text', nullable: true, default: null })
    description:  string;
    @Column({ type: 'int', nullable: true, default: null })
    quiz_id:  number;
    @Column({type: 'enum', enum: Enum, default: Enum.One, nullable: true })
    status: Enum;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_date: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    modified_date: Date;
}
