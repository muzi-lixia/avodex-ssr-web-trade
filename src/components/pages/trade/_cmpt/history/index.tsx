import React, { HTMLAttributes, useMemo, useState, useCallback, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useRouter } from "next/router";
import cx from "classnames";
import { Hooks } from "@az/base";
const { useTranslation } = Hooks;
// const { getUrl, Big } = Util;
import store from "store";
import { $g } from "utils/statistics";

import { Checkbox } from "antd";
import AppDivToLogin from "components/app/div/toLogin";
import AzTabs from "components/az/tabs";

import CMPT_openOrder from "./openOrderWithEntrust";
import CMPT_orderHistory from "./orderHistoryWithEntrust";
import CMPT_tradeHistory from "./tradeHistory";
import CMPT_funds_spot from "./funds/spot";
import CMPT_funds_lever from "./funds/lever";
import CMPT_funds_nft from "./funds/nft";
import CMPT_position from "./position";
import CMPT_copyTrade from "./copyTrade";
import CMPT_botOrder from "./botOrder";
// import CMPT_subscription from "./subscription";
// import CMPT_redemption from "./redemption";

import styles from "./index.module.scss";

enum HistoryTypeEnum {
  openOrder = "openOrder", //当前委托
  orderHistory = "orderHistory", //历史委托
  tradeHistory = "tradeHistory", //成交记录
  funds = "funds", //资产管理
  position = "position", //持仓列表，杠杆
  subscription = "subscription", //申购记录，etf
  redemption = "redemption", //赎回记录，etf
  copyTrade = "copyTrade", //我的跟单或带单
  botOrder = "botOrder", //机器人订单 (网格交易)
}

interface Props extends HTMLAttributes<HTMLDivElement> {
  attr?: any;
}

