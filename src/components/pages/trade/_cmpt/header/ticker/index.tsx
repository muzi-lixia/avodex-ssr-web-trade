import React, { useCallback, useEffect, useMemo, useState, useContext } from "react";
import { observer } from "mobx-react-lite";
import { Hooks, Request, Util } from "@az/base";
const { useTranslation } = Hooks;
const { Big } = Util;

import useIntervalAsync from "hooks/useIntervalAsync";
import usePriceCurrencyConvert from "hooks/usePriceCurrencyConvert";
import useFormatBigNumber from "hooks/useFormatBigNumber";
import indentFormat from "@/hooks/indentFormat";
// import useUpDownClass from "hooks/useUpDownClass";
import { Context } from "@az/base";
import UseTickerChangeRate from "@az/UseTickerChangeRate";
import store from "store";
import { getOneByThreeStatus, point2Percent } from "utils/method";
import Socket from "utils/socket/public";
import { get_ticker24h } from "api/v4/market";

import useUpDownClassTicker from "hooks/useUpDownClassTicker";
import AzScrollArrow from "components/az/scroll/arrow";
import useCoinMemo from "components/pages/trade/_hook/useCoinMemo";
import Star from "components/pages/trade/_cmpt/market/container/star";

import styles from "./index.module.scss";

import { ClsUpDownEnum } from "store/app";
import { message, Popover, Switch } from "antd";
import cx from "classnames";
import Storage from "@/utils/storage";

export interface TickerProps {
  s: string; //市场名称, btc_usdt
  c: string; //当前价格, 100.000
  cr: string; //涨跌幅 0.0582 -> 5.8%
  cv: string; //价格变动值
  h: string; //24H最高价 25891.63
  l: string; //24H最低价 24188.76
  q: string; //24H成交数量 btc
  v: string; //24H成交金额 usdt
}

