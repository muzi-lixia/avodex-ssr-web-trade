import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { observer } from "mobx-react-lite";
import cx from "classnames";
import { Hooks } from "@az/base";
const { useTranslation } = Hooks;
import store from "store";
import Storage from "utils/storage";

import AzSvg from "components/az/svg";
import AzScrollArrow from "components/az/scroll/arrow";

import MarketTip from "./marketTip";
import LeverStep from "./leverStep";
import CPMT_tradingview_nav from "./tradingview/nav";
import CPMT_tradingview_content from "./tradingview/content";
import CPMT_depth_nav from "./depth/nav";
import CPMT_depth_content from "./depth/content";
import CPMT_intotheblock_nav from "./intotheblock/nav";
import CPMT_intotheblock_content from "./intotheblock/content";
import CPMT_currencyOverview from "./view/currencyOverview";
import CPMT_etfInfo from "./view/etfInfo";
import { TvIntervalToXtApi } from "./tradingview/content";

import styles from "./index.module.scss";

import { LayoutH5ActiveKeyEnum } from "store/trade";
import AzTabs from "@/components/az/tabs";

enum ViewTypeEnum {
  chart = "chart", //图表
  currencyOverview = "currencyOverview", //币种概况
  etfInfo = "etfInfo", //ETF信息
}

enum ChartTypeEnum {
  tradingview = "tradingview", //TradingView 视图
  depth = "depth", //深度 视图
  intotheblock = "intotheblock", //链上数据 视图
}

export interface OptionTradingViewProps {
  interval?: string; //tradingView周期
  chartType?: number; //设置主数据列的样式, 0=Bar,1=Candle,2=Line,3=Area
}
export function getOptionTradingView(option: WithUndefined<OptionTradingViewProps>) {
  const obj = option || Storage.get("tvOption") || {};

  return {
    interval: obj.interval && TvIntervalToXtApi[obj.interval] ? obj.interval : "60",
    chartType: [0, 1, 2, 3].includes(obj.chartType) ? obj.chartType : 1,
  };

  /*
  return {
    interval: "15",
    chartType: 1,
    ...(option || Storage.get("tvOption") || {}),
  };
   */
}
export interface ActionTradingViewProps {
  actionId?: string; //操作ID
}

export interface OptionDepthProps {
  scope: number;
}

