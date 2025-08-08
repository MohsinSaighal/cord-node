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

  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "varchar", length: 255 })
  taskId!: string;

  @Column({ type: "boolean", default: false })
  completed!: boolean;

  @Column({ type: "integer", default: 0 })
  progress!: number;

  @Column({ type: "timestamp", nullable: true })
  claimedAt!: Date;

  @Column({ type: "decimal", precision: 15, scale: 8, default: 0 })
  reward!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.userTasks, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;
}