import React from "react";
import { Hooks } from "@az/base";
import styles from "./index.module.scss";

const { useTranslation } = Hooks;

export interface ConfirmParams {
  pair: string;
  minPrice: string;
  maxPrice: string;
  gridCount: number;
  perGridProfit: string;
  investment: string;
  estimatedFee: string;
  currency: string;
}

interface Props {
  open: boolean;
  params: ConfirmParams;
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmModal: React.FC<Props> = ({ open, params, onCancel, onConfirm }) => {
  const t = useTranslation();

  if (!open) return null;

  return (
    <div className={styles.confirmOverlay} onClick={onCancel}>
      <div className={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
        <div className={styles.confirmHeader}>
          <span className={styles.confirmTitle}>{t("gridBot.confirmTitle")}</span>
          <button className={styles.confirmClose} onClick={onCancel} aria-label="close">
            ×
          </button>
        </div>

        <div className={styles.confirmRow}>
          <span className={styles.confirmLabel}>{t("gridBot.confirmPair")}</span>
          <span className={styles.confirmValue}>{params.pair}</span>
        </div>
        <div className={styles.confirmRow}>
          <span className={styles.confirmLabel}>{t("gridBot.confirmMinPrice")}</span>
          <span className={styles.confirmValue}>
            {params.minPrice} {params.currency}
          </span>
        </div>
        <div className={styles.confirmRow}>
          <span className={styles.confirmLabel}>{t("gridBot.confirmMaxPrice")}</span>
          <span className={styles.confirmValue}>
            {params.maxPrice} {params.currency}
          </span>
        </div>
        <div className={styles.confirmRow}>
          <span className={styles.confirmLabel}>{t("gridBot.confirmGridCount")}</span>
          <span className={styles.confirmValue}>
            {params.gridCount} {t("gridBot.confirmGridUnit")}
          </span>
        </div>
        <div className={styles.confirmRow}>
          <span className={styles.confirmLabel}>{t("gridBot.confirmPerGridProfit")}</span>
          <span className={styles.confirmValue}>≈ {params.perGridProfit}</span>
        </div>

        <div className={styles.confirmDivider} />

        <div className={styles.confirmRow}>
          <span className={styles.confirmLabel}>{t("gridBot.confirmInvestment")}</span>
          <span className={styles.confirmValue}>
            {params.investment} {params.currency}
          </span>
        </div>
        <div className={styles.confirmRow}>
          <span className={styles.confirmLabel}>{t("gridBot.confirmEstimatedFee")}</span>
          <span className={styles.confirmValue}>
            ≈ {params.estimatedFee} {params.currency}
          </span>
        </div>

        <div className={styles.confirmDivider} />

        <div className={styles.confirmWarning}>⚠ {t("gridBot.confirmRiskTip")}</div>

        <div className={styles.confirmActions}>
          <button className={styles.confirmBtnCancel} onClick={onCancel}>
            {t("gridBot.confirmCancel")}
          </button>
          <button className={styles.confirmBtnSubmit} onClick={onConfirm}>
            {t("gridBot.confirmSubmit")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
