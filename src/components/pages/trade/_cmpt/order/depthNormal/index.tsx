import React, { HTMLAttributes, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import cx from "classnames";
import { Hooks, Util } from "@az/base";
import store from "store";
import Socket from "utils/socket/public";
import Storage from "utils/storage";
import { get_depth } from "api/v4/market";
// import { post_etfNetWorth } from "api/old/exapi/redemption";
import useTimeout from "hooks/useTimeout";
import useAxiosCancelFun from "hooks/useAxiosCancelFun";
import AzFontScale from "components/az/fontScale";
import AzLoading from "components/az/loading";
import AzScrollLay from "components/az/scroll/lay";
import AzScrollWindow from "components/az/scroll/window";
import DepthTotalUnitSwitch from "components/pages/trade/_cmpt/order/_cmpt/depthTotalUnitSwitch";
import useRecord from "hooks/useRecord";

import CMPT_Option from "../option";
import CMPT_List from "../list";
import CMPT_Recent from "../recent";

import styles from "./index.module.scss";

import { BreakpointEnum, LayoutEnum } from "store/app";
import { DepthAryItemProps, DepthAryProps, LayoutAdvancedActiveKeyEnum, LayoutH5ActiveKeyEnum } from "store/trade";
import { LayEnum } from "../index";
// const { AzContext } = Context;
const { useTranslation } = Hooks;
const { Big } = Util;

interface WsDepthProps {
  s: string; //交易对
  a?: Array<Array<string>>; //卖盘数组
  b?: Array<Array<string>>; //买盘数组
  fi: number; //firstUpdateId 等于上一次推送的lastUpdateId + 1
  i: number; //lastUpdateId
}
interface apiDepthProps {
  asks: Array<Array<string>>; //卖盘数组
  bids: Array<Array<string>>; //买盘数组
  lastUpdateId: number; //lastUpdateId
  timestamp: number; //时间戳
}

interface Props extends HTMLAttributes<HTMLDivElement> {
  lay: LayEnum;
  setLay: (arg: LayEnum) => void;
}

const WindowUl: React.FC<any> = ({ startIndex = 0, record, depthType, maxAmount, openOrderObj, isOnly }) => {
  // console.log("record===", record);
  return record.map((item, index) => {
    return (
      <CMPT_List
        key={`${item[0]}`}
        style={isOnly ? { position: "absolute", top: (startIndex + index) * 20 + "px" } : undefined}
        ary={item}
        depthType={depthType}
        maxAmount={maxAmount}
        openOrderObj={openOrderObj}
      />
    );
  });
};

const Main: React.FC<Props> = ({ lay, setLay }) => {
  const t = useTranslation();
  const $log = useRecord("/components/pages/trade/_cmpt/order/depthNormal/index.tsx");

  const { breakpoint, layout, isH5 } = store.app;
  const { name, currentConfig, isEtf } = store.market;
  const { tradeRecent, depthAsks, depthBids, layoutAdvancedActiveKey, layoutH5ActiveKey, isDepthShowTotalPrice } = store.trade;
  const { openOrder } = store.balances;

  const coinSell = useMemo(() => {
    return store.currency.getCurrencyDisplayName(name.split("_")[0] || "");
  }, [name]);
  const coinBuy = useMemo(() => {
    return store.currency.getCurrencyDisplayName(name.split("_")[1] || "");
  }, [name]);
  const openOrderObj = useMemo<ObjAny>(() => {
    if (!openOrder || !openOrder.length) return {};

    const obj = {};
    openOrder.map((doc) => {
      if (doc.symbol !== name) return;
      obj[doc.price] = true;
    });
    return obj;
  }, [openOrder, name]); //当前挂单价格对象

  // const [lay, setLay] = useState<LayEnum>(LayEnum.ask2bid);
  const [loading, setLoading] = useState<boolean>(true);
  const setLoadingFalse = useCallback(() => setLoading(false), []);
  const [timeoutLoading, timeoutLoadingClear] = useTimeout(setLoadingFalse, { ms: 2000 });

  const isHasReady = useRef<boolean>(false); //该交易对是否有过一次正常连续情况
  const isCacheWs = useRef<boolean>(true); //是否缓存ws
  const wsCacheAry = useRef<WsDepthProps[]>([]); //ws缓存集合
  const wsLatest = useRef<WithUndefined<WsDepthProps>>(); //最新推送的ws

  const apiReqDepthArg = useMemo(() => {
    return {
      fn: get_depth,
      config: {
        params: {
          symbol: name,
          limit: 1000,
        },
      },
    };
  }, [name]);
  const apiReqDepth = useAxiosCancelFun(apiReqDepthArg);

  /*
  const cancelFun = useRef<any>();
  const apiReqDepth2 = useCallback(
    (callback) => {
      if (cancelFun.current) {
        cancelFun.current();
        cancelFun.current = null;
      }
      get_depth({
        params: {
          symbol: name,
          // limit: 50,
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
  const mixDepthArray = useCallback((array, newArray) => {
    const retAry = [...array];
    if (!newArray || !newArray.length) return retAry;
    newArray.map((ary) => {
      const price = ary[0];
      const num = +ary[1];
      const index = retAry.findIndex((tar) => {
        if (tar[0] === price) return true;
        if (tar[0] !== price && tar[0] == +price) {
          $log({
            desc: "@Depth data mix, format mismatch",
            data: {
              symbol: store.market.name,
              old: tar,
              new: ary,
              // oldAry: array,
              // newAry: newArray,
            },
          });
          /*
          console.error("depth_wsInfo");
          try {
            const old_depth_wsInfo = Storage.get("depth_wsInfo") || {};
            const new_depth_wsInfo = {
              count: +old_depth_wsInfo.count + 1 || 1,
              timestamp: Date.now(),
              symbol: store.market.name,
              old: tar,
              new: ary,
              oldAry: array,
              newAry: newArray,
            };
            Storage.set("depth_wsInfo", new_depth_wsInfo);
          } catch (e) {
            console.log(e);
          }
           */

          ary[0] = tar[0];
          return true;
        }
        return false;
      });

      if (num) {
        if (index < 0) {
          retAry.push(ary);
        } else {
          retAry.splice(index, 1, ary);
        }
      } else {
        if (index < 0) {
          //无
        } else {
          retAry.splice(index, 1);
        }
      }
    });
    return retAry;
  }, []); //盘口增量数据与当前数组进行混合，返回新数组
  /*
  const sumTotal = useCallback((array: Array<Array<string>>, isReverse?: boolean, dp?) => {
    const newAry: Array<Array<string>> = [];
    let ary: Array<string> = [];
    let count = "0";

    if (!isReverse) {
      for (let i = 0; i < array.length; i++) {
        ary = [...array[i].slice(0, 2)];
        count = Big(count)
          .plus(ary[1] || 0)
          .toFixed(dp);
        ary.push(count);
        newAry.push(ary);
      }
    } else {
      for (let i = array.length - 1; i >= 0; i--) {
        ary = [...array[i].slice(0, 2)];
        count = Big(count)
          .plus(ary[1] || 0)
          .toFixed(dp);
        ary.push(count);
        newAry.unshift(ary);
      }
    }

    return newAry;
  }, []); //统计累计数量，返回新数组，ary[2] 就是累计
   */
  interface sumTotalCfgProps {
    isReverse?: boolean;
    dpPrice?: number;
    dpAmount?: number;
  }
  const sumTotal = useCallback((array: Array<Array<string>> | DepthAryProps, cfg: sumTotalCfgProps = {}) => {
    const newAry: DepthAryProps = [];

    let price = "0"; //价格
    let amount = "0"; //数量
    let totalAmount = "0"; //累计数量
    let value = "0"; //价格*数量
    let totalValue = "0"; //累计(价格*数量)

    //产品 Ryan Ruan 要求切换成计价币种后精度固定6位，2024-07-30
    cfg.dpPrice = 6;

    if (!cfg.isReverse) {
      for (let i = 0; i < array.length; i++) {
        price = array[i][0] || "0";
        amount = array[i][1] || "0";
        value = Big(price).times(amount).toFixed();
        totalAmount = Big(totalAmount).plus(amount).toFixed();
        totalValue = Big(totalValue).plus(value).toFixed();

        newAry.push([price, amount, { value, totalAmount, totalValue }]);
      }
    } else {
      for (let i = array.length - 1; i >= 0; i--) {
        price = array[i][0] || "0";
        amount = array[i][1] || "0";
        value = Big(price).times(amount).toFixed();
        totalAmount = Big(totalAmount).plus(amount).toFixed();
        totalValue = Big(totalValue).plus(value).toFixed();

        newAry.unshift([price, amount, { value, totalAmount, totalValue }]);
      }
    }

    return newAry;
  }, []); //统计累计等信息，返回新数组
  const dataUpdate = useCallback((data: { asks?: Array<Array<string>>; bids?: Array<Array<string>> }, isFull?: boolean) => {
    const { asks, bids } = data;
    let retAsks, retBids;
    if (isFull) {
      retAsks = asks || [];
      retBids = bids || [];
    } else {
      retAsks = mixDepthArray(store.trade.depthAsks, asks);
      retBids = mixDepthArray(store.trade.depthBids, bids);
    }

    retAsks.sort((a, b) => b[0] - a[0]); //从大到小排序
    retBids.sort((a, b) => b[0] - a[0]); //从大到小排序

    //盘口倒挂判断
    if (retAsks.length && retBids.length && +retAsks[retAsks.length - 1][0] <= +retBids[0][0]) {
      $log({
        desc: "@Depth upside down",
        data: {
          symbol: store.market.name,
          isFull,
          // data,
          // depth: {
          //   asks: store.trade.depthAsks,
          //   bids: store.trade.depthBids,
          // },
        },
      });
      /*
      console.error("depth_upDown");
      try {
        const old_depth_upDown = Storage.get("depth_upDown") || {};
        const new_depth_upDown = {
          count: +old_depth_upDown.count + 1 || 1,
          timestamp: Date.now(),
          symbol: store.market.name,
          isFull,
          data,
          depth: {
            asks: store.trade.depthAsks,
            bids: store.trade.depthBids,
          },
        };
        Storage.set("depth_upDown", new_depth_upDown);
      } catch (e) {
        console.log(e);
      }
       */
      return true;
    }

    retAsks = sumTotal(retAsks, { isReverse: true });
    retBids = sumTotal(retBids);

    store.trade.updateState({
      depthAsks: retAsks,
      depthBids: retBids,
    });
  }, []); //数据更新
  const refRetryCount = useRef<number>(0);
  const spliceData = useCallback((data: WithUndefined<apiDepthProps>): true | undefined => {
    let index = 0;
    if (!data) return true;
    if (data && data.lastUpdateId) {
      if (!wsCacheAry.current.length) {
        wsLatest.current = {
          i: data.lastUpdateId,
          fi: data.lastUpdateId,
          s: name,
        };
        console.log("@Depth pure api data display");
      } else {
        let doc, isOK;
        for (let i = 0; i < wsCacheAry.current.length; i++) {
          doc = wsCacheAry.current[i];
          if (doc.fi - 1 === data.lastUpdateId) {
            index = i;
            isOK = true;
            break;
          }
          if (doc.i === data.lastUpdateId) {
            index = i + 1;
            isOK = true;
            break;
          }
        }
        if (!isOK) {
          $log({
            desc: "@Depth fail to splice api data with ws data",
            data: {
              name,
              // apiData: data,
              // wsCacheAry: wsCacheAry.current,
            },
          });
          // return retry();

          if (!isHasReady.current) {
            //如果从没有正常连续情况
            console.log("@Depth never success so display api data");
            isHasReady.current = true;
            dataUpdate(data, true);
          }

          return true;
        }
        console.log("@Depth data splicing successful");
      }
    }

    let asks: Array<Array<string>> = [],
      bids: Array<Array<string>> = [];
    if (data) {
      asks = data.asks;
      bids = data.bids;
    }

    for (let i = index; i < wsCacheAry.current.length; i++) {
      asks = mixDepthArray(asks, wsCacheAry.current[i].a);
      bids = mixDepthArray(bids, wsCacheAry.current[i].b);
    }

    const isErr = dataUpdate({ asks, bids }, true);
    if (isErr) return true;

    isCacheWs.current = false;
    wsCacheAry.current = [];

    refRetryCount.current = 0;
    isHasReady.current = true;
  }, []); //数据拼接
  const refRetryTimeout = useRef<number>();
  const retry = useCallback(() => {
    isCacheWs.current = true;
    // wsCacheAry.current = data ? [data] : [];
    // wsLatest.current = data;
    console.log("@Depth retry", refRetryTimeout.current);

    if (refRetryTimeout.current) return;
    refRetryCount.current = refRetryCount.current + 1;
    refRetryTimeout.current = window.setTimeout(() => {
      refRetryTimeout.current = 0;
      apiReqDepth(({ err, data, config }) => {
        console.log("@Depth retry api data", data);
        if (!(config && config.params && config.params.symbol === store.market.name)) {
          console.log("@Depth retry config.params.symbol !== name", config.params.symbol, store.market.name);
          return;
        }
        const rst = spliceData(err ? undefined : data);
        rst && retry();
      });
    }, (refRetryCount.current > 3 ? 3 : refRetryCount.current) * 200);
  }, [apiReqDepth, spliceData]);
  useEffect(() => {
    isHasReady.current = false;
    refRetryCount.current = 0;
    if (refRetryTimeout.current) {
      clearTimeout(refRetryTimeout.current);
      refRetryTimeout.current = 0;
    }
  }, [name]);

  const wsCallback = (data: WsDepthProps) => {
    // console.log("depth_update@ ws data", data);
    if (data.s !== store.market.name) {
      console.log("@Depth wsCb name !== data.s", store.market.name, data.s);
      return;
    }
    if (wsLatest.current && wsLatest.current.i !== data.fi - 1) {
      $log({
        desc: "@Depth ws data is not continuous",
        data: {
          name,
          wsLatest: wsLatest.current,
          ws: data,
        },
      });
      wsCacheAry.current = [data];
      wsLatest.current = data;
      return retry();
    }
    wsLatest.current = data;
    // console.log("wsCacheAry=", wsCacheAry.current);
    if (isCacheWs.current) return wsCacheAry.current.push(data);

    const isErr = dataUpdate({
      asks: data.a,
      bids: data.b,
    });
    if (isErr) {
      wsCacheAry.current = [data];
      wsLatest.current = data;
      return retry();
    }
  };

  const [depthMerge, setDepthMerge] = useState<string>();
  const depthMergeFixed = useMemo<number>(() => {
    if (!depthMerge) return 0;
    const str = depthMerge.split(".")[1];
    return str ? str.length : 0;
  }, [depthMerge]);
  /*
  const depthMergeFun = useCallback(
    (depthAry: DepthAryProps, rm: number, isReverse: boolean) => {
      if (!depthMerge) return depthAry;
      const { pricePrecision, quantityPrecision } = currentConfig;
      const retAry: Array<Array<string>> = [];
      depthAry.map((ary) => {
        const price = Big(
          Big(ary[0] || 0)
            .div(depthMerge)
            .toFixed(0, rm)
        )
          .times(depthMerge)
          .toFixed(depthMergeFixed);
        const lastRetAry = retAry[retAry.length - 1];
        if (lastRetAry) {
          if (price === lastRetAry[0]) {
            lastRetAry[1] = Big(lastRetAry[1] || 0)
              .plus(ary[1] || 0)
              .toFixed(quantityPrecision);
            // lastRetAry[2] = Big(lastRetAry[2] || 0).plus(ary[2] || 0).toFixed(quantityPrecision);
            return;
          }
        }

        retAry.push([price, Big(ary[1] || 0).toFixed(quantityPrecision)]);
      });
      // return retAry;
      return sumTotal(retAry, { isReverse, dpPrice: pricePrecision, dpAmount: quantityPrecision });
    },
    [depthMerge, depthMergeFixed, currentConfig, sumTotal]
  );
   */
  const depthMergeFun = useCallback(
    (depthAry: DepthAryProps, rm: number, isReverse: boolean) => {
      if (!depthMerge) return depthAry;
      const { pricePrecision, quantityPrecision } = currentConfig;
      const retAry: DepthAryProps = [];
      depthAry.map((ary) => {
        const price = Big(
          Big(ary[0] || 0)
            .div(depthMerge)
            .toFixed(0, rm)
        )
          .times(depthMerge)
          .toFixed(depthMergeFixed);
        const lastRetAry = retAry[retAry.length - 1];
        if (lastRetAry) {
          if (price === lastRetAry[0]) {
            lastRetAry[1] = Big(lastRetAry[1] || 0)
              .plus(ary[1] || 0)
              .toFixed(quantityPrecision);
            !isReverse && (lastRetAry[2].totalAmount = ary[2].totalAmount);
            lastRetAry[2].value = Big(lastRetAry[2].value || 0)
              .plus(ary[2].value || 0)
              .toFixed();
            !isReverse && (lastRetAry[2].totalValue = ary[2].totalValue);
            return;
          }
        }

        const newAry: DepthAryItemProps = [
          ary[0],
          ary[1],
          {
            totalAmount: ary[2].totalAmount,
            value: ary[2].value,
            totalValue: ary[2].totalValue,
          },
        ];
        newAry[0] = price;
        retAry.push(newAry);
      });
      return retAry;
    },
    [depthMerge, depthMergeFixed, currentConfig, sumTotal]
  );
  const depthAsksWithMerge = useMemo(() => {
    if (!depthAsks) return depthAsks;
    return depthMergeFun(depthAsks, 3, true);
  }, [depthMergeFun, depthAsks]);
  const depthBidsWithMerge = useMemo(() => {
    if (!depthBids) return depthBids;
    return depthMergeFun(depthBids, 0, false);
  }, [depthMergeFun, depthBids]);
  const asksMaxAmount = useMemo<number>(() => {
    let max = 0;
    (depthAsksWithMerge || []).map((item: any[]) => {
      if (item[1] - max > 0) max = +item[1];
    });
    return max;
  }, [depthAsksWithMerge]); //卖方最大数量
  const bidsMaxAmount = useMemo<number>(() => {
    let max = 0;
    (depthBidsWithMerge || []).map((item: any[]) => {
      if (item[1] - max > 0) max = +item[1];
    });
    return max;
  }, [depthBidsWithMerge]); //买方最大数量

  const [askRecord, setAskRecord] = useState<any[]>();
  const [bidRecord, setBidRecord] = useState<any[]>();
  const maxTotalAmount = useMemo<number>(() => {
    if (lay === LayEnum.ask2bid) {
      let askTotalAmount = 0;
      if (askRecord && askRecord[0] && askRecord[0][2] && askRecord[0][2].totalAmount) askTotalAmount = +askRecord[0][2].totalAmount;
      let bidTotalAmount = 0;
      if (
        bidRecord &&
        bidRecord.length &&
        bidRecord[bidRecord.length - 1] &&
        bidRecord[bidRecord.length - 1][2] &&
        bidRecord[bidRecord.length - 1][2].totalAmount
      )
        bidTotalAmount = +bidRecord[bidRecord.length - 1][2].totalAmount;
      // console.log(`${store.market.name} maxTotalAmount =`, Math.max(askTotalAmount, bidTotalAmount));
      return Math.max(askTotalAmount, bidTotalAmount);
    }
    if (lay === LayEnum.ask) {
      if (depthAsksWithMerge && depthAsksWithMerge[0] && depthAsksWithMerge[0][2] && depthAsksWithMerge[0][2].totalAmount)
        return +depthAsksWithMerge[0][2].totalAmount;
    }
    if (lay === LayEnum.bid) {
      if (
        depthBidsWithMerge &&
        depthBidsWithMerge.length &&
        depthBidsWithMerge[depthBidsWithMerge.length - 1] &&
        depthBidsWithMerge[depthBidsWithMerge.length - 1][2] &&
        depthBidsWithMerge[depthBidsWithMerge.length - 1][2].totalAmount
      )
        return +depthBidsWithMerge[depthBidsWithMerge.length - 1][2].totalAmount;
    }

    return 0;
  }, [lay, askRecord, bidRecord, depthAsksWithMerge, depthBidsWithMerge]);

  useEffect(() => {
    console.log("@Depth name=", name);
    const msg = { event: `depth_update@${name}` };

    Socket.addChannel(msg, wsCallback);
    const cancelFun = apiReqDepth(({ err, data, config }) => {
      console.log("@Depth first api response", { err, data, config });
      if (store.market.name !== name) return;
      if (!(config && config.params && config.params.symbol === name)) {
        console.log("@Depth first api response config.params.symbol !== name", config.params.symbol, name);
        return;
      }
      const rst = spliceData(err ? undefined : data);
      rst && retry();
      timeoutLoading();
    });

    return () => {
      // if (cancelFun.current) {
      //   cancelFun.current();
      //   cancelFun.current = null;
      // }
      console.log("@Depth remove name=", name);
      cancelFun && cancelFun.current && cancelFun.current();
      timeoutLoadingClear();
      isCacheWs.current = true;
      wsCacheAry.current = [];
      wsLatest.current = undefined;

      setLoading(true);
      Socket.removeChannel(msg);
      store.trade.updateState({ depthAsks: undefined, depthBids: undefined });
    };
  }, [name]);
  useEffect(() => {
    if (loading && tradeRecent !== undefined && (depthAsks || depthBids)) {
      timeoutLoadingClear();
      setLoadingFalse();
    }
  }, [tradeRecent, depthAsks, depthBids]);

  // const apiReqEtfNetWorth = useCallback(() => {
  //   post_etfNetWorth({
  //     data: qs.stringify({ dealPair: name }),
  //   }).then((netWorth) => {
  //     store.market.updateState({ netWorth });
  //   });
  // }, [name]);
  // const [timeoutEtfNetWorth, timeoutEtfNetWorthClear] = useTimeout(apiReqEtfNetWorth, { ms: 5000, isLoop: true, isInitExec: true });
  // useEffect(() => {
  //   store.market.updateState({ netWorth: "" });
  // }, [name]);
  // useEffect(() => {
  //   timeoutEtfNetWorthClear();
  //   if (isEtf) {
  //     // console.log("is etf timeoutEtfNetWorth");
  //     timeoutEtfNetWorth();
  //   }
  // }, [name, isEtf]);

  const isHide = useMemo(() => {
    //isH5 - 新设计中订单簿始终显示
    if (breakpoint === BreakpointEnum.sm) {
      return false;
    }
    //专业版布局
    if (layout === LayoutEnum.advanced) {
      if (breakpoint === BreakpointEnum.xl) return false;
      if (layoutAdvancedActiveKey !== LayoutAdvancedActiveKeyEnum.order) return true;
      else return false;
    }

    return false;
  }, [breakpoint, layout, layoutAdvancedActiveKey]);
  if (isHide) return <></>;

  return (
    <div className={cx(styles.main, isH5 && styles.main_h5)}>
      {!isH5 && <CMPT_Option atvLay={lay} onLayChange={(lay) => setLay(lay)} depthMerge={depthMerge} setDepthMerge={setDepthMerge} />}
      <div className={styles.nav}>
        {isH5 ? (
          <>
            <div className={styles.navItem}>
              <span>{t("trade.price")}</span>
              {coinBuy.length < 7 && <span>({coinBuy})</span>}
            </div>
            <div className={styles.navItem}>
              <span>{t("trade.amount")}</span>
              {(isDepthShowTotalPrice ? coinBuy : coinSell).length < 7 && <span>({isDepthShowTotalPrice ? coinBuy : coinSell})</span>}
            </div>
          </>
        ) : (
          <>
            <AzFontScale isLoop>{t("trade.price") + (coinBuy.length < 7 ? `(${coinBuy})` : "")}</AzFontScale>
            <AzFontScale isLoop>{t("trade.amount") + (coinSell.length < 7 ? `(${isDepthShowTotalPrice ? coinBuy : coinSell})` : "")}</AzFontScale>
            <DepthTotalUnitSwitch />
          </>
        )}
      </div>

      <div className={styles.content}>
        {loading && <AzLoading />}
        {!loading && (
          <>
            {lay === LayEnum.ask2bid && (
              <>
                <AzScrollLay className={cx(styles.scrollWindowAsk)} height={20} dataAry={depthAsksWithMerge || []} isReverse={true} recordCb={setAskRecord}>
                  <WindowUl depthType={LayEnum.ask} maxAmount={maxTotalAmount} openOrderObj={openOrderObj} />
                </AzScrollLay>
                <CMPT_Recent />
                <AzScrollLay className={cx(styles.scrollWindowBid)} height={20} dataAry={depthBidsWithMerge || []} recordCb={setBidRecord}>
                  <WindowUl depthType={LayEnum.bid} maxAmount={maxTotalAmount} openOrderObj={openOrderObj} />
                </AzScrollLay>
              </>
            )}
            {lay === LayEnum.ask && (
              <>
                <AzScrollWindow className={cx(styles.scrollWindowOnlyAsk)} height={20} dataAry={depthAsksWithMerge || []} isScrollBottom>
                  <WindowUl depthType={LayEnum.ask} maxAmount={maxTotalAmount} openOrderObj={openOrderObj} isOnly />
                </AzScrollWindow>
                <CMPT_Recent />
              </>
            )}
            {lay === LayEnum.bid && (
              <>
                <CMPT_Recent />
                <AzScrollWindow className={cx(styles.scrollWindowOnlyBid)} height={20} dataAry={depthBidsWithMerge || []}>
                  <WindowUl depthType={LayEnum.bid} maxAmount={maxTotalAmount} openOrderObj={openOrderObj} isOnly />
                </AzScrollWindow>
              </>
            )}
          </>
        )}
      </div>
      {isH5 && <CMPT_Option atvLay={lay} onLayChange={(lay) => setLay(lay)} depthMerge={depthMerge} setDepthMerge={setDepthMerge} />}
    </div>
  );
};

export default observer(Main);
