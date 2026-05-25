import React, { HTMLAttributes, useState } from "react";
import { observer } from "mobx-react-lite";
import cx from "classnames";
import { Hooks } from "@az/base";
const { useTranslation } = Hooks;
import store from "store";

import EtfBtns from "components/pages/trade/_cmpt/form/etfBtns";
import Borrow from "components/pages/trade/_cmpt/modalTriggerBtn/borrow";
import Repay from "components/pages/trade/_cmpt/modalTriggerBtn/repay";
import TradeLimit from "../../_cmpt/tradeLimit";
import TradeMarket from "../../_cmpt/tradeMarket";
import TradeStopLimit from "../../_cmpt/tradeStopLimit";
import TradeTrailingStop from "../../_cmpt/tradeTrailingStop";
import TradeNft from "../../_cmpt/tradeNft";
import TradeTypeTab from "../../_cmpt/tradeTypeTab";

import styles from "./index.module.scss";

import { TradeSideEnum } from "store/trade";
import { OptionProps } from "../../index";
import { TradeTypeEnum } from "store/trade";

interface Props extends OptionProps, HTMLAttributes<HTMLDivElement> {}

const Main: React.FC<Props> = ({ hasFutures, hasEtf, tradeType, setTradeType }) => {
  const t = useTranslation();
  const { isLever, isNft } = store.market;
  const { isLogin } = store.user;

  const [tradeSide, setTradeSide] = useState(TradeSideEnum.buy);

  return (
    <div className={styles.main}>
      <div className={styles.body}>
        {/* Buy/Sell 切换按钮 */}
        <div className={styles.navBtns}>
          <button className={cx("btnTxt", { [styles.navBtns_buy]: tradeSide === TradeSideEnum.buy })} onClick={() => setTradeSide(TradeSideEnum.buy)}>
            {t("trade.buy")}
          </button>
          <button className={cx("btnTxt", { [styles.navBtns_sell]: tradeSide === TradeSideEnum.sell })} onClick={() => setTradeSide(TradeSideEnum.sell)}>
            {t("trade.sell")}
          </button>
        </div>

        {/* 订单类型选择 */}
        <TradeTypeTab tradeType={tradeType} setTradeType={setTradeType}>
          {isLogin && isLever && (
            <div className={styles.tabsBtn}>
              <Borrow />
              <Repay />
            </div>
          )}
        </TradeTypeTab>

        {/* 交易表单 */}
        {isNft ? (
          <TradeNft tradeSide={tradeSide} />
        ) : (
          <>
            {tradeType === TradeTypeEnum.limit && <TradeLimit tradeSide={tradeSide} />}
            {tradeType === TradeTypeEnum.market && <TradeMarket tradeSide={tradeSide} />}
            {tradeType === TradeTypeEnum.stopLimit && <TradeStopLimit tradeSide={tradeSide} />}
            {tradeType === TradeTypeEnum.trailingStop && <TradeTrailingStop tradeSide={tradeSide} />}
          </>
        )}

        {hasEtf && <EtfBtns className={styles.etfBtns} />}
      </div>
    </div>
  );
};

export default observer(Main);
