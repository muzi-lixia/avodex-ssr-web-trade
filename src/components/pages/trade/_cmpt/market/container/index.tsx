import React, { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { observer } from "mobx-react-lite";
import cx from "classnames";
// import { Hooks } from "@az/base";
// const { useTranslation } = Hooks;
import store from "store";
import Socket from "utils/socket/public";
import { get_ticker24h } from "api/v4/market";
import { get_search } from "api/v4/app";

import useTimeout from "hooks/useTimeout";
import AzLoading from "components/az/loading";
import AzScrollWindow from "components/az/scroll/window";
import AppDivNoData from "components/app/div/noData";
import List from "./list";

import styles from "./index.module.scss";

import { TabCfgProps } from "../tabs";

import { TickerProps } from "store/trade";

interface Props {
  keyword: string;
  sortBy: string | undefined;
  tabCfg: TabCfgProps;
  isShowVolume: boolean;
  isHidden?: boolean;
}

const WindowUl: React.FC<any> = ({ startIndex, record, isShowVolume, isSearch }) => {
  // console.log("List====", { startIndex, record });
  const [disabled, setDisabled] = useState(false);
  useEffect(() => {
    if (disabled)
      setTimeout(() => {
        setDisabled(false);
      }, 500);
  }, [disabled]);

  return record.map((item, index) => {
    return (
      <List
        key={`${item.s}-${startIndex + index}`}
        style={{ top: (startIndex + index) * 30 + "px" }}
        ticker={item}
        isShowVolume={isShowVolume}
        isSearch={isSearch}
        disabled={disabled}
        onClick={() => setDisabled(true)}
      />
    );
  });
};

const Main: React.FC<Props> = ({ keyword, sortBy, tabCfg, isShowVolume, isHidden }) => {
  // const t = useTranslation();
  const { config } = store.market;
  const { tickers, getTicker24h } = store.trade;
  const { isLogin, symbolStar } = store.user;

  const [searchList, setSearchList] = useState<any[]>([]);
  const [searchListLoading, setSearchListLoading] = useState<boolean>(false);
  const CancelFunRef = useRef<any>(null);
  const getSearchList = useCallback(() => {
    CancelFunRef.current && CancelFunRef.current();
    setSearchList([]);
    if (!keyword) {
      CancelFunRef.current = null;
      setSearchListLoading(false);
      return;
    }
    setSearchListLoading(true);
    get_search({
      params: {
        key: keyword,
        biz: 1,
      },
      cancelFun: (c) => (CancelFunRef.current = c),
    })
      .then((data) => {
        CancelFunRef.current = null;
        setSearchListLoading(false);

        if (data && data.categories && data.categories.length) {
          const spot = data.categories.find((obj) => obj.category == 1);
          if (spot && spot.dataList) setSearchList(spot.dataList);
        }
      })
      .catch((e) => {
        CancelFunRef.current = null;
        !e.isCancel && setSearchListLoading(false);
      });
  }, [keyword]);
  const timeoutInput = useRef<number>();
  useEffect(() => {
    timeoutInput.current = window.setTimeout(getSearchList, keyword ? 200 : 0);

    return () => {
      timeoutInput.current && window.clearTimeout(timeoutInput.current);
    };
  }, [keyword]);

  // const timeout = useRef<number>();
  // const timeoutApi = useRef<number>();
  const [loading, setLoading] = useState<boolean>(true);
  // const [resData, setResData] = useState<TickerProps[]>([]);

  const apiReqTicker24h = useCallback((callback) => {
    if (!store.market.config) return;
    getTicker24h(callback);
    /*
      let resData: TickerProps[] = [];
      get_ticker24h()
        .then((data) => {
          resData = data;
        })
        .catch(() => {
          //empty
        })
        .finally(() => {
          const ary: TickerProps[] = [];
          let doc: TickerProps;
          for (const va in store.market.config) {
            doc = resData.find((obj) => obj.s === va) || { s: va };
            ary.push(doc);
          }
          // setResData(ary);
          // console.log("=======apiReqTicker24h updateState", ary);
          store.trade.updateState({ tickers: ary });
          callback && callback(ary);
        });
        */
  }, []);
  const [apiReqTicker24hLoop, apiReqTicker24hLoopClear] = useTimeout(apiReqTicker24h, { ms: 5000, isLoop: true, isInitExec: false });
  // const apiReqTicker24hLoop = useCallback(() => {
  //   clearTimeout(timeoutApi.current);
  //   apiReqTicker24h((ary) => {
  //     setResData(ary);
  //   });
  //   timeoutApi.current = window.setTimeout(apiReqTicker24hLoop, 500);
  // }, [apiReqTicker24h]);

  // console.log("Socket.isReady =", Socket.isReady);
  const wsNotReadyApiLoop = useCallback(() => {
    // console.log("Socket.isReady -", Socket.isReady);
    !Socket.isReady && apiReqTicker24hLoop();
  }, [apiReqTicker24hLoop]);
  const [timeoutApiLoop, timeoutClearApiLoop] = useTimeout(wsNotReadyApiLoop, { ms: 300 });

  const wsCallback = useCallback((records) => {
    // timeout.current && clearTimeout(timeout.current);
    timeoutClearApiLoop();
    apiReqTicker24hLoopClear();
    // const newAry = [...resData];
    const newAry = [...store.trade.tickers];
    records.map((obj) => {
      const index = newAry.findIndex((doc) => doc.s === obj.s);
      if (index < 0) newAry.push(obj);
      else newAry.splice(index, 1, obj);
    });
    // setResData(newAry);
    store.trade.updateState({ tickers: newAry });
    // console.log("wsCallback", records, store.trade.tickers);
  }, []);

  const isSearch = useMemo(() => !!keyword, [keyword]);
  const doSortArray = useCallback(
    (records, sortBy) => {
      if (!config) return records;
      const isUserSort = !isSearch && tabCfg.key === "user";

      const newAry: TickerProps[] = (() => {
        if (!isUserSort) return [...records];

        const ary: TickerProps[] = [];
        symbolStar.map((symbol) => {
          const doc = records.find((obj) => obj.s === symbol);
          doc && ary.push(doc);
        });
        return ary;
      })();
      // console.log("doSortArray", sortBy, records[0] && records[0].s);

      newAry.sort((x, y) => {
        if (sortBy) {
          const ary = sortBy.split("_");
          if (ary[0] === "name") {
            if (ary[1] === "up") return strCompare(y.s, x.s);
            if (ary[1] === "down") return strCompare(x.s, y.s);
          }
          if (ary[0] === "price") {
            if (ary[1] === "up") return +(x.c || 0) - +(y.c || 0);
            if (ary[1] === "down") return +(y.c || 0) - +(x.c || 0);
          }
          if (ary[0] === "rate") {
            if (ary[1] === "up") return +(x.cr || 0) - +(y.cr || 0);
            if (ary[1] === "down") return +(y.cr || 0) - +(x.cr || 0);
          }
          if (ary[0] === "volume") {
            if (ary[1] === "up") return +(x.q || 0) - +(y.q || 0);
            if (ary[1] === "down") return +(y.q || 0) - +(x.q || 0);
          }
        }

        if (isUserSort) return 0;

        const s1 = config[x.s] ? +config[x.s].displayWeight || 0 : 0;
        const s2 = config[y.s] ? +config[y.s].displayWeight || 0 : 0;
        return s2 - s1;
      });

      return newAry;

      function strCompare(a, b) {
        a = a.toLowerCase();
        b = b.toLowerCase();
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
      }
    },
    [config, tabCfg, symbolStar, isSearch]
  );
  const filterKeyword = useCallback((records, keyword) => {
    return records.filter((item) => {
      const marketName = item.s;
      let str = keyword.replace(/\//g, "_");
      str = str.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
      return new RegExp(str, "i").test(marketName);
    });
  }, []);
  const filterHidden = useCallback(
    (records, tabCfg) => {
      if (tabCfg.noHidden) return records;

      if (!config) return [];

      const retAry: TickerProps[] = [];
      records.map((item) => {
        const marketName = item.s;
        const theMarket = config[marketName]; //找到市场的对应配置
        if (!store.market.isMarketVisible(theMarket, { allowSearch: false })) return;
        retAry.push(item);
      });

      return retAry;
    },
    [config]
  );
  const filterResData: TickerProps[] = useMemo(() => {
    if (!config || isSearch) {
      // console.error("【logErr】市场配置不存在 config");
      return [];
    }

    if (isSearch) {
      //搜索在全部市场模式下进行
      const records: TickerProps[] = [];

      tickers.map((item) => {
        const symbol = item.s;
        const theMarket = config[symbol]; //找到市场的对应配置
        if (!store.market.isMarketVisible(theMarket)) return; //剔除不存在或者隐藏
        records.push(item);
      });

      return records;
    }

    const { buyCoinAry } = tabCfg;

    const records: TickerProps[] = [];

    tickers.map((item) => {
      const symbol = item.s;

      if (tabCfg.key !== "etf") {
        const buyCoinName = symbol.split("_")[1];
        if (buyCoinAry && !buyCoinAry.includes(buyCoinName)) return; //usds分组下，剔除不属于的市场
      }

      if (tabCfg.key === "user" && !symbolStar.find((obj) => obj === symbol)) return;

      const theMarket = config[symbol]; //找到市场的对应配置
      if (!store.market.isMarketVisible(theMarket)) return; //剔除不存在或者隐藏

      if (tabCfg.key === "etf" && !store.market.isEtfSymbolFnNew(theMarket.symbol)) return;

      if (tabCfg.key === "zone") {
        //板块模式下，剔除不匹配的数据
        const { plates } = theMarket;
        if (!plates || !plates.length) return;
        if (tabCfg.plateId && !plates.includes(tabCfg.plateId)) return;
      }

      records.push(item);
    });

    return records;
  }, [tickers, config, tabCfg, symbolStar, isSearch]);
  const records: TickerProps[] = useMemo(() => {
    if (keyword) {
      if (!config) return [];
      const tickerObj = tickers.reduce((obj, item) => {
        const doc = config[item.s];
        if (doc) obj[doc.id + ""] = item;
        return obj;
      }, {});
      const records: TickerProps[] = [];
      searchList.map((item) => {
        const doc = tickerObj[item.bizId + ""];
        if (!doc) return;
        const marketCfg = config[doc.s];
        if (!store.market.isMarketVisible(marketCfg)) return;
        records.push(doc);
      });
      if (sortBy) return doSortArray(records, sortBy);
      return records;
    }

    const sortAry = doSortArray(filterResData, sortBy);
    if (keyword) return filterKeyword(sortAry, keyword);
    return filterHidden(sortAry, tabCfg);
  }, [keyword, sortBy, tabCfg, filterResData, doSortArray, filterKeyword, filterHidden, searchList, tickers, config]);

  const isInit = useRef(false);
  useEffect(() => {
    if (!config || isInit.current) return;
    console.log("=====Config change");
    // isInit.current = true;
    apiReqTicker24h(() => {
      setLoading(false);
      // setResData(ary);
    });
  }, [config]);
  useEffect(() => {
    if (loading) return;
    const msg = { event: `tickers` };
    Socket.addChannel(msg, wsCallback);
    timeoutApiLoop();
    // timeout.current && clearTimeout(timeout.current);
    // timeout.current = window.setTimeout(() => {
    //   !Socket.isReady && apiReqTicker24hLoop();
    // }, 300);

    return () => {
      Socket.removeChannel(msg);
      timeoutClearApiLoop();
      apiReqTicker24hLoopClear();
      // timeout.current && clearTimeout(timeout.current);
    };
  }, [loading]);
  useEffect(() => {
    if (tabCfg.key === "user") store.user.getSymbolStar();
  }, [tabCfg]);
  useEffect(() => {
    isLogin && store.user.getSymbolStar();
  }, [isLogin]);

  return (
    <>
      {(loading || searchListLoading) && <AzLoading className={styles.loading} />}
      {!loading && !searchListLoading && !records.length && <AppDivNoData />}
      {!loading && !searchListLoading && !!records.length && (
        <AzScrollWindow className={cx(styles.main)} height={30} dataAry={records}>
          <WindowUl isShowVolume={isShowVolume} isSearch={isSearch} />
        </AzScrollWindow>
      )}
    </>
  );
};

export default observer(Main);
// export default Main;
