import React, { useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react-lite";
import cx from "classnames";
import { Hooks } from "@az/base";
import store from "store";

import Layout_classic from "./layout/classic";
import Layout_advanced from "./layout/advanced";
import Layout_h5 from "./layout/h5";
import AiTrading from "./_cmpt/aiTrading";

import styles from "./index.module.scss";

import { LayoutEnum } from "store/app";
import { TradeTypeEnum, TradePanelEnum } from "store/trade";

const { useTranslation } = Hooks;

export interface OptionProps {
  hasFutures: boolean;
  hasEtf: boolean;
  tradeType: TradeTypeEnum;
  setTradeType: (arg: TradeTypeEnum) => void;
}

const Main: React.FC = () => {
  const t = useTranslation();
  const { isH5 } = store.app;
  const { name, futuresUsdtConfigAry, isEtf, isNft } = store.market;

  const hasFutures = useMemo(() => {
    if (!futuresUsdtConfigAry) return false;
    const doc = futuresUsdtConfigAry.find((obj) => obj.symbol === name);
    if (!doc || !doc.isDisplay) return false;
    return true;
  }, [name, futuresUsdtConfigAry]);

  const [tradeType, setTradeType] = useState<TradeTypeEnum>(TradeTypeEnum.limit);
  const [panel, setPanel] = useState<TradePanelEnum>(TradePanelEnum.spot);

  useEffect(() => {
    isNft && setTradeType(TradeTypeEnum.limit);
  }, [isNft]);

  // PC 端右侧面板顶层 Tab（现货 / AI 智能交易）；移动端入口在底部按钮，不显示顶层 Tab
  const showPanelTab = !isNft && !isH5;

  if (isH5) {
    return <Layout_h5 hasFutures={hasFutures} hasEtf={!isEtf} tradeType={tradeType} setTradeType={setTradeType} />;
  }

  return (
    <>
      {showPanelTab && (
        <div className={styles.panelTab}>
          <button className={cx(styles.panelTabBtn, { [styles.panelTabAtv]: panel === TradePanelEnum.spot })} onClick={() => setPanel(TradePanelEnum.spot)}>
            {t("trade.spotTrading")}
          </button>
          <button
            className={cx(styles.panelTabBtn, { [styles.panelTabAtv]: panel === TradePanelEnum.aiTrading })}
            onClick={() => setPanel(TradePanelEnum.aiTrading)}
          >
            {t("trade.aiTrading")}
          </button>
        </div>
      )}

      {panel === TradePanelEnum.aiTrading ? (
        <AiTrading />
      ) : (
        <>
          {store.app.layout !== LayoutEnum.advanced && (
            <Layout_classic className={styles.main} hasFutures={hasFutures} hasEtf={!isEtf} tradeType={tradeType} setTradeType={setTradeType} />
          )}
          {store.app.layout === LayoutEnum.advanced && (
            <Layout_advanced className={styles.main} hasFutures={hasFutures} hasEtf={!isEtf} tradeType={tradeType} setTradeType={setTradeType} />
          )}
        </>
      )}
    </>
  );
};

export default observer(Main);
