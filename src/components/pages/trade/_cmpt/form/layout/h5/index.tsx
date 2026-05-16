import React, { HTMLAttributes, useCallback, useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react-lite";
import cx from "classnames";
import { Hooks, Util } from "@az/base";
const { useTranslation } = Hooks;
const { getUrl } = Util;
import store from "store";

import { Drawer } from "antd";
import SvgIcon from "@az/SvgIcon";
import SvgBot from "@/assets/icon-svg/gridBot/bot.svg";
import AzSvg from "components/az/svg";
// import AzTabs from "components/az/tabs";
import EtfBtns from "components/pages/trade/_cmpt/form/etfBtns";
// import Asset from "components/pages/trade/_cmpt/asset";
import Borrow from "components/pages/trade/_cmpt/modalTriggerBtn/borrow";
import Repay from "components/pages/trade/_cmpt/modalTriggerBtn/repay";
import MarketTypeTab from "../../marketTypeTab";
import Fee from "../../_cmpt/fee";
import TradeLimit from "../../_cmpt/tradeLimit";
import TradeMarket from "../../_cmpt/tradeMarket";
import TradeStopLimit from "../../_cmpt/tradeStopLimit";
import TradeTrailingStop from "../../_cmpt/tradeTrailingStop";
import TradeNft from "../../_cmpt/tradeNft";
import TradeTypeTab from "../../_cmpt/tradeTypeTab";
import AiTrading from "../../_cmpt/aiTrading";

import styles from "./index.module.scss";

import { TradeSideEnum } from "store/trade";
import { OptionProps } from "../../index";
import { TradeTypeEnum } from "store/trade";

interface Props extends OptionProps, HTMLAttributes<HTMLDivElement> {}

const Main: React.FC<Props> = ({ hasFutures, hasEtf, tradeType, setTradeType }) => {
  const t = useTranslation();
  const { name, isLever, isNft } = store.market;
  const { isLogin } = store.user;

  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const onClose = useCallback(() => {
    setOpen(false);
  }, []);
  const onAiClose = useCallback(() => {
    setAiOpen(false);
  }, []);
  useEffect(() => {
    onClose();
    onAiClose();
  }, [name]);

  const [tradeSide, setTradeSide] = useState(TradeSideEnum.buy);

  const coin = useMemo(() => {
    return store.currency.getCurrencyDisplayName(name.split("_")[0]);
  }, [name]);
  const triggerBtnLab = useMemo(() => {
    const lab = t("trade.login2Register");
    return {
      buy: isLogin ? t("trade.buy") + " " + coin : lab,
      sell: isLogin ? t("trade.sell") + " " + coin : lab,
    };
  }, [coin, isLogin]);
  const handleClickTrigger = useCallback(
    (side: TradeSideEnum) => {
      // if (!isLogin) {
      //   const query = "?backurl=" + encodeURIComponent(location.href);
      //   location.href = getUrl("/accounts/login" + query);
      //   return;
      // }

      setTradeSide(side);
      setOpen(true);
    },
    [isLogin]
  );

  return (
    <>
      <div className={styles.triggerBtns}>
        <button className={cx("btnTxt", styles.triggerBtnBuy)} onClick={() => handleClickTrigger(TradeSideEnum.buy)}>
          {t("trade.buy") + " " + coin}
        </button>
        <button className={cx("btnTxt", styles.triggerBtnSell)} onClick={() => handleClickTrigger(TradeSideEnum.sell)}>
          {t("trade.sell") + " " + coin}
        </button>
        {!isNft && (
          <button className={cx("btnTxt", styles.triggerBtnAi)} onClick={() => setAiOpen(true)}>
            <SvgIcon className={styles.aiIcon} src={SvgBot} />
            <span className={styles.aiLabel}>{t("trade.aiTrading")}</span>
          </button>
        )}
      </div>

      {/*{isLogin && (*/}
      <Drawer
        className={styles.drawer}
        closable={false}
        title={<MarketTypeTab />}
        placement="bottom"
        height="65vh"
        open={open}
        onClose={onClose}
        extra={
          <button className={cx("btnTxt", "btnHover")} onClick={onClose}>
            <AzSvg icon={`close`} />
          </button>
        }
      >
        <div className={styles.main}>
          <div className={styles.body}>
            <div className={styles.navBtns}>
              <button className={cx("btnTxt", { [styles.navBtns_buy]: tradeSide === TradeSideEnum.buy })} onClick={() => setTradeSide(TradeSideEnum.buy)}>
                {t("trade.buy")}
              </button>
              <button className={cx("btnTxt", { [styles.navBtns_sell]: tradeSide === TradeSideEnum.sell })} onClick={() => setTradeSide(TradeSideEnum.sell)}>
                {t("trade.sell")}
              </button>
            </div>
            <TradeTypeTab tradeType={tradeType} setTradeType={setTradeType}>
              {isLogin && isLever && (
                <div className={styles.tabsBtn}>
                  <Borrow />
                  <Repay />
                </div>
              )}
            </TradeTypeTab>

            {isNft ? (
              <TradeNft tradeSide={tradeSide} onSuccess={onClose} />
            ) : (
              <>
                {tradeType === TradeTypeEnum.limit && <TradeLimit tradeSide={tradeSide} onSuccess={onClose} />}
                {tradeType === TradeTypeEnum.market && <TradeMarket tradeSide={tradeSide} onSuccess={onClose} />}
                {tradeType === TradeTypeEnum.stopLimit && <TradeStopLimit tradeSide={tradeSide} onSuccess={onClose} />}
                {tradeType === TradeTypeEnum.trailingStop && <TradeTrailingStop tradeSide={tradeSide} onSuccess={onClose} />}
              </>
            )}

            {/* <div className={styles.links}>
              <Fee className={styles.link} />

              {hasFutures && (
                <>
                  <span></span>
                  <a href={getUrl("/futures/trade/" + name)} className={cx("linkClear", styles.link)}>
                    {t("trade.futures")}
                  </a>
                </>
              )}
            </div> */}

            {hasEtf && <EtfBtns className={styles.etfBtns} />}
          </div>
        </div>

        {/*<Asset />*/}
      </Drawer>

      <Drawer
        className={cx(styles.drawer, styles.aiDrawer)}
        closable={false}
        title={null}
        headerStyle={{ display: "none" }}
        bodyStyle={{ padding: 0 }}
        placement="bottom"
        height="78vh"
        open={aiOpen}
        onClose={onAiClose}
      >
        <div className={styles.aiDrawerInner}>
          <div className={styles.aiDrawerTitle}>{t("trade.aiTrading")}</div>
          <div className={styles.aiDrawerDivider} />
          <AiTrading />
        </div>
      </Drawer>
      {/*)}*/}
    </>
  );
};

export default observer(Main);
