import React, { useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react-lite";
import cx from "classnames";
import { Hooks } from "@az/base";
import SvgIcon from "@az/SvgIcon";
import store from "store";
import ConfirmModal from "./ConfirmModal";
import SvgSmartParam from "@/assets/icon-svg/gridBot/smart-param.svg";
import { get_balance, post_createBot, post_profitPreview, post_smartParams, type BalanceRes, type ProfitPreviewRes } from "@/api/grid";
import styles from "./index.module.scss";

const { useTranslation } = Hooks;

interface Props {
  onBack: () => void;
}

const GRID_MIN = 2;
const GRID_MAX = 500;

const CreateForm: React.FC<Props> = ({ onBack }) => {
  const t = useTranslation();
  const { isH5 } = store.app;
  const { name } = store.market;
  const { tickers } = store.trade;
  const { isLogin } = store.user;
  const symbolTicker = name || "btc_usdt";
  const symbolLabel = symbolTicker.replace("_", "/").toUpperCase();

  const change24h = useMemo(() => {
    const ticker = tickers.find((obj) => obj.s === name);
    const cvStr = ticker?.cv;
    const crStr = ticker?.cr;
    const cv = cvStr !== undefined ? parseFloat(cvStr) : 0;
    const cr = crStr !== undefined ? parseFloat(crStr) : 0;
    const cvSafe = Number.isNaN(cv) ? 0 : cv;
    const crSafe = Number.isNaN(cr) ? 0 : cr;
    const cvDisp = cvStr !== undefined && !Number.isNaN(cv) ? cvStr : "0";
    const sign = cvSafe > 0 ? "+" : "";
    return {
      text: `${cvDisp} ${sign}${(crSafe * 100).toFixed(2)}%`,
      isUp: cvSafe > 0,
      isDown: cvSafe < 0,
    };
  }, [tickers, name]);

  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [gridCount, setGridCount] = useState<string>("");
  const [preview, setPreview] = useState(false);
  const [investment, setInvestment] = useState<string>("");
  const [smart, setSmart] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [balance, setBalance] = useState<BalanceRes | null>(null);
  const [previewData, setPreviewData] = useState<ProfitPreviewRes | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLogin) return;
    get_balance("USDT")
      .then(setBalance)
      .catch(() => setBalance(null));
  }, [isLogin]);

  useEffect(() => {
    const lo = parseFloat(minPrice);
    const hi = parseFloat(maxPrice);
    const n = parseInt(gridCount, 10);
    if (!lo || !hi || !n || hi <= lo || n < GRID_MIN || n > GRID_MAX) {
      setPreviewData(null);
      return;
    }
    const timer = setTimeout(() => {
      post_profitPreview({
        symbol: symbolTicker,
        lower_price: minPrice,
        upper_price: maxPrice,
        grid_count: n,
      })
        .then(setPreviewData)
        .catch(() => setPreviewData(null));
    }, 300);
    return () => clearTimeout(timer);
  }, [minPrice, maxPrice, gridCount, symbolTicker]);

  const availableUsdt = useMemo(() => {
    const a = parseFloat(balance?.total_available || "");
    return Number.isFinite(a) ? a : 0;
  }, [balance]);

  const minInvestment = useMemo(() => {
    const m = parseFloat(previewData?.min_investment_usdt || "");
    return Number.isFinite(m) && m > 0 ? m : 0.56;
  }, [previewData]);

  const perGridProfit = previewData ? `${previewData.per_grid_profit_pct}%` : "--";

  const isValid = useMemo(() => {
    const lo = parseFloat(minPrice);
    const hi = parseFloat(maxPrice);
    const n = parseInt(gridCount, 10);
    const inv = parseFloat(investment);
    return lo > 0 && hi > lo && n >= GRID_MIN && n <= GRID_MAX && inv >= minInvestment;
  }, [minPrice, maxPrice, gridCount, investment]);

  const investPct = useMemo(() => {
    const inv = parseFloat(investment);
    if (!inv || availableUsdt <= 0) return 0;
    return Math.min(100, Math.max(0, (inv / availableUsdt) * 100));
  }, [investment]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = parseFloat(e.target.value);
    setInvestment(((availableUsdt * pct) / 100).toFixed(2));
  };

  const handleSmartClick = async () => {
    if (smart) {
      setSmart(false);
      return;
    }
    try {
      const res = await post_smartParams({
        symbol: symbolTicker,
        investment_usdt: investment,
      });
      setSmart(true);
      setMinPrice(res.lower_price);
      setMaxPrice(res.upper_price);
      setGridCount(String(res.grid_count));
    } catch (e) {
      console.error("smart-params failed", e);
    }
  };

  const handleCreateBot = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await post_createBot({
        symbol: symbolTicker,
        name: `${symbolLabel} ${t("gridBot.spotGrid")}`,
        lower_price: minPrice,
        upper_price: maxPrice,
        grid_count: parseInt(gridCount, 10),
        investment_usdt: parseFloat(investment).toFixed(2),
      });
      setConfirmOpen(false);
      onBack();
    } catch (e) {
      console.error("create bot failed", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.createForm}>
      {isH5 && (
        <div className={styles.formHeader}>
          <button className={styles.backBtn} onClick={onBack}>
            ←
          </button>
          <span className={styles.formTitle}>{t("gridBot.spotGrid")}</span>
        </div>
      )}

      {isH5 && (
        <div className={styles.subHeader}>
          <span className={styles.subLabel}>{t("gridBot.gridTrading")}</span>
          <span className={styles.subRight}>
            <span
              className={cx(styles.subChange, {
                [styles.subChangeUp]: change24h.isUp,
                [styles.subChangeDown]: change24h.isDown,
              })}
            >
              {change24h.text}
            </span>
            <span className={styles.subValue}>{symbolLabel} ▾</span>
          </span>
        </div>
      )}

      <div className={styles.fieldRow}>
        <span className={styles.fieldLabel}>{t("gridBot.priceRange")}（USDT）</span>
        <button className={styles.smartLink} onClick={handleSmartClick}>
          <SvgIcon className={styles.smartIcon} src={SvgSmartParam} />
          {t("gridBot.smartParam")}
        </button>
      </div>

      <div className={styles.priceInputs}>
        <input className={styles.input} type="number" placeholder={t("gridBot.minPrice")} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
        <span className={styles.priceSep}>-</span>
        <input className={styles.input} type="number" placeholder={t("gridBot.maxPrice")} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
      </div>

      <div className={styles.fieldRow}>
        <span className={styles.fieldLabel}>{t("gridBot.gridCount")}（2-500）</span>
        <label className={styles.checkbox}>
          <input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} />
          {t("gridBot.previewGrid")}
        </label>
      </div>

      <input
        className={cx(styles.input, styles.gridCountInput)}
        type="number"
        placeholder="2-500"
        value={gridCount}
        onChange={(e) => setGridCount(e.target.value)}
      />

      <div className={styles.fieldRow}>
        <span className={cx(styles.fieldLabel, styles.fieldLabelGray)}>{t("gridBot.perGridProfit")}</span>
        <span className={styles.fieldValue}>{perGridProfit}</span>
      </div>

      <div className={styles.investmentLabel}>
        {t("gridBot.totalInvestment")}（{t("gridBot.minInvestmentHint", { value: minInvestment })}）
      </div>

      <div className={styles.investmentRow}>
        <input className={styles.input} type="number" placeholder="0.00" value={investment} onChange={(e) => setInvestment(e.target.value)} />
        <span className={styles.unit}>USDT</span>
      </div>

      <div className={styles.sliderWrap} style={{ "--progress": `${investPct}%` } as React.CSSProperties}>
        <input className={styles.slider} type="range" min={0} max={100} step={1} value={investPct} onChange={handleSliderChange} />
      </div>

      <div className={styles.availableRow}>
        <span className={styles.availableLabel}>{t("gridBot.availableFunds")}</span>
        <span className={styles.availableValue}>{availableUsdt.toFixed(2)} USDT</span>
      </div>

      <button className={styles.submitBtn} disabled={!isValid} onClick={() => setConfirmOpen(true)}>
        {t("gridBot.createSymbolBot", { symbol: symbolLabel })}
      </button>

      <ConfirmModal
        open={confirmOpen}
        params={{
          pair: symbolLabel.replace("/", " / "),
          minPrice,
          maxPrice,
          gridCount: parseInt(gridCount, 10) || 0,
          perGridProfit,
          investment: parseFloat(investment).toFixed(2),
          estimatedFee: ((parseFloat(investment) || 0) * 0.002).toFixed(2),
          currency: "USDT",
        }}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleCreateBot}
      />
    </div>
  );
};

export default observer(CreateForm);
