import PromoBoardV9 from "@/components/promo-board-v9";
import styles from "./promo-board-soft.module.css";
import "./promo-board-mobile-fixes.css";

export default function PromoBoardPage() {
  return (
    <div className={styles.root}>
      <PromoBoardV9 />
    </div>
  );
}
