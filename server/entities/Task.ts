import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User";

export type TaskType = "daily" | "weekly" | "social" | "achievement";

@Entity("tasks")
@Index(["type"])
@Index(["expiresAt"])
export class Task {
  @PrimaryColumn({ type: "varchar", length: 255 })
  id!: string;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "decimal", precision: 15, scale: 8 })
  reward!: number;

  @Column({
    type: "enum",
    enum: ["daily", "weekly", "social", "achievement"],
  })
  type!: TaskType;

  @Column({ type: "boolean", default: false })
  completed!: boolean;

  @Column({ type: "integer", default: 0 })
  progress!: number;

  @Column({ type: "integer", default: 1 })
  maxProgress!: number;

  @Column({ type: "timestamp", nullable: true })
  expiresAt!: Date;

  @Column({ type: "timestamp", nullable: true })
  claimedAt!: Date;

  @Column({ type: "varchar", length: 500, nullable: true })
  socialUrl!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Tasks are global templates
  // User-specific progress is tracked in UserTask entity
}
