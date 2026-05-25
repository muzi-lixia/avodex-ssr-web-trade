import React, { HTMLAttributes, useCallback, useEffect, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import { Context, Util } from "@az/base";
const { AzContext } = Context;
const { Big } = Util;
import store from "store";
import Storage from "utils/storage";
import Socket from "utils/socket/public";
import { thousands } from "utils/method";
import { get_kline } from "api/v4/market";
import { widget, ResolutionString } from "components/tradingview/v27/charting_library";

import tvConfig, { getTimezone } from "components/tradingview/v27/config";
import styles from "./index.module.scss";

export const TvIntervalToXtApi = {
  "1": "1m",
  "3": "3m",
  "5": "5m",
  "15": "15m",
  "30": "30m",
  "60": "1h",
  "120": "2h",
  "240": "4h",
  "360": "6h",
  "480": "8h",
  "720": "12h",
  "1D": "1d",
  "3D": "3d",
  "1W": "1w",
  "1M": "1M",
}; //tradingView内部周期对应xt接口请求参数，key: tv内部周期, value: 请求参数

import AzLoading from "components/az/loading";

// interface TvWidgetProps extends IChartingLibraryWidget {
//   xtSymbol: string;
// }

interface KlineProps {
  s?: string; //symbol 交易对
  i?: string; //interval 周期间隔
  t: number; //开盘时间(time)，毫秒
  o: string; //开盘价(open)
  c: string; //收盘价(close)
  h: string; //最高价(high)
  l: string; //最低价(low)
  q: string; //成交量(quantity)
  v: string; //成交额(volume)
}

import { OptionTradingViewProps, getOptionTradingView, ActionTradingViewProps } from "../../index";
import indentFormat from "@/hooks/indentFormat";
import useRecord from "@/hooks/useRecord";
interface Props extends HTMLAttributes<HTMLDivElement> {
  option: WithUndefined<OptionTradingViewProps>;
  action: WithUndefined<ActionTradingViewProps>;
  updateTv: () => void;
}

const Main: React.FC<Props> = ({ option, action, updateTv }) => {
  const $log = useRecord("/components/pages/trade/_cmpt/kline/tradingview/content/index.tsx");
  const [appState] = React.useContext(AzContext);
  const { isH5, isColorReverse } = store.app;
  const { name } = store.market;

  const [loading, setLoading] = useState<boolean>(true);
  const [tvWidget, setTvWidget] = useState<any>();

  const themeChange = useCallback(
    (theme) => {
      if (!tvWidget) return;
      tvWidget.changeTheme(theme === "dark" ? "Dark" : "Light");
      setTimeout(() => {
        console.log("tvWidget.applyOverrides = ", isColorReverse);
        tvWidget.applyOverrides(tvConfig({ theme, isColorReverse }).overrides);
      }, 0);
    },
    [tvWidget, isColorReverse]
  );
  const onChartDataLoaded = useCallback(() => {
    console.log("【tradingView】new symbol's data has been received.");
  }, []);
  const tvDataFormat = useCallback((obj: KlineProps) => {
    return {
      time: obj.t,
      open: +obj.o,
      high: +obj.h,
      low: +obj.l,
      close: +obj.c,
      volume: +obj.q,
      volume2: +obj.v,
    };
  }, []);
  const mixTradeRecent = useCallback((klineData, tradeData) => {
    const obj = { ...klineData };
    const { p } = tradeData;

    +p > +obj.h && (obj.h = p);
    +p < +obj.l && (obj.l = p);
    obj.c = p;

    return obj;
  }, []);

  const refKeyTimeoutFun = useRef<any>({});
  useEffect(() => {
    return () => {
      for (const va in refKeyTimeoutFun.current) {
        clearTimeout(refKeyTimeoutFun.current[va]);
      }
    };
  }, []);

  const refEndTime = useRef<number>();
  const refLatestKlineData = useRef<Record<string, KlineProps>>({});
  const refLastKlineData = useRef<Record<string, KlineProps>>({});
  const refResolution = useRef<Record<string, number>>({});
  const getBars = useCallback((symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) => {
    console.log("【TradingView】------->[getBars]", { symbolInfo, resolution, periodParams, onHistoryCallback });
    const { to, countBack, firstDataRequest } = periodParams;
    const symbol = symbolInfo.ticker;
    const interval = TvIntervalToXtApi[resolution];
    firstDataRequest && (refEndTime.current = undefined);

    apiGet();

    function apiGet() {
      const funKey = `${symbol},${resolution}`;
      if (firstDataRequest) {
        if (refKeyTimeoutFun.current[funKey]) {
          clearTimeout(refKeyTimeoutFun.current[funKey]);
          delete refKeyTimeoutFun.current[funKey];
          console.log("apiGet start refKeyTimeoutFun.current =", refKeyTimeoutFun.current);
        }
      }

      const params = {
        symbol,
        interval,
        endTime: refEndTime.current,
        limit: Math.min(countBack, 1000),
      };
      get_kline({
        params,
      })
        .then((data: KlineProps[]) => {
          const ary: any = [];

          if (data && data.length) {
            if (firstDataRequest && store.trade.tradeRecent && symbol === store.trade.tradeRecent.s) {
              data[0] = mixTradeRecent(data[0], store.trade.tradeRecent);
            }
            if (firstDataRequest) {
              refLatestKlineData.current[`${symbol},${interval}`] = data[0];
              refLastKlineData.current[`${symbol},${interval}`] = data[data.length - 1];
              refResolution.current[`${symbol},${interval}`] = data[1] ? data[0].t - data[1].t : 0;
            } else {
              if (refLastKlineData.current[`${symbol},${interval}`].t - data[0].t !== refResolution.current[`${symbol},${interval}`]) {
                $log({
                  desc: "@Kline history data is not continuous",
                  data: {
                    ...params,
                    resolution: refResolution.current[`${symbol},${interval}`],
                    lastData: refLastKlineData.current[`${symbol},${interval}`],
                    firstData: data[0],
                  },
                });
              }
              refLastKlineData.current[`${symbol},${interval}`] = data[data.length - 1];
            }
            data.map((obj) => {
              ary.unshift(tvDataFormat(obj));
            });
            refEndTime.current = data[data.length - 1].t;
          }
          // console.log("ary=", ary);
          onHistoryCallback(ary, { noData: !ary.length });
        })
        .catch((e) => {
          console.log("【TradingView】------->[getBars] error", e);
          $log({
            desc: "@Kline getBars get_kline api error",
            data: {
              symbolInfo,
              resolution,
              periodParams,
              params,
            },
          });
          // if (firstDataRequest) {
          refKeyTimeoutFun.current[funKey] = setTimeout(() => {
            console.log("apiGet catch refKeyTimeoutFun.current =", refKeyTimeoutFun.current);
            apiGet();
          }, 1000);
          // } else {
          //   onHistoryCallback([], { noData: true });
          //   onErrorCallback(e.message);
          // }
        });
    }
  }, []);
  const subscribeBars = useCallback((symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) => {
    console.log("【TradingView】------->[subscribeBars]", { symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback });
    const symbol = symbolInfo.ticker;
    const interval = TvIntervalToXtApi[resolution];
    const msg = {
      event: `kline@${symbol},${interval}`,
    };

    Socket.addChannel(msg, (data: KlineProps) => {
      const latestData = refLatestKlineData.current[`${symbol},${interval}`];
      if (!latestData) return;
      if (+resolution) {
        const dist = data.t - latestData.t;
        if (dist > +resolution * 60 * 1000) {
          $log({
            desc: "@Kline ws data is not continuous",
            data: {
              name: data.s,
              ws: data,
              latestData,
            },
          });
          return updateTv();
        }
      }
      const newData = mixTradeRecent(data, { p: latestData.c });
      refLatestKlineData.current[`${symbol},${interval}`] = newData;
      onRealtimeCallback(tvDataFormat(newData));
    });

    Socket.addChannel(
      {
        key: "trade-tv-" + `${symbol},${interval}`,
        event: `trade@${symbol}`,
      },
      (data) => {
        const latestData = refLatestKlineData.current[`${symbol},${interval}`];
        if (!latestData) return;
        const newData = mixTradeRecent(latestData, data);
        refLatestKlineData.current[`${symbol},${interval}`] = newData;
        onRealtimeCallback(tvDataFormat(newData));
      }
    );
  }, []);
  const unsubscribeBars = useCallback((subscriberUID) => {
    console.log("【TradingView】------->[unsubscribeBars]", subscriberUID);
    const [symbol, interval] = subscriberUID.split("_#_");
    const msg = {
      event: `kline@${symbol},${TvIntervalToXtApi[interval]}`,
    };

    Socket.removeChannel(msg);
    Socket.removeChannel({
      key: "trade-tv-" + `${symbol},${TvIntervalToXtApi[interval]}`,
      event: `trade@${symbol}`,
    });

    const funKey = `${symbol},${interval}`;
    if (refKeyTimeoutFun.current[funKey]) {
      console.log("refKeyTimeoutFun funKey =", funKey);
      clearTimeout(refKeyTimeoutFun.current[funKey]);
      delete refKeyTimeoutFun.current[funKey];
      console.log("refKeyTimeoutFun.current =", refKeyTimeoutFun.current);
    }
  }, []);

  //TradingView init
  useEffect(() => {
    const isColorReverse = Storage.get("colorReverse") == 1;
    console.log("isColorReverse ====", isColorReverse);
    const chartLocalConfig = Storage.get("tvChart");
    const tvCfg = tvConfig({ theme: appState.theme, isColorReverse });
    const { interval } = getOptionTradingView(option);
    const tvConstructor = new widget({
      ...tvCfg,
      disabled_features: tvCfg.disabled_features.concat(isH5 ? ["widget_logo", "timeframes_toolbar"] : []),
      container: "TradingView",
      symbol: name,
      locale: (() => {
        const obj = {
          "zh-CN": "zh",
          "zh-HK": "zh_TW",
          en: "en",
          ja: "ja",
          ko: "ko",
          ru: "ru",
          es: "es",
          tr: "tr",
        };
        return obj[appState.lang] || "en";
      })(),
      interval,
      saved_data: chartLocalConfig,
      datafeed: {
        onReady(callback) {
          // console.log("【TradingView】------->[onReady]");
          return new Promise((resolve) => {
            resolve({
              supported_resolutions: Object.keys(TvIntervalToXtApi),
            });
          }).then((data) => callback(data));
        },
        //通过商品名称解析商品信息
        resolveSymbol(symbolName, onSymbolResolvedCallback, onResolveErrorCallback) {
          // console.log("【TradingView】------->[resolveSymbol]", symbolName);
          return new Promise((resolve) => {
            const { name, currentConfig, formatName } = store.market;
            resolve({
              name: name,
              full_name: name,
              description: formatName(name),
              ticker: name,
              minmov: 1, //最小波动
              pricescale: Math.pow(10, currentConfig.pricePrecision || 2), //价格精度
              timezone: getTimezone(),
              has_intraday: true, //布尔值显示商品是否具有日内（分钟）历史数据
              has_daily: true,
              has_weekly_and_monthly: true,
              session: "24x7", //商品交易时间
              volume_precision: 2, //整数显示此商品的成交量数字的小数位。0表示只显示整数。1表示保留小数位的1个数字字符，等等。
              exchange: "AVO", //某个交易所的略称
            });
          })
            .then((data) => onSymbolResolvedCallback(data))
            .catch((err) => onResolveErrorCallback(err));
        },
        //当图表库需要由日期范围定义的历史K线片段时，将调用此函数。
        getBars,
        //订阅K线数据。图表库将调用onRealtimeCallback方法以更新实时数据。
        subscribeBars,
        //取消订阅K线数据
        unsubscribeBars,
        //
        searchSymbols(userInput, exchange, symbolType, onResultReadyCallback) {
          onResultReadyCallback([]);
        },
      },
      custom_formatters: {
        priceFormatterFactory: () => {
          return {
            format: (price) => {
              // return price;
              return indentFormat(Big(price || 0).toFixed(store.market.currentConfig.pricePrecision || 2));
            },
          };
        },
      },
    } as any);

    tvConstructor.onChartReady(() => {
      setTvWidget(tvConstructor);
    });
  }, []);
  //TradingView ready
  useEffect(() => {
    if (!tvWidget) return;

    const { theme } = appState;
    if (tvWidget.getTheme().toLowerCase() !== theme) {
      themeChange(theme);
    }

    const chartLocalConfig = Storage.get("tvChart");
    const tvCfg = tvConfig({ theme, isColorReverse });

    tvWidget.subscribe("undo_redo_state_changed", () => {
      // console.log("undo_redo_state_changed-=====");
      tvWidget.save((state) => {
        Storage.set("tvChart", state);
      });
    });

    if (chartLocalConfig) {
      tvWidget.applyOverrides(tvCfg.overrides);
    } else {
      (() => {
        tvWidget.chart().createStudy(
          "Moving Average",
          false,
          false,
          { length: 5 },
          {
            "plot.color": "#0075FF",
            "plot.linewidth": 1,
          }
        );
        tvWidget.chart().createStudy(
          "Moving Average",
          false,
          false,
          { length: 15 },
          {
            "plot.color": "#5C00F3",
            "plot.linewidth": 1,
          }
        );
        tvWidget.chart().createStudy(
          "Moving Average",
          false,
          false,
          { length: 30 },
          {
            "plot.color": "#FFC453",
            "plot.linewidth": 1,
          }
        );

        setTimeout(() => {
          console.log("tvWidget.save");
          tvWidget.save((state) => {
            Storage.set("tvChart", state);
          });
        }, 0);
      })();
    }

    // H5下隐藏Volume指标
    if (isH5) {
      const studies = tvWidget.activeChart().getAllStudies();
      studies.forEach((study) => {
        if (study.name === "Volume") {
          tvWidget.activeChart().removeEntity(study.id);
        }
      });
    }

    const { interval, chartType } = getOptionTradingView(option);
    tvWidget.chart().setChartType(chartType);

    tvWidget.activeChart().executeActionById("chartReset");

    const symbolInterval = tvWidget.symbolInterval();
    console.log("symbolInterval==", symbolInterval);
    if (!(name === symbolInterval.symbol.toLowerCase() && interval === symbolInterval.interval)) {
      tvWidget.setSymbol(name, interval as ResolutionString, onChartDataLoaded);
    }

    setLoading(false);
  }, [tvWidget]);

  useEffect(() => {
    // console.log("【tradingView】useEffect====", name, option, tvWidget);
    if (!tvWidget) return;
    console.log("【tradingView】setSymbol====", name, option, tvWidget);

    const { interval, chartType } = getOptionTradingView(option);
    tvWidget.setSymbol(name, interval as ResolutionString, onChartDataLoaded);
    tvWidget.chart().setChartType(chartType);
  }, [name, option]);
  useEffect(() => {
    // console.log("appState.theme=",appState.theme);
    if (!tvWidget) return;
    const { theme } = appState;
    themeChange(theme);
  }, [appState.theme, isColorReverse]);
  useEffect(() => {
    if (!tvWidget || !action) return;
    const { actionId } = action;
    actionId && tvWidget.chart().executeActionById(actionId);
  }, [action]);

  return (
    <div className={styles.main}>
      <div id="TradingView" className={styles.tv}></div>
      {loading && <AzLoading className={styles.loading} />}
    </div>
  );
};

export default observer(Main);
