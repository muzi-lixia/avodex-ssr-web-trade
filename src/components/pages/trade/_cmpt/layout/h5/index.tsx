import React, { PropsWithChildren, useCallback } from "react";
import { observer } from "mobx-react-lite";
import { Hooks } from "@az/base";
const { useTranslation } = Hooks;
import cx from "classnames";
import store from "store";
import { getChildrenSlot } from "utils/method";

import AzTabs from "components/az/tabs";
import CPMT_depth_content from "components/pages/trade/_cmpt/kline/depth/content";

import styles from "./index.module.scss";

import { LayoutH5ActiveKeyEnum } from "store/trade";
import { BannerCarousel } from "@az/NavFlex";

const Main: React.FC<PropsWithChildren> = ({ children }) => {
  const t = useTranslation();
  const slots = getChildrenSlot(children);

  const { layoutH5ActiveKey, isH5Expanded } = store.trade;

  const handleTabChange = useCallback((key: string) => {
    store.trade.updateState({ layoutH5ActiveKey: key as LayoutH5ActiveKeyEnum });
  }, []);

  return (
    <div className={styles.main}>
      <div className={styles.banner}>
        <BannerCarousel displayType={3} displayPage={2} interval={4000} width={"100%"} height={100} imageFit="cover" />
      </div>
      {/* Header: 交易对 + 价格 + 展开按钮 */}
      <div className={styles.header}>{slots.header}</div>

      {/* 展开区域: Chart / Trades / Depth tab 切换；trade 组件始终挂载以获取 tradeRecent 数据 */}
      <div className={styles.expanded} style={isH5Expanded ? undefined : { display: "none" }}>
        <AzTabs
          className={styles.expandedTabs}
          activeKey={layoutH5ActiveKey}
          onChange={handleTabChange}
          items={[
            { key: LayoutH5ActiveKeyEnum.chart, label: t("trade.chart") },
            { key: LayoutH5ActiveKeyEnum.trade, label: t("trade.trades") },
            { key: LayoutH5ActiveKeyEnum.order, label: t("trade.chartDepth") },
          ]}
        />
        <div className={styles.expandedContent}>
          <div className={cx({ [styles.expandedContentVisible]: layoutH5ActiveKey === LayoutH5ActiveKeyEnum.chart })}>{slots.kline}</div>
          <div className={cx({ [styles.expandedContentVisible]: layoutH5ActiveKey === LayoutH5ActiveKeyEnum.trade })}>{slots.trade}</div>
          <div className={cx({ [styles.expandedContentVisible]: layoutH5ActiveKey === LayoutH5ActiveKeyEnum.order })}>
            <CPMT_depth_content option={{ scope: 0.05 }} />
          </div>
        </div>
      </div>

      {/* 主体区域: 订单簿(左) + 交易表单(右) 并排 */}
      <div className={styles.body}>
        <div className={styles.orderBook}>{slots.order}</div>
        <div className={styles.tradeForm}>{slots.form}</div>
      </div>

      {/* 底部: 历史记录 */}
      <div className={styles.history}>{slots.history}</div>
    </div>
  );
};

export default observer(Main);
