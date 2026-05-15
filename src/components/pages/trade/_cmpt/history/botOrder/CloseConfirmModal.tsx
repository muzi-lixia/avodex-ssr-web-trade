import React, { useState } from "react";
import cx from "classnames";
import { Hooks } from "@az/base";
import styles from "./index.module.scss";

const { useTranslation } = Hooks;

type SellMode = "auto" | "manual";

interface Props {
  open: boolean;
  pair: string;
  baseCurrency: string;
  quoteCurrency: string;
  onCancel: () => void;
  onConfirm: (mode: SellMode) => void;
  onOpenSlippage?: () => void;
}

const CloseConfirmModal: React.FC<Props> = ({ open, pair, baseCurrency, quoteCurrency, onCancel, onConfirm, onOpenSlippage }) => {
  const t = useTranslation();
  const [mode, setMode] = useState<SellMode>("auto");

  if (!open) return null;

  return (
    <div className={styles.closeOverlay} onClick={onCancel}>
      <div className={styles.closeBox} onClick={(e) => e.stopPropagation()}>
        <div className={styles.closeHeader}>
          <span className={styles.closeTitle}>{t("gridBot.closeConfirmTitle")}</span>
          <button className={styles.closeBtnX} onClick={onCancel} aria-label="close">
            ×
          </button>
        </div>

        <div className={styles.closeDesc}>{t("gridBot.closeConfirmDesc", { pair, baseCurrency, quoteCurrency })}</div>

        <div className={cx(styles.closeOption, styles.closeOptionAuto)} onClick={() => setMode("auto")}>
          <span className={cx(styles.closeRadio, { [styles.closeRadioChecked]: mode === "auto" })} />
          <div className={styles.closeOptionText}>
            <div className={styles.closeOptionTitle}>{t("gridBot.closeAutoSell")}</div>
            <button
              className={styles.closeOptionSubBtn}
              onClick={(e) => {
                e.stopPropagation();
                onOpenSlippage && onOpenSlippage();
              }}
            >
              {t("gridBot.closeAutoSellSub")} ›
            </button>
          </div>
        </div>

        <div className={styles.closeOptionManual} onClick={() => setMode("manual")}>
          <span className={cx(styles.closeRadio, { [styles.closeRadioChecked]: mode === "manual" })} />
          <span className={styles.closeOptionTitle}>{t("gridBot.closeManualSell")}</span>
        </div>

        <div className={styles.closeActions}>
          <button className={styles.closeBtnCancel} onClick={onCancel}>
            {t("gridBot.closeCancel")}
          </button>
          <button className={styles.closeBtnSubmit} onClick={() => onConfirm(mode)}>
            {t("gridBot.closeSubmit")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CloseConfirmModal;
