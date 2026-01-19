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
@Entity(tableConstant.QUIZ.TBL_QZ_HOTSPOT_QUESTIONS)
export class QuizHotspotQuestionEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    question_id: number;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    image1:  string;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    image2:  string;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    image3:  string;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    image4:  string;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    image5	:  string;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    image6:  string;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    image7:  string;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    image8:  string;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    image9:  string;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    numopts:  string;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    correct_block:  string;
    @Column({type: 'enum', enum: Enum, default: Enum.One, nullable: true })
    status: Enum;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
