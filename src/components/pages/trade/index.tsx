import React, { PropsWithChildren, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { observer } from "mobx-react-lite";
import store from "store";
import { routerPush, getUrlSearchAttr } from "utils/method";
import Storage from "utils/storage";
import { $g } from "utils/statistics";
import { Modal } from "antd";
import AzLoading from "components/az/loading";
import AppModalTransfer from "@az/Transfer";
import AppModalBorrowRepay from "components/app/modal/borrowRepay";
// import AppModalSubscribeRedeem from "components/app/modal/subscribeRedeem";
import AppModalRiskTip from "components/app/modal/riskTip";

import Layout from "./_cmpt/layout";
import CPMT_asset from "./_cmpt/asset";
import CPMT_form from "./_cmpt/form";
import CPMT_header from "./_cmpt/header";
import CPMT_history from "./_cmpt/history";
import CPMT_kline from "./_cmpt/kline";
import CPMT_market from "./_cmpt/market";
import CPMT_order from "./_cmpt/order";
import CPMT_trade from "./_cmpt/trade";
import CPMT_suspended from "./_cmpt/suspended";
import CPMT_openSoon from "./_cmpt/openSoon";
import CPMT_MaintainTip from "./_cmpt/maintainTip";
import CPMT_Ad from "./_cmpt/ad";

import useUserLogin from "./_hook/useUserLogin";
import useCopyTrade from "./_hook/useCopyTrade";
import useEntrustOrder from "./_hook/useEntrustOrder";
import useRiskTipST from "./_hook/useRiskTipST";

import styles from "./index.module.scss";

import { TypeEnum } from "store/market";
import { TradeFooter } from "./_cmpt/tradeFooter";
import { Drawer } from "antd";
import { Hooks } from "@az/base";
import AiTrading from "./_cmpt/form/_cmpt/aiTrading";

const { useTranslation } = Hooks;

const FragmentCustom: React.FC<PropsWithChildren<{ slot: string }>> = ({ children }) => {
  return <>{children}</>;
};

const Main: React.FC = () => {
  const router = useRouter();
  const t = useTranslation();

  const isMarketOpen = useMemo(() => {
    return store.market.isMarketOpenFn(store.market.currentConfig, store.app.time);
  }, [store.market.currentConfig, store.app.time]);

  //store 初始化
  useEffect(() => {
    store.app.initLayout(); //初始化布局
    store.app.getServerTime(); //获取服务端时间
    store.trade.initOrderConfirm(); //获取下单确认偏好设置
    store.currency.loopGetCurrencies(); //获取所有币种列表
    store.market.loopGetMarketConfig(); //获取所有现货市场
    // store.market.getLeverMarketConfig(); //获取所有杠杆市场
    store.market.getFapiSymbolList(); //获取U本位合约市场列表
    // store.market.getEtfByTradeMarket(); //获取现货市场对应的etf所有市场
    // store.market.getEtfList(); //获取etf交易对列表
    store.market.getMarketTips(); //获取市场风险提示信息
  }, []);

  //轮询获取汇率转换
  useEffect(() => {
    console.log("loopGetPriceCurrencyConvert, store.app.clientSideReady", store.app.clientSideReady);
    if (!store.app.clientSideReady) return;
    store.currency.loopGetPriceCurrencyConvert(store.balances.convertCurrency);
  }, [store.balances.convertCurrency, store.app.clientSideReady]);

  //客户端判断市场有效性，并获取币种信息
  useEffect(() => {
    if (!store.market.config) return;
    const defaultMarket = process.env.NEXT_PUBLIC_DEFAULT_MARKET || "hive_usdt";
    let name = defaultMarket;
    const { symbol } = router.query;
    if (symbol && typeof symbol === "string") {
      name = symbol;
    }
    if (!store.market.config[name]) {
      name = defaultMarket;
    }
    if (name !== symbol) {
      routerPush(router, { method: "replace", symbol: name });
      return;
    }

    store.market.updateState({ name });

    const currency = name.split("_")[0];
    const { currencyInfo } = store.currency;
    if (!currencyInfo || currencyInfo.currency !== currency) {
      store.currency.getCurrencyInfoOne(currency);
    }

    // store.market.getEtfListBase(); //获取基于跟踪标的etf市场
    // if (!store.market.netWorth && store.market.isEtf) {
    //   store.market.getEtfWorth(); //获取etf净值
    // }
  }, [router.query.symbol, store.market.config]);

  //杠杆市场识别，并判断其有效性
  useEffect(() => {
    const type = getUrlSearchAttr("type");
    // const { type } = router.query;
    const isLever = type === "margin";
    store.market.updateState({
      type: isLever ? TypeEnum.lever : TypeEnum.spot,
    });
    if (!isLever || !store.market.leverConfigObj) return;
    if (!store.market.leverConfigObj[store.market.name]) {
      routerPush(router, { method: "replace", symbol: store.market.name });
    }
  }, [router.query.type, store.market.leverConfigObj]); // eslint-disable-line react-hooks/exhaustive-deps

  //客户端是否初始化完毕
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!store.app.clientSideReady || !store.market.config) return;

    setLoading(false);
    document.body.style.removeProperty("overflow");
    // console.log("%c【Page ready and loading remove】", "color:#52c41a");
  }, [store.market.config, store.app.clientSideReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useUserLogin();
  useCopyTrade();
  useEntrustOrder();
  useRiskTipST();

  useEffect(() => {
    console.log("%c【Current market name is】", "color:#ad2102", store.market.name, store.market.type);
    $g("WEB_Trade_Change_click");
  }, [store.market.name, store.market.type]);

  //将当前市场缓存到 localStorage
  useEffect(() => {
    if (!store.app.clientSideReady || !store.market.config) return;

    //将当前市场缓存到 localStorage
    Storage.set(store.market.isLever ? "leverMarket" : "market", store.market.name);
  }, [store.market.config, store.app.clientSideReady, store.market.name, store.market.isLever]);

  const handleModalUpdateProps = useCallback((attr, props) => {
    store.trade.updateState({
      [attr]: {
        ...store.trade[attr],
        ...props,
      },
    });
  }, []);
  //路由变化，关闭对话框，滚动到顶部
  useEffect(() => {
    ["modalTransfer", "modalBorrowRepay", "modalSubscribeRedeem"].map((attr) => {
      if (store.trade[attr] && store.trade[attr].open) {
        handleModalUpdateProps(attr, { open: false });
      }
    });
    Modal.destroyAll();

    // (document.scrollingElement || document.documentElement).scrollTop = 0;
  }, [router]);

  return (
    <>
      {!loading && (
        <Layout>
          <FragmentCustom slot="asset">
            <CPMT_asset />
          </FragmentCustom>
          <FragmentCustom slot="form">
            <CPMT_form />
          </FragmentCustom>
          <FragmentCustom slot="header">
            <CPMT_header />
          </FragmentCustom>
          <FragmentCustom slot="history">
            <CPMT_history />
          </FragmentCustom>
          <FragmentCustom slot="kline">{isMarketOpen ? <CPMT_kline /> : <CPMT_openSoon />}</FragmentCustom>
          <FragmentCustom slot="market">
            <CPMT_market />
          </FragmentCustom>
          <FragmentCustom slot="order">
            <CPMT_order />
          </FragmentCustom>
          <FragmentCustom slot="trade">
            <CPMT_trade />
          </FragmentCustom>
          <FragmentCustom slot="suspended">
            <CPMT_suspended />
          </FragmentCustom>
          <FragmentCustom slot="maintainTip">
            <CPMT_MaintainTip />
          </FragmentCustom>
          <FragmentCustom slot="ad">
            <CPMT_Ad />
          </FragmentCustom>
        </Layout>
      )}

      {!loading && (
        <>
          {store.trade.modalTransfer && (
            <AppModalTransfer {...store.trade.modalTransfer} updateProps={(props) => handleModalUpdateProps("modalTransfer", props)} />
          )}
          {store.trade.modalBorrowRepay && (
            <AppModalBorrowRepay {...store.trade.modalBorrowRepay} updateProps={(props) => handleModalUpdateProps("modalBorrowRepay", props)} />
          )}
          {/*{store.trade.modalSubscribeRedeem && (*/}
          {/*  <AppModalSubscribeRedeem {...store.trade.modalSubscribeRedeem} updateProps={(props) => handleModalUpdateProps("modalSubscribeRedeem", props)} />*/}
          {/*)}*/}
          <AppModalRiskTip {...(store.trade.modalRiskTip || {})} updateProps={(props) => handleModalUpdateProps("modalRiskTip", props)} />
        </>
      )}

      {!loading && (
        <Drawer
          className={styles.aiDrawer}
          closable={false}
          title={null}
          headerStyle={{ display: "none" }}
          bodyStyle={{ padding: 0 }}
          placement="bottom"
          height="85vh"
          open={store.trade.aiDrawerOpen}
          onClose={() => store.trade.updateState({ aiDrawerOpen: false })}
        >
          <div className={styles.aiDrawerInner}>
            <div className={styles.aiDrawerTitle}>{t("trade.aiTrading")}</div>
            <div className={styles.aiDrawerDivider} />
            <AiTrading />
          </div>
        </Drawer>
      )}
      {/* <TradeFooter /> */}

      {loading && <AzLoading className={styles.loading} />}
    </>
  );
};

export default observer(Main);
