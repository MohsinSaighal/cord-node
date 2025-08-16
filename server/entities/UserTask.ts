import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from "typeorm";
import { User } from "./User";

@Entity("user_tasks")
@Index(["userId", "taskId"])
@Unique(["userId", "taskId"])
export class UserTask {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  userId!: string;

  @Column({ name: "task_id", type: "varchar", length: 255 })
  taskId!: string;

  @Column({ name: "task_title", type: "varchar", length: 255, nullable: true })
  taskTitle!: string | null;

  @Column({ name: "task_type", type: "varchar", length: 50 })
  taskType!: string;

  @Column({ type: "boolean", default: false })
  completed!: boolean;

  @Column({ type: "integer", default: 0 })
  progress!: number;

  @Column({ 
    name: "claimed_at",
    type: "timestamp",
    nullable: true 
  })
  claimedAt!: Date | null;

  @Column({ 
    name: "reward_amount",
    type: "decimal", 
    precision: 15, 
    scale: 2, 
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value)
    }
  })
  reward!: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.userTasks, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;
}