import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";

export type BadgePurchaseStatus = "pending" | "completed" | "failed";

@Entity("badge_purchases")
export class BadgePurchase {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text", name: "user_id" })
  userId!: string;

  @Column({ type: "varchar", length: 64, name: "wallet_address" })
  walletAddress!: string;

  @Column({
    type: "varchar",
    length: 120,
    unique: true,
    name: "transaction_hash",
  })
  transactionHash!: string;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 6,
    name: "amount_sol",
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  amountSol!: number;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    name: "amount_usd",
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  amountUsd!: number;

  @CreateDateColumn({ name: "purchase_date" })
  purchaseDate!: Date;


  @Column({
    type: "varchar",
    length: 20,
    default: "pending",
    enum: ["pending", "completed", "failed"],
    name: "status",
  })
  status!: BadgePurchaseStatus;

  // Relations
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;
}
