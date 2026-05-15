import React, { useState } from "react";
import cx from "classnames";
import { Hooks } from "@az/base";
import styles from "./index.module.scss";

const { useTranslation } = Hooks;

const QUICK_OPTIONS = ["0.05", "0.2", "0.5", "1", "5"];
const AI_RECOMMEND = "0.0001";

interface Props {
  open: boolean;
  latestPrice: string;
  onCancel: () => void;
  onSave: (slippage: string, enabled: boolean) => void;
}

const SlippageDialog: React.FC<Props> = ({ open, latestPrice, onCancel, onSave }) => {
  const t = useTranslation();
  const [enabled, setEnabled] = useState(true);
  const [value, setValue] = useState(AI_RECOMMEND);

  if (!open) return null;

  const handleQuickSelect = (v: string) => {
    setValue(v);
  };

  return (
    <div className={styles.slippageOverlay} onClick={onCancel}>
      <div className={styles.slippageBox} onClick={(e) => e.stopPropagation()}>
        <div className={styles.slippageHeader}>
          <span className={styles.slippageTitle}>{t("gridBot.slippageTitle")}</span>
          <button className={styles.slippageBtnX} onClick={onCancel} aria-label="close">
            ×
          </button>
        </div>

        <div className={styles.slippageToggleRow}>
          <span className={styles.slippageToggleLabel}>{t("gridBot.slippageSetting")}</span>
          <button className={cx(styles.slippageToggle, { [styles.slippageToggleOn]: enabled })} onClick={() => setEnabled((v) => !v)} aria-pressed={enabled}>
            <span className={styles.slippageToggleKnob} />
          </button>
        </div>

        {enabled && (
          <>
            <div className={styles.slippageFieldLabel}>{t("gridBot.slippageLabel")}</div>
            <div className={styles.slippageInputWrap}>
              <input className={styles.slippageInput} type="number" value={value} onChange={(e) => setValue(e.target.value)} />
              <span className={styles.slippageInputUnit}>%</span>
            </div>

            <div className={styles.slippageQuickRow}>
              {QUICK_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  className={cx(styles.slippageQuickBtn, { [styles.slippageQuickBtnActive]: value === opt })}
                  onClick={() => handleQuickSelect(opt)}
                >
                  {opt}%
                </button>
              ))}
            </div>

            <div className={styles.slippageInfoBox}>
              <div className={styles.slippageInfoCol}>
                <span className={styles.slippageInfoLabel}>{t("gridBot.slippageAiRecommend")}</span>
                <span className={styles.slippageInfoLabel}>{t("gridBot.slippageLatestPrice")}</span>
              </div>
              <div className={cx(styles.slippageInfoCol, styles.slippageInfoColRight)}>
                <span className={styles.slippageInfoValue}>{AI_RECOMMEND}%</span>
                <span className={styles.slippageInfoValue}>{latestPrice}</span>
              </div>
            </div>
          </>
        )}

        <div className={styles.slippageHint}>{t("gridBot.slippageHint")}</div>

        <div className={styles.slippageActions}>
          <button className={styles.slippageBtnCancel} onClick={onCancel}>
            {t("gridBot.slippageCancel")}
          </button>
          <button className={styles.slippageBtnSave} onClick={() => onSave(value, enabled)}>
            {t("gridBot.slippageSave")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SlippageDialog;
