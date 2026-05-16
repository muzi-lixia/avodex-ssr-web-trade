import React, { HTMLAttributes, useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react-lite";
import cx from "classnames";
import { Hooks, Util } from "@az/base";
import store from "store";
import CloseConfirmModal from "./CloseConfirmModal";
import SlippageDialog from "./SlippageDialog";
import ImgBotAvatar from "@/assets/img/gridBot/bot-avatar.png";
import AppDivNoData from "@/components/app/div/noData";
import { delete_bot, get_bots, type BotListItem } from "@/api/grid";
import styles from "./index.module.scss";

const { useTranslation } = Hooks;
const { getUrl, Big } = Util;

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

const mapBotToRow = (b: BotListItem): BotOrderRow => {
  const quote = b.symbol.split("/")[1] || "USDT";
  const init = parseFloat(b.init_investment) || 0;
  const pnl = parseFloat(b.realized_pnl_usdt) || 0;
  const positive = pnl >= 0;
  const sign = pnl > 0 ? "+" : pnl < 0 ? "-" : "";
  const pct = init > 0 ? (Math.abs(pnl) / init) * 100 : 0;
  return {
    id: b.bot_id,
    name: b.name,
    pair: b.symbol,
    investment: Big(b.total_investment || b.init_investment || "0").toFixed(2),
    investmentCurrency: quote,
    profit: `${sign}${Math.abs(pnl).toFixed(4)}`,
    profitPercent: `${sign}${pct.toFixed(2)}%`,
    profitPositive: positive,
    status: b.status === "closed" ? "closed" : "running",
  };
};

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
  const { isLogin } = store.user;

  const [rows, setRows] = useState<BotOrderRow[]>([]);
  const [closeTarget, setCloseTarget] = useState<BotOrderRow | null>(null);
  const [slippageBps, setSlippageBps] = useState<number | undefined>(undefined);
  const [slippageOpen, setSlippageOpen] = useState(false);

  const reload = () => {
    if (!isLogin) {
      setRows([]);
      return;
    }
    get_bots({ status: "initializing,running,paused", limit: 50 })
      .then((res) => setRows((res?.list || []).map(mapBotToRow)))
      .catch(() => setRows([]));
  };

  useEffect(() => {
    reload();
  }, [isLogin]);

  const handleClose = (row: BotOrderRow) => setCloseTarget(row);
  const handleCloseCancel = () => {
    setCloseTarget(null);
    setSlippageOpen(false);
  };
  const handleCloseConfirm = async (mode: "auto" | "manual") => {
    if (!closeTarget) return;
    try {
      await delete_bot(closeTarget.id, {
        settlement_mode: mode === "auto" ? "auto_sell" : "keep_base",
        slippage_bps: mode === "auto" ? slippageBps : undefined,
      });
      reload();
    } catch (e) {
      console.error("close bot failed", e);
    } finally {
      setCloseTarget(null);
      setSlippageOpen(false);
    }
  };
  const handleOpenSlippage = () => setSlippageOpen(true);
  const handleSlippageCancel = () => setSlippageOpen(false);
  const handleSlippageSave = (slippage: string, _enabled: boolean) => {
    const bps = Math.round(parseFloat(slippage) * 100);
    setSlippageBps(Number.isFinite(bps) && bps >= 0 ? bps : undefined);
    setSlippageOpen(false);
  };

  const parsePair = (pair: string) => {
    const [base = "", quote = ""] = pair.split("/");
    return { base, quote };
  };

  const latestPrice = useMemo(() => {
    if (!closeTarget) return "--";
    const symbol = closeTarget.pair.replace("/", "_").toLowerCase();
    const ticker = store.trade.tickers.find((obj) => obj.s === symbol);
    const quote = parsePair(closeTarget.pair).quote;
    return ticker?.c ? `${ticker.c} ${quote}` : "--";
  }, [closeTarget, store.trade.tickers]);

  if (isH5) {
    return (
      <div className={cx(styles.mobileMain, className)}>
        {!rows.length && <AppDivNoData />}
        {rows.map((row) => (
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
            onOpenSlippage={handleOpenSlippage}
          />
        )}
        {slippageOpen && <SlippageDialog open latestPrice={latestPrice} onCancel={handleSlippageCancel} onSave={handleSlippageSave} />}
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
          {!rows.length && <AppDivNoData className={styles.noData} />}
          {rows.map((row) => (
            <div key={row.id} className={cx(clsLi, styles.li)}>
              <div className={styles.nameCol}>
                <span className={styles.botAvatar}>
                  <img className={styles.botAvatarImg} src={ImgBotAvatar} alt="" />
                </span>
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
          onOpenSlippage={handleOpenSlippage}
        />
      )}
      {slippageOpen && <SlippageDialog open latestPrice={latestPrice} onCancel={handleSlippageCancel} onSave={handleSlippageSave} />}
    </div>
  );
};

export default observer(Main);
