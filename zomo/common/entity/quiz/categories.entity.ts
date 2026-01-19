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
@Entity(tableConstant.QUIZ.TBL_QZ_CATEGORIES)
export class QuizCategoriesEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    name: string;
    @Column({ type: 'text', nullable: true, default: null })
    description:  string;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    modified_by:  string;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    created_by:  string;
    @Column({ type: 'int', nullable: false, default: 1 })
    status:  number;
    @Column({ type: 'varchar', length: 250, nullable: true, default: null })
    category_type:  string;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    modified: Date;
}
