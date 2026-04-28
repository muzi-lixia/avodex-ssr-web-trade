import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import { Hooks, Util } from "@az/base";
const { useTranslation } = Hooks;
import cx from "classnames";
const { getUrl } = Util;
import store from "store";
import { LayoutEnum } from "store/app";
import { get_currencyCgSupported } from "api/v4/price";

import { Drawer, message } from "antd";
import AzFontScale from "components/az/fontScale";

import CMPT_MarketTip from "../marketTip";
import CPMT_market from "../../market";
import CurrencyInfo from "../currencyInfo";

import styles from "./index.module.scss";

const Main: React.FC = () => {
  const t = useTranslation();
  const { isH5 } = store.app;
  const { name, isLever, isEtf, leverConfigObj, etfConfigObj, currentConfig, symbolStList } = store.market;
  /*
  const { currencyObj } = store.currency;
  const curCurrencyDoc = useMemo(() => {
    if (!currencyObj) return;
    return currencyObj[name.split("_")[0]];
  }, [name, currencyObj]);
  const refCgSupported = useRef<WithUndefined<boolean>>();
  const handleClickMore = useCallback(() => {
    if (!curCurrencyDoc) return;
    if (refCgSupported.current === undefined) {
      get_currencyCgSupported(curCurrencyDoc.currency).then((data) => {
        refCgSupported.current = !!data;
        todo();
      });
    } else {
      todo();
    }

    function todo() {
      if (refCgSupported.current) {
        location.href = getUrl("/price/" + curCurrencyDoc?.currency);
      } else {
        message.warn(t("price.currencyCgNotSupport"));
      }
    }
  }, [curCurrencyDoc]);
   */

  const [open, setOpen] = useState(false);
  const onClose = useCallback(() => {
    setOpen(false);
  }, []);
  useEffect(() => {
    onClose();
  }, [isH5, name, isLever]);

  const marketName = useMemo(() => {
    return store.market.formatName(name);
  }, [name]); // eslint-disable-line react-hooks/exhaustive-deps

  const isSt = useMemo(() => {
    if (!(currentConfig.id || currentConfig.id === 0)) return false;
    return symbolStList.includes(currentConfig.id);
  }, [currentConfig, symbolStList]);
  const tag: WithUndefined<string> = useMemo(() => {
    if (!isLever && !isEtf) return;
    return `${isEtf ? etfConfigObj?.[name].maxLeverage : leverConfigObj?.[name].maxLeverage}X`;
  }, [name, isLever, leverConfigObj, etfConfigObj]); // eslint-disable-line react-hooks/exhaustive-deps

  const [isVisible, setIsVisible] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const refPop = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setIsVisible(false);
    console.log("refPop = ", refPop.current);
    if (!refPop.current) return;

    refPop.current.addEventListener("transitionstart", start, false);
    refPop.current.addEventListener("transitionend", todo, false);

    return () => {
      refPop.current && refPop.current.removeEventListener("transitionstart", start);
      refPop.current && refPop.current.removeEventListener("transitionend", todo);
    };

    function start() {
      console.log("===== pop transitionstart =====");
      setIsVisible(true);
      if (!refPop.current) return;
      const style = window.getComputedStyle(refPop.current as HTMLDivElement);
      console.log("style.visibility =", style.visibility);
      if (style.visibility === "visible") {
        setIsHidden(false);
      }
    }

    function todo() {
      console.log("===== pop transitionend =====");
      if (!refPop.current) return;
      const style = window.getComputedStyle(refPop.current as HTMLDivElement);
      console.log("style.visibility =", style.visibility);
      if (style.visibility === "hidden") {
        setIsHidden(true);
      }
    }
  }, [store.app.layout]);

  return (
    <div className={styles.main}>
      <div className={styles.title} onClick={() => isH5 && setOpen(true)}>
        {isH5 ? (
          <AzFontScale isLoop>
            <h1>{marketName}</h1>
          </AzFontScale>
        ) : (
          <h1>{marketName}</h1>
        )}
        {isSt && <div className={cx(styles.tag, styles.st)}>ST</div>}
        {!!tag && (
          <div
            className={cx(
              styles.tag,
              isEtf && etfConfigObj?.[name].direction === "LONG" && styles.etf_long,
              isEtf && etfConfigObj?.[name].direction === "SHORT" && styles.etf_short
            )}
          >
            {tag}
          </div>
        )}
        {isH5 && <span className={styles.h5MarketTag}>{isLever ? t("trade.margin") : "Spot"}</span>}
        {!isH5 && store.app.layout !== LayoutEnum.classic && (
          <div ref={refPop} className={cx(styles.pop, { [styles.popTip]: store.trade.isMaintainTip })}>
            {/*{isVisible && <CPMT_market clsSearch={styles.search} isHidden={isHidden} />}*/}
            <CPMT_market clsSearch={styles.search} />
          </div>
        )}
      </div>
      {/* <div className={styles.desc}>

        <CurrencyInfo />
        <CMPT_MarketTip />
      </div> */}

      {isH5 && (
        <Drawer
          className={styles.drawer}
          closable={false}
          title={null}
          headerStyle={{ display: "none" }}
          placement="bottom"
          height="80vh"
          open={open}
          onClose={onClose}
          forceRender={true}
        >
          <CPMT_market clsSearch={styles.search} isHidden={!open} />
        </Drawer>
      )}
    </div>
  );
};

export default observer(Main);
