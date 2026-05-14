import React, { HTMLAttributes, useState } from "react";
import { observer } from "mobx-react-lite";
import cx from "classnames";
import { Hooks, Util } from "@az/base";
import store from "store";
import CloseConfirmModal from "./CloseConfirmModal";
import styles from "./index.module.scss";

const { useTranslation } = Hooks;
const { getUrl } = Util;

interface BotOrderRow {
  id: string;
  name: string;
  pair: string;
  investment: string;
  investmentCurrency: string;
  profit: string;
  profitPercent: string;
  profitPositive: boolean;
  status: "running" | "closed";
}

const MOCK_ROWS: BotOrderRow[] = [
  {
    id: "1",
    name: "BVT/USDT 網格 (Hold to win)",
    pair: "BVT/USDT",
    investment: "10.00",
    investmentCurrency: "USDT",
    profit: "+0.09",
    profitPercent: "+0.89%",
    profitPositive: true,
    status: "running",
  },
  {
    id: "2",
    name: "BVT/USDT 網格 (Hold to win)",
    pair: "BVT/USDT",
    investment: "10.00",
    investmentCurrency: "USDT",
    profit: "+0.09",
    profitPercent: "+0.89%",
    profitPositive: true,
    status: "running",
  },
  {
    id: "3",
    name: "BVT/USDT 網格 (Hold to win)",
    pair: "BVT/USDT",
    investment: "10.00",
    investmentCurrency: "USDT",
    profit: "+0.09",
    profitPercent: "+0.89%",
    profitPositive: true,
    status: "running",
  },
];

interface Props extends HTMLAttributes<HTMLDivElement> {
  clsUl?: string;
  clsLi?: string;
}

// user-center accType 确认为 "grid-bot"（kebab-case，跟 open-order / node-avo 一致）
// TODO: 待 user-center P2 完成 grid-bot 路由 + 设计跳转参数（是否需要 id / 参数名 / 用 query 还是路径段）后回填
const goToBotDetail = (_botId: string) => {
  location.href = getUrl("/accounts/assets/wallet/grid-bot");
};

const Main: React.FC<Props> = ({ className, clsUl, clsLi }) => {
  const t = useTranslation();
  const { isH5 } = store.app;

  const [closeTarget, setCloseTarget] = useState<BotOrderRow | null>(null);
  const handleClose = (row: BotOrderRow) => setCloseTarget(row);
  const handleCloseCancel = () => setCloseTarget(null);
  const handleCloseConfirm = (_mode: "auto" | "manual") => {
    setCloseTarget(null);
  };

  const parsePair = (pair: string) => {
    const [base = "", quote = ""] = pair.split("/");
    return { base, quote };
  };

  if (isH5) {
    return (
      <div className={cx(styles.mobileMain, className)}>
        {MOCK_ROWS.map((row) => (
          <div key={row.id} className={styles.mobileCard}>
            <div className={styles.mobileCardHeader}>
              <span className={styles.mobileCardName}>{row.name}</span>
              <div className={styles.mobileCardActions}>
                <button className={styles.mobileActionDetail} onClick={() => goToBotDetail(row.id)}>
                  {t("gridBot.detail")}
                </button>
                <button className={styles.mobileActionClose} onClick={() => handleClose(row)}>
                  {t("gridBot.close")}
                </button>
              </div>
            </div>
            <div className={styles.mobileCardRow}>
              <span className={styles.mobileLabel}>{t("gridBot.colPair")}</span>
              <span className={styles.mobileValue}>{row.pair}</span>
            </div>
            <div className={styles.mobileCardRow}>
              <span className={styles.mobileLabel}>{t("gridBot.colInvestment")}</span>
              <span className={styles.mobileValue}>
                {row.investment} {row.investmentCurrency}
              </span>
            </div>
            <div className={styles.mobileCardRow}>
              <span className={styles.mobileLabel}>{t("gridBot.colProfit")}</span>
              <span className={row.profitPositive ? styles.mobileValueBuy : styles.mobileValueSell}>
                {row.profit}({row.profitPercent})
              </span>
            </div>
          </div>
        ))}
        {closeTarget && (
          <CloseConfirmModal
            open
            pair={closeTarget.pair}
            baseCurrency={parsePair(closeTarget.pair).base}
            quoteCurrency={parsePair(closeTarget.pair).quote}
            onCancel={handleCloseCancel}
            onConfirm={handleCloseConfirm}
          />
        )}
      </div>
    );
  }

  return (
    <div className={cx(styles.main, className)}>
      <div className={styles.nav}>
        <div className={cx(clsLi, styles.li)}>
          <div>{t("gridBot.colBotName")}</div>
          <div>{t("gridBot.colPair")}</div>
          <div>{t("gridBot.colInvestment")}</div>
          <div>{t("gridBot.colProfit")}</div>
          <div className={styles.actionCol}>{t("gridBot.colAction")}</div>
        </div>
      </div>

      <div className={cx(clsUl, styles.ul)}>
        <div className={styles.ulCon}>
          {MOCK_ROWS.map((row) => (
            <div key={row.id} className={cx(clsLi, styles.li)}>
              <div className={styles.nameCol}>
                <span className={styles.botAvatar} />
                <span className={styles.botName}>{row.name}</span>
              </div>
              <div>{row.pair}</div>
              <div>
                {row.investment} {row.investmentCurrency}
              </div>
              <div className={row.profitPositive ? styles.profitBuy : styles.profitSell}>
                {row.profit}({row.profitPercent})
              </div>
              <div className={styles.actionCol}>
                <button className={styles.actionDetail} onClick={() => goToBotDetail(row.id)}>
                  {t("gridBot.detail")}
                </button>
                <button className={styles.actionClose} onClick={() => handleClose(row)}>
                  {t("gridBot.close")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {closeTarget && (
        <CloseConfirmModal
          open
          pair={closeTarget.pair}
          baseCurrency={parsePair(closeTarget.pair).base}
          quoteCurrency={parsePair(closeTarget.pair).quote}
          onCancel={handleCloseCancel}
          onConfirm={handleCloseConfirm}
        />
      )}
    </div>
  );
};

export default observer(Main);