const Main: React.FC = () => {
  const t = useTranslation();
  const [appState] = useContext(Context.AzContext);
  const { isNumberIndent, setNumberFormat } = store.app;
  const { name, isEtf, etfConfigObj } = store.market;
  const { tradeRecent } = store.trade;
  const { getCurrencyDisplayName } = store.currency;

  const { getTicker } = UseTickerChangeRate();

  const { coinQuantityPrecisionMarket, coinPricePrecisionMarket } = useCoinMemo();

  const [initTitle, setInitTitle] = useState<string>();
  useEffect(() => {
    setInitTitle(document.title);
  }, []);

  const [originTicker, setTicker] = useState<TickerProps>();
  const ticker = useMemo(() => {
    return getTicker(originTicker);
  }, [originTicker, getTicker]);

  const tickerShadow = useMemo(() => {
    if (!tradeRecent) return;
    return {
      s: name,
      c: tradeRecent.p,
      cv: tradeRecent.b ? "1" : "-1",
    };
  }, [tradeRecent]);
  const priceCls = useUpDownClassTicker(tickerShadow);
  useEffect(() => {
    const ary = [initTitle]; // store.market.formatName(name),
    if (tradeRecent) {
      ary.unshift(indentFormat(tradeRecent.p || "0"));
    }

    document.title = ary.join(" | ");
  }, [name, tradeRecent, store.app.isNumberIndent]);

  const apiReq = useCallback(async () => {
    // console.log("Request.AzAxios.asyncAwait ----------> get_ticker24h");
    const { err, data } = await Request.AzAxios.asyncAwait(get_ticker24h, {
      params: { symbol: name },
    });
    if (!err && data && data.length) {
      setTicker(data[0]);
    }
  }, [name]);
  const { clear } = useIntervalAsync(apiReq, 5e3);

  const getMessage = (market = name) => {
    return {
      event: `ticker@${market}`,
    };
  };
  const wsCallback = (data) => {
    // console.log("ticker@ ws data", data);
    if (data.s !== store.market.name) {
      console.log("ticker@ name !== data.s", store.market.name, data.s);
      return;
    }
    clear();
    setTicker(data);
  };
  useEffect(() => {
    const msg = { event: `ticker@${name}` };
    Socket.addChannel(msg, wsCallback);

    return () => {
      setTicker(undefined);
      Socket.removeChannel(msg);
    };
  }, [name]);

  const currentPriceConvert = usePriceCurrencyConvert({ value: tradeRecent ? tradeRecent.p : 0 });
  const volume_btc = useFormatBigNumber(ticker ? ticker.q : 0, coinQuantityPrecisionMarket);
  const volume_usdt = useFormatBigNumber(ticker ? ticker.v : 0, coinPricePrecisionMarket);

  const objCurrPrice = useMemo(() => {
    if (!tradeRecent) return { lab: "--", convert: "--" };

    // console.log("error----", ticker, coinPricePrecisionMarket);

    return {
      lab: indentFormat(Big(tradeRecent.p || 0).toFixedCy(coinPricePrecisionMarket)),
      convert: indentFormat(currentPriceConvert),
    };
  }, [tradeRecent, coinPricePrecisionMarket, currentPriceConvert, appState.currency, isNumberIndent]);
  const obj24hChange = useMemo(() => {
    if (!ticker) return {};

    const cls = getOneByThreeStatus({ gt: ClsUpDownEnum.up, lt: ClsUpDownEnum.down }, ticker.cv);
    const sign = getOneByThreeStatus({ gt: "+", lt: "", eq: "" }, ticker.cv);
    const cv = Big(ticker.cv || 0).toFixedCy(coinPricePrecisionMarket);
    const rise = Big(ticker.cr || 0)
      .times(100)
      .toFixed(2);

    return {
      cls,
      lab: `${indentFormat(cv)} ${sign}${rise}%`,
    };
  }, [ticker, coinPricePrecisionMarket, isNumberIndent]);
  const obj24hX = useMemo(() => {
    if (!ticker) return {};
    return {
      high: indentFormat(Big(ticker.h || 0).toFixedCy(coinPricePrecisionMarket)),
      low: indentFormat(Big(ticker.l || 0).toFixedCy(coinPricePrecisionMarket)),
    };
  }, [ticker, coinPricePrecisionMarket, isNumberIndent]);

  // etf显示 管理费率(日)
  const curEtfCurrency = useMemo(() => {
    return etfConfigObj?.[name];
  }, [name, etfConfigObj]);

  const elUl = (
    <div className={styles.contentUl}>
      <div>
        <p>{appState.basisTimeZone ? t("trade.change") : t("trade.24hChange")}</p>
        <div className={obj24hChange.cls}>{obj24hChange.lab}</div>
      </div>
      <div>
        <p>{t("trade.24HHigh")}</p>
        <div>{obj24hX.high}</div>
      </div>
      <div>
        <p>{t("trade.24HLow")}</p>
        <div>{obj24hX.low}</div>
      </div>
      <div>
        <p>{t("trade.homeMarketTradeUp") + `(${getCurrencyDisplayName(name.split("_")[0])})`}</p>
        <div>{indentFormat(volume_btc)}</div>
      </div>
      <div>
        <p>{t("trade.homeMarketTradeUp2") + `(${getCurrencyDisplayName(name.split("_")[1])})`}</p>
        <div>{indentFormat(volume_usdt)}</div>
      </div>
      {isEtf ? (
        <div>
          <p>{t("market.etf.manageRate")}</p>
          <div>{indentFormat(curEtfCurrency?.managementRate ? `${point2Percent(curEtfCurrency.managementRate)}%` : "")}</div>
        </div>
      ) : null}
    </div>
  );

  const [numberIndentOpen, setNumberIndentOpen] = useState(false);
  const closeGuide = useCallback(() => {
    setNumberIndentOpen(false);
    Storage.set("numberIndentGuide", 1);
  }, []);
  const setGuide = useCallback(() => {
    setNumberFormat();
    closeGuide();
    message.success(t("trade.indentationFormatSetSuccess"));
  }, [setNumberFormat, closeGuide]);
  useEffect(() => {
    if (Storage.get("numberIndentGuide") || isNumberIndent) return;
    if (!tradeRecent || !tradeRecent.p) return;
    const decimalPart = tradeRecent.p.split(".")[1];
    if (!decimalPart) return;
    if (decimalPart.length < 8) return;
    if (!/0{4,}/g.test(decimalPart)) return;
    setNumberIndentOpen(true);
  }, [tradeRecent]);
  useEffect(() => {
    if (!isNumberIndent) return;
    closeGuide();
  }, [isNumberIndent]);

  if (store.app.isH5) {
    return (
      <>
        <div className={styles.h5TickerPrice}>
          <span className={obj24hChange.cls}>{objCurrPrice.lab}</span>
          {obj24hChange.lab && <span className={obj24hChange.cls}>{obj24hChange.lab}</span>}
        </div>
        {store.trade.isH5Expanded && <div className={styles.h5TickerDetail}>{elUl}</div>}
      </>
    );
  }

  return (
    <>
      <Star symbol={name} className={styles.star} placement="bottomLeft" isStarEmpty={true} />

      <div className={styles.price}>
        <Popover
          open={numberIndentOpen}
          placement="bottomLeft"
          overlayClassName={styles.popover}
          content={
            <div className={styles.popoverContent}>
              <div>
                <p>{t("trade.indentationFormatTitle")}</p>
                <div>{t("trade.indentationFormatDesc1")}</div>
                <div>{t("trade.indentationFormatDesc2")}</div>
              </div>
              <div>
                <button className={cx("btnTxt")} onClick={closeGuide}>
                  {t("trade.notSet")}
                </button>
                <button className={cx("btnTxt")} onClick={setGuide}>
                  {t("trade.setUpNow")}
                </button>
              </div>
            </div>
          }
        >
          <p className={priceCls}>{objCurrPrice.lab}</p>
        </Popover>
        <div>{objCurrPrice.convert}</div>
      </div>

      <AzScrollArrow resetEffect={name} className={styles.content}>
        {elUl}
      </AzScrollArrow>
    </>
  );
};

export default observer(Main);
