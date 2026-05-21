import React, { HTMLAttributes, useMemo } from "react";
import { observer } from "mobx-react-lite";
import cx from "classnames";
// import { Hooks } from "@az/base";
// const { useTranslation } = Hooks;
import store from "store";
import List from "../../container/list";

import styles from "./index.module.scss";

import { TickerProps } from "store/trade";

interface Props {
  records: string[];
  isShowVolume: boolean;
}

const Main: React.FC<Props> = ({ records, isShowVolume }) => {
  // const t = useTranslation();
  const { tickers } = store.trade;
  const { config } = store.market;

  const tickerAry = useMemo(() => {
    const ary: TickerProps[] = [];
    config &&
      records.map((marketName) => {
        const doc = tickers.find((obj) => obj.s === marketName);
        if (!doc) return;
        const theMarket = config[doc.s]; //找到市场的对应配置
        if (!store.market.isMarketVisible(theMarket, { allowSearch: false })) return; //剔除不存在或者隐藏
        ary.push(doc);
      });

    return ary;
  }, [records, tickers, config]);

  return (
    <>
      {tickerAry.map((ticker) => (
        <List key={ticker.s} ticker={ticker} isShowVolume={isShowVolume} isSearch={false} />
      ))}
    </>
  );
};

export default observer(Main);
// export default Main;