const Main: React.FC<Props> = ({ className }) => {
  const t = useTranslation();
  const router = useRouter();

  const { isH5 } = store.app;
  const { isLogin } = store.user;
  const { name, type, isLever, isEtf, isNft } = store.market;
  const { openOrder } = store.balances;
  const { openEntrustOrder } = store.entrustOrder;
  const { userStatus, isFollower, curOrder } = store.copyTrade;

  const [openOrderCount, setOpenOrderCount] = useState<undefined | number>();
  const [copyTradeCount, setCopyTradeCount] = useState<undefined | number>();
  const [historyType, setHistoryType] = useState(HistoryTypeEnum.openOrder);
  const navItems = useMemo(() => {
    const ary = [
      {
        key: HistoryTypeEnum.openOrder,
        label: t("trade.openOrders") + (openOrderCount !== undefined ? `(${openOrderCount})` : ""),
      },
      {
        key: HistoryTypeEnum.orderHistory,
        label: t("trade.orderHistory"),
      },
      {
        key: HistoryTypeEnum.tradeHistory,
        label: t("trade.tradeHistory"),
      },
    ];

    if (!isLever && userStatus) {
      ary.push({
        key: HistoryTypeEnum.copyTrade,
        label: t(isFollower ? "trade.myFollowing" : "trade.myLeading") + (copyTradeCount !== undefined ? `(${copyTradeCount})` : ""),
      });
    }

    ary.push({
      key: HistoryTypeEnum.funds,
      label: t("trade.funds"),
    });

    if (!isNft) {
      ary.push({
        key: HistoryTypeEnum.botOrder,
        label: t("gridBot.botOrders"),
      });
    }

    // if (isLever) {
    //   ary.push({
    //     key: HistoryTypeEnum.position,
    //     label: t("trade.positionList"),
    //   });
    // }

    // if (isEtf) {
    //   ary.push({
    //     key: HistoryTypeEnum.subscription,
    //     label: t("trade.subscription"),
    //   });
    //   ary.push({
    //     key: HistoryTypeEnum.redemption,
    //     label: t("trade.redemption"),
    //   });
    // }

    return ary;
  }, [isLever, isEtf, isNft, openOrderCount, copyTradeCount, userStatus, isFollower]);

  const isCheckboxVisible = useMemo(() => {
    return [HistoryTypeEnum.openOrder, HistoryTypeEnum.orderHistory, HistoryTypeEnum.tradeHistory, HistoryTypeEnum.copyTrade].includes(historyType);
  }, [historyType]);
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false);
  const handleCheckboxChange = useCallback((e) => {
    setIsCheckboxChecked(e.target.checked);
  }, []);

  const resetEffect = useMemo(() => {
    return [name, type].join("@");
  }, [name, type]);

  const [openOrderClickStamp, setOpenOrderClickStamp] = useState<string>();
  const [copyTradeClickStamp, setCopyTradeClickStamp] = useState<string>();
  const handleTabClick = useCallback((val) => {
    const clickStamp = Math.round(Date.now() / 100) + "";
    if (val === HistoryTypeEnum.openOrder) {
      setOpenOrderClickStamp(clickStamp);
    } else if (val === HistoryTypeEnum.copyTrade) {
      setCopyTradeClickStamp(clickStamp);
    } else if (val === HistoryTypeEnum.orderHistory) {
      $g("WEB_Trade_History_click");
    }
  }, []);

  useEffect(() => {
    const { historyTab } = router.query;
    if (!historyTab || typeof historyTab !== "string") return;
    const tab = Object.values(HistoryTypeEnum).find((str) => str.toLowerCase() === historyTab.toLowerCase());
    console.log("router.query.historyTab =", router.query.historyTab, tab, navItems);
    if (!tab) return;
    if (!navItems.find((obj) => obj.key === tab)) return;
    setHistoryType(tab);
  }, [router.query.historyTab, userStatus]);

  useEffect(() => {
    if (!isLever && historyType === HistoryTypeEnum.position) {
      setHistoryType(HistoryTypeEnum.openOrder);
      return;
    }
    if (!isEtf && [HistoryTypeEnum.subscription, HistoryTypeEnum.redemption].includes(historyType)) {
      setHistoryType(HistoryTypeEnum.openOrder);
      return;
    }
    if (isLever && historyType === HistoryTypeEnum.copyTrade) {
      setHistoryType(HistoryTypeEnum.openOrder);
      return;
    }
  }, [isLever, isEtf]);

  useEffect(() => {
    // console.log("hooooooo---");
    if (historyType === HistoryTypeEnum.openOrder) return;
    if (!openOrder && !openEntrustOrder) return setOpenOrderCount(undefined);

    const itemsOpenOrder = (openOrder || []).filter((doc) => {
      if (isCheckboxChecked && doc.symbol !== name) return false;
      return true;
    });
    const itemsOpenEntrustOrder = (openEntrustOrder || []).filter((doc) => {
      if (isCheckboxChecked && doc.symbol !== name) return false;
      return true;
    });

    setOpenOrderCount(itemsOpenOrder.length + itemsOpenEntrustOrder.length);
  }, [name, openOrder, openEntrustOrder, historyType, isCheckboxChecked]);

  useEffect(() => {
    if (isLever) return;
    if (!curOrder) return setCopyTradeCount(undefined);
    const items = (curOrder as any[]).filter((doc) => {
      if (isCheckboxChecked && doc.symbol !== name) return false;
      return true;
    });
    setCopyTradeCount(items.length);
  }, [name, isLever, curOrder, isCheckboxChecked]);

  return (
    <div className={cx(styles.main, className)}>
      <AzTabs
        className={styles.nav}
        activeKey={historyType}
        items={navItems}
        onClick={handleTabClick}
        onChange={(val) => setHistoryType(val as HistoryTypeEnum)}
        isArrow={true}
        resetEffect={resetEffect}
      >
        {isCheckboxVisible && !isH5 && (
          <Checkbox className={styles.checkbox} checked={isCheckboxChecked} onChange={handleCheckboxChange}>
            {t("trade.hideOtherSymbol")}
          </Checkbox>
        )}
      </AzTabs>

      {!isLogin ? (
        <AppDivToLogin className={styles.noLogin} />
      ) : (
        <div className={styles.content}>
          {historyType === HistoryTypeEnum.openOrder && (
            <CMPT_openOrder
              isHideOtherPairs={isCheckboxChecked}
              setHideOtherPairs={setIsCheckboxChecked}
              setOpenOrderCount={setOpenOrderCount}
              clsUl={styles.ul}
              clsLi={styles.li}
              clickStamp={openOrderClickStamp}
            />
          )}
          {historyType === HistoryTypeEnum.orderHistory && (
            <CMPT_orderHistory isHideOtherPairs={isCheckboxChecked} setHideOtherPairs={setIsCheckboxChecked} clsUl={styles.ul} clsLi={styles.li} />
          )}
          {historyType === HistoryTypeEnum.tradeHistory && (
            <CMPT_tradeHistory isHideOtherPairs={isCheckboxChecked} setHideOtherPairs={setIsCheckboxChecked} clsUl={styles.ul} clsLi={styles.li} />
          )}
          {historyType === HistoryTypeEnum.copyTrade && (
            <CMPT_copyTrade
              setCopyTradeCount={setCopyTradeCount}
              isHideOtherPairs={isCheckboxChecked}
              setHideOtherPairs={setIsCheckboxChecked}
              clsUl={styles.ul}
              clsLi={styles.li}
              clickStamp={copyTradeClickStamp}
            />
          )}
          {historyType === HistoryTypeEnum.funds &&
            (isNft ? (
              <CMPT_funds_nft clsUl={styles.ul} clsLi={styles.li} />
            ) : !isLever ? (
              <CMPT_funds_spot clsUl={styles.ul} clsLi={styles.li} />
            ) : (
              <CMPT_funds_lever clsUl={styles.ul} clsLi={styles.li} />
            ))}
          {historyType === HistoryTypeEnum.position && <CMPT_position />}
          {historyType === HistoryTypeEnum.botOrder && <CMPT_botOrder clsUl={styles.ul} clsLi={styles.li} />}
          {/*{historyType === HistoryTypeEnum.subscription && <CMPT_subscription clsUl={styles.ul} clsLi={styles.li} />}*/}
          {/*{historyType === HistoryTypeEnum.redemption && <CMPT_redemption clsUl={styles.ul} clsLi={styles.li} />}*/}
        </div>
      )}
    </div>
  );
};

export default observer(Main);
// export default Main;
