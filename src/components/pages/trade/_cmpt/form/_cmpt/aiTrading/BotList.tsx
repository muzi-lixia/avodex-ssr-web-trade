import React from "react";
import cx from "classnames";
import { Hooks } from "@az/base";
import styles from "./index.module.scss";

const { useTranslation } = Hooks;

interface BotItem {
  id: string;
  titleKey: string;
  subtitleKey: string;
  icon: React.ReactNode;
  comingSoon: boolean;
}

const BOTS: BotItem[] = [
  {
    id: "grid",
    titleKey: "gridBot.spotGrid",
    subtitleKey: "gridBot.spotGridSub",
    icon: <span className={styles.botIcon}>📈</span>,
    comingSoon: false,
  },
  {
    id: "martingale",
    titleKey: "gridBot.martingale",
    subtitleKey: "gridBot.martingaleSub",
    icon: <span className={styles.botIcon}>$</span>,
    comingSoon: true,
  },
  {
    id: "dca",
    titleKey: "gridBot.dca",
    subtitleKey: "gridBot.dcaSub",
    icon: <span className={styles.botIcon}>🪙</span>,
    comingSoon: true,
  },
];

interface Props {
  onSelectGrid: () => void;
}

const BotList: React.FC<Props> = ({ onSelectGrid }) => {
  const t = useTranslation();

  return (
    <div className={styles.botList}>
      <div className={styles.sectionTitle}>{t("gridBot.popularBots")}</div>
      {BOTS.map((bot) => (
        <div key={bot.id} className={cx(styles.botCard, { [styles.disabled]: bot.comingSoon })}>
          <div className={styles.botMeta}>
            <div className={styles.botTitleRow}>
              {bot.icon}
              <span className={styles.botTitle}>{t(bot.titleKey)}</span>
            </div>
            <div className={styles.botSubtitle}>{t(bot.subtitleKey)}</div>
          </div>
          {bot.comingSoon ? (
            <span className={styles.comingSoon}>{t("gridBot.comingSoon")}</span>
          ) : (
            <button className={styles.createBtn} onClick={onSelectGrid}>
              {t("gridBot.create")}
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default BotList;