const Main: React.FC = () => {
  const t = useTranslation();
  const { isH5 } = store.app;
  const { layoutH5ActiveKey } = store.trade;
  const { isEtf } = store.market;

  const [viewType, setViewType] = useState<ViewTypeEnum>(ViewTypeEnum.chart);
  const viewNavItems = useMemo(() => {
    const items = [
      {
        key: ViewTypeEnum.chart,
        label: t("trade.chart"),
      },
    ];

    if (!isEtf) {
      items.push({
        key: ViewTypeEnum.currencyOverview,
        label: t("trade.currencyOverview"),
      });
    } else {
      items.push({
        key: ViewTypeEnum.etfInfo,
        label: t("trade.etfInfo"),
      });
    }

    return items;
  }, [isEtf]);
  useEffect(() => {
    setViewType(ViewTypeEnum.chart);
  }, [isEtf]);

  const [chartType, setChartType] = useState<ChartTypeEnum>(ChartTypeEnum.tradingview);
  useEffect(() => {
    if (isH5 && chartType === ChartTypeEnum.intotheblock) setChartType(ChartTypeEnum.tradingview);
  }, [isH5]);

  const [option_tradingview, setOption_tradingview] = useState<OptionTradingViewProps>();
  const [action_tradingview, setAction_tradingview] = useState<ActionTradingViewProps>();

  const [option_depth, setOption_depth] = useState<OptionDepthProps>({ scope: 0.05 });
  const [option_intotheblock, setOption_intotheblock] = useState();

  const el = useRef(null);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const checkIsFullScreen = useCallback(() => {
    const DOC: any = document;
    return !!(DOC.fullscreenElement || DOC.mozFullScreenElement || DOC.webkitFullscreenElement || DOC.msFullscreenElement);
  }, []);
  const onFullScreen = useCallback(() => {
    const DOC: any = document;
    const $el: any = el.current;
    if (!$el) return;

    if (checkIsFullScreen()) {
      setIsFullScreen(false);
      if (DOC.exitFullscreen) {
        DOC.exitFullscreen();
      } else if (DOC.msExitFullscreen) {
        DOC.msExitFullscreen();
      } else if (DOC.mozCancelFullScreen) {
        DOC.mozCancelFullScreen();
      } else if (DOC.webkitExitFullscreen) {
        DOC.webkitExitFullscreen();
      }
    } else {
      setIsFullScreen(true);
      if ($el.requestFullscreen) {
        $el.requestFullscreen();
      } else if ($el.msRequestFullscreen) {
        $el.msRequestFullscreen();
      } else if ($el.mozRequestFullScreen) {
        $el.mozRequestFullScreen();
      } else if ($el.webkitRequestFullscreen) {
        $el.webkitRequestFullscreen((Element as any).ALLOW_KEYBOARD_INPUT);
      }
    }
  }, []);
  useEffect(() => {
    setIsFullScreen(checkIsFullScreen());
  }, []);

  const [tvTs, setTvTs] = useState(0);
  const updateTv = useCallback(() => setTvTs(Date.now()), []);

  if (isH5 && (!store.trade.isH5Expanded || layoutH5ActiveKey !== LayoutH5ActiveKeyEnum.chart)) return <></>;

  return (
    <div ref={el} className={styles.main}>
      {/* {!isH5 && <AzTabs activeKey={viewType} items={viewNavItems} onChange={(val) => setViewType(val as ViewTypeEnum)} />} */}
      {(isH5 || viewType === ViewTypeEnum.chart) && (
        <div className={styles.body}>
          <div className={styles.nav}>
            <AzScrollArrow className={styles.navLeft} resetEffect={chartType}>
              {chartType === ChartTypeEnum.tradingview && (
                <CPMT_tradingview_nav option={option_tradingview} setOption={setOption_tradingview} setAction={setAction_tradingview} el={el} />
              )}
              {chartType === ChartTypeEnum.depth && <CPMT_depth_nav option={option_depth} setOption={setOption_depth} />}
              {chartType === ChartTypeEnum.intotheblock && <CPMT_intotheblock_nav option={option_intotheblock} setOption={setOption_intotheblock} />}
            </AzScrollArrow>
            {!isH5 && (
              <div className={styles.navRight}>
                <button
                  className={cx("btnTxt btnHover", { [styles.navAtv]: chartType === ChartTypeEnum.tradingview })}
                  onClick={() => setChartType(ChartTypeEnum.tradingview)}
                >
                  {t("trade.tradingView")}
                </button>
                <button
                  className={cx("btnTxt btnHover", { [styles.navAtv]: chartType === ChartTypeEnum.depth })}
                  onClick={() => setChartType(ChartTypeEnum.depth)}
                >
                  {t("trade.depthMap")}
                </button>
                <button className={cx("btnTxt btnHover", styles.navZoom)} onClick={onFullScreen}>
                  <AzSvg icon={isFullScreen ? "zoom-out" : "zoom-in"} />
                </button>
              </div>
            )}
          </div>
          <div className={styles.content} key={store.app.networkOnlineTs}>
            {chartType === ChartTypeEnum.tradingview && (
              <CPMT_tradingview_content key={store.app.numberFormat + "-" + tvTs} option={option_tradingview} action={action_tradingview} updateTv={updateTv} />
            )}
            {chartType === ChartTypeEnum.depth && <CPMT_depth_content option={option_depth} />}
            {chartType === ChartTypeEnum.intotheblock && <CPMT_intotheblock_content option={option_intotheblock} />}
          </div>
          <MarketTip />
        </div>
      )}
      {!isH5 && viewType === ViewTypeEnum.currencyOverview && <CPMT_currencyOverview />}
      {!isH5 && viewType === ViewTypeEnum.etfInfo && <CPMT_etfInfo />}
      <LeverStep />
    </div>
  );
};

export default observer(Main);
