import React, { useCallback } from "react";
import { observer } from "mobx-react-lite";
import cx from "classnames";
import store from "store";

import CMPT_Symbol from "./symbol";
// import CMPT_MarketTip from "./marketTip";
import CMPT_Ticker from "./ticker";
import CMPT_Theme from "./theme";
import CMPT_Setting from "./setting";
import Star from "components/pages/trade/_cmpt/market/container/star";

import styles from "./index.module.scss";

const ExpandIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="0.5" y="0.5" width="23" height="23" rx="3.5" stroke="var(--az-colorv2-border-hover)" />
    <path d="M8 10L12 14L16 10" stroke="var(--az-colorv2-text-primary)" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Main: React.FC = () => {
  const { isH5 } = store.app;
  const { name } = store.market;
  const { isH5Expanded } = store.trade;

  const handleToggleExpand = useCallback(() => {
    store.trade.updateState({ isH5Expanded: !store.trade.isH5Expanded });
  }, []);

  if (isH5)
    return (
      <div className={styles.h5}>
        <div className={styles.h5Row1}>
          <div className={styles.h5Left}>
            <CMPT_Symbol />
          </div>
          <div className={styles.h5Actions}>
            <Star symbol={name} className={styles.h5Star} placement="bottomLeft" isStarEmpty={true} />
            <button className={cx("btnTxt", styles.h5Expand, { [styles.h5ExpandActive]: isH5Expanded })} onClick={handleToggleExpand}>
              <ExpandIcon />
            </button>
          </div>
        </div>
        <CMPT_Ticker />
      </div>
    );

  return (
    <div className={styles.main}>
      <div className={styles.left}>
        <CMPT_Symbol />
        {/*<CMPT_MarketTip />*/}
        <CMPT_Ticker />
      </div>

      <div className={styles.right}>
        {/*<CMPT_Theme />*/}
        <CMPT_Setting />
      </div>
    </div>
  );
};

export default observer(Main);
