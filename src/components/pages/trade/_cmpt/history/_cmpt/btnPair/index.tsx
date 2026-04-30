import React, { HTMLAttributes, useCallback } from "react";
import { observer } from "mobx-react-lite";
import { useRouter } from "next/router";
import cx from "classnames";
// import { Hooks } from "@az/base";
// const { useTranslation } = Hooks;
import store from "store";
import { routerPush } from "utils/method";
import BlackTipTooltip from "../blackTipTooltip";

import styles from "./index.module.scss";

interface Props extends HTMLAttributes<HTMLButtonElement> {
  symbol: string;
  disabled?: boolean;
  showBlackTipTooltip?: boolean;
}

const Main: React.FC<Props> = ({ className, symbol, disabled, showBlackTipTooltip = false }) => {
  const router = useRouter();
  const { isLever, formatName, config } = store.market;
  const isBlack = !!config?.[symbol]?.isBlack;

  const handleClick = useCallback(() => {
    if (disabled || isBlack) return;
    routerPush(router, { symbol, isLever });
  }, [disabled, isBlack, symbol, isLever]);

  return (
    <span className={cx(styles.mainWrap, className)}>
      <button disabled={disabled} className={cx("btnTxt", styles.main)} style={{ cursor: isBlack ? "text" : "" }} onClick={handleClick}>
        {formatName(symbol)}
      </button>
      {showBlackTipTooltip && isBlack && <BlackTipTooltip />}
    </span>
  );
};

export default observer(Main);
// export default Main;
