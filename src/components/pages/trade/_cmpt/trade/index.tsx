import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import cx from "classnames";
import { Hooks } from "@az/base";
// const { AzContext } = Context;
const { useTranslation } = Hooks;
import store from "store";
import Socket from "utils/socket/public";
import { get_tradeRecent } from "api/v4/market";

import useAxiosCancelFun from "hooks/useAxiosCancelFun";
import AzFontScale from "components/az/fontScale";
import AzLoading from "components/az/loading";
import AzScrollWindow from "components/az/scroll/window";
import AppDivNoData from "components/app/div/noData";
import List from "./list";

import styles from "./index.module.scss";

import { BreakpointEnum, LayoutEnum } from "store/app";
import { TradeRecentProps, LayoutAdvancedActiveKeyEnum, LayoutH5ActiveKeyEnum } from "store/trade";

const WindowUl: React.FC<any> = ({ startIndex, record }) => {
  // console.log("List====", { startIndex, record });

  return record.map((item, index) => {
    return <List key={`${startIndex + index}`} style={{ top: (startIndex + index) * 20 + "px" }} doc={item} />;
  });
};

const Main: React.FC = () => {
  const t = useTranslation();

  const { breakpoint, layout } = store.app;
  const { name } = store.market;
  const { layoutAdvancedActiveKey, layoutH5ActiveKey } = store.trade;

  const coinSell = useMemo(() => {
    return store.currency.getCurrencyDisplayName(name.split("_")[0] || "");
  }, [name]);
  const coinBuy = useMemo(() => {
    return store.currency.getCurrencyDisplayName(name.split("_")[1] || "");
  }, [name]);

  const resDataRef = useRef<TradeRecentProps[]>([]);
  const [resData, setResData] = useState<TradeRecentProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const apiReqTradeRecentAry = useMemo(() => {
    return {
      fn: get_tradeRecent,
      config: {
        params: {
          symbol: name,
          limit: 100,
        },
      },
    };
  }, [name]);
  const apiReqTradeRecent = useAxiosCancelFun(apiReqTradeRecentAry);

  /*
  const cancelFun = useRef<any>();
  const apiReqTradeRecent2 = useCallback(
    (callback) => {
      if (cancelFun.current) {
        cancelFun.current();
        cancelFun.current = null;
      }
      get_tradeRecent({
        params: {
          symbol: name,
          limit: 100,
        },
        cancelFun: (c) => (cancelFun.current = c),
      })
        .then((data) => {
          callback && callback(data);
        })
        .catch((error) => {
          if (error.isCancel) return;
          callback && callback();
        })
        .finally(() => {
          cancelFun.current = null;
        });
    },
    [name]
  );
   */
  const wsCallback = useCallback((data) => {
    // console.log("trade@ ws data", data);
    if (data.s !== store.market.name) {
      console.log("trade@ name !== data.s", store.market.name, data.s);
      return;
    }
    const obj: any = { tradeRecent: data };
    if (!resDataRef.current.length) obj.tradeRecentOnce = data;
    store.trade.updateState(obj);

    const newAry = [data].concat(resDataRef.current).slice(0, 100);
    resDataRef.current = newAry;
    setResData(newAry);
  }, []);

  const refAddChannel = useRef<boolean>(false);
  useEffect(() => {
    console.log("trade@ add", name);
    const msg = { event: `trade@${name}` };

    refAddChannel.current = false;
    const cancelFun = apiReqTradeRecent(({ err, data, config }) => {
      console.log("trade@ config", config);
      if (store.market.name !== name) return;
      if (!(config && config.params && config.params.symbol === name)) {
        console.log("trade@ config.params.symbol !== name", config.params.symbol, name);
        return;
      }
      setLoading(false);
      const resData = err ? [] : data;
      resDataRef.current = resData;
      setResData(resData);
      resData[0] && (resData[0].s = name);
      store.trade.updateState({ tradeRecent: resData[0] || null, tradeRecentOnce: resData[0] || null });
      if (refAddChannel.current) return;
      console.log("trade@ addChannel", name);
      Socket.addChannel(msg, wsCallback);
      refAddChannel.current = true;
    });

    return () => {
      // if (cancelFun.current) {
      //   cancelFun.current();
      //   cancelFun.current = null;
      // }
      console.log("trade@ remove", name, refAddChannel.current);
      console.log("trade@ cancelFun", !!cancelFun.current);
      cancelFun && cancelFun.current && cancelFun.current();
      store.trade.updateState({ tradeRecent: undefined, tradeRecentOnce: undefined });
      resDataRef.current = [];
      setResData([]);
      setLoading(true);
      if (refAddChannel.current) Socket.removeChannel(msg);
    };
  }, [name]);

  const isHide = useMemo(() => {
    //isH5 - 新设计中仅展开时且tab为trade才显示
    if (breakpoint === BreakpointEnum.sm) {
      if (!store.trade.isH5Expanded || layoutH5ActiveKey !== LayoutH5ActiveKeyEnum.trade) return true;
      else return false;
    }
    //专业版布局
    if (layout === LayoutEnum.advanced) {
      if (breakpoint === BreakpointEnum.xl) return false;
      if (layoutAdvancedActiveKey !== LayoutAdvancedActiveKeyEnum.trade) return true;
      else return false;
    }

    return false;
  }, [breakpoint, layoutH5ActiveKey, layout, layoutAdvancedActiveKey, store.trade.isH5Expanded]);
  if (isHide) return <></>;

  return (
    <div className={styles.main}>
      <div className={styles.nav}>
        <AzFontScale isLoop>{t("trade.time")}</AzFontScale>
        <AzFontScale isLoop>{t("trade.price") + (coinBuy.length < 7 ? `(${coinBuy})` : "")}</AzFontScale>
        <AzFontScale isLoop>{t("trade.amount") + (coinSell.length < 7 ? `(${coinSell})` : "")}</AzFontScale>
      </div>
      <div className={styles.content}>
        {loading && <AzLoading />}
        {!loading && !resData.length && <AppDivNoData />}
        {!loading && !!resData.length && (
          <AzScrollWindow className={cx(styles.scrollWindow)} height={20} dataAry={resData}>
            <WindowUl />
          </AzScrollWindow>
        )}
      </div>
    </div>
  );
};

export default observer(Main);
