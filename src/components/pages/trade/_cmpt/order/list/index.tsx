import React, { HTMLAttributes, useCallback, useMemo } from "react";
import { observer } from "mobx-react-lite";
import cx from "classnames";
import store from "store";
import { thousands, filterBigNumThousands } from "utils/method";

import AzFontScale from "components/az/fontScale";

import styles from "./index.module.scss";

import { DepthAryItemProps } from "store/trade";
import { LayEnum } from "../index";
import indentFormat from "@/hooks/indentFormat";

interface Props extends HTMLAttributes<HTMLDivElement> {
  ary: DepthAryItemProps;
  depthType: LayEnum;
  maxAmount: number;
  openOrderObj: ObjAny;
}

const Main: React.FC<Props> = ({ className, ary, depthType, maxAmount, openOrderObj, ...rest }) => {
  // const router = useRouter();

  const { isNft } = store.market;
  const { isH5 } = store.app;
  const { isDepthShowTotalPrice } = store.trade;

  const docFormat = useMemo(() => {
    return {
      priceLab: indentFormat(ary[0]),
      amountLab: indentFormat(filterBigNumThousands(isDepthShowTotalPrice ? ary[2].value : ary[1], isDepthShowTotalPrice ? 6 : undefined)),
      // priceLab: filterBigNumThousands(ary[0], currentConfig.pricePrecision),
      // amountLab: filterBigNumThousands(ary[1], currentConfig.quantityPrecision),
      totalLab: indentFormat(
        filterBigNumThousands(
          isDepthShowTotalPrice ? ary[2].totalValue : ary[2].totalAmount,
          isDepthShowTotalPrice ? 6 : store.market.currentConfig.quantityPrecision
        )
      ),
    };
  }, [ary, isDepthShowTotalPrice, store.app.isNumberIndent]);
  // }, [ary, currentConfig]);

  const handleClick = useCallback(() => {
    store.trade.updateState({
      tradeRecentOnce: {
        p: ary[0],
        q: ary[1],
        total: ary[2].totalAmount,
        isClick: true,
      },
    });
  }, [ary]);

  const barStyle = useMemo(() => {
    const style: any = {};

    if (maxAmount) {
      style.width = (+ary[2].totalAmount / maxAmount) * 100 + "%";
    }

    return style;
  }, [ary, maxAmount]);

  return (
    <div
      onClick={handleClick}
      className={cx(
        styles.main,
        [depthType === LayEnum.ask ? styles.ask : styles.bid],
        { [styles.atv]: !!openOrderObj[isNft ? ary[2].nft || "" : ary[0]] },
        isH5 && styles.main_h5,
        className
      )}
      {...rest}
    >
      <div style={barStyle}></div>
      <div>
        <AzFontScale isLoop={true}>{docFormat.priceLab}</AzFontScale>
        <AzFontScale isLoop={true}>{docFormat.amountLab}</AzFontScale>
        {!isH5 && <AzFontScale isLoop={true}>{docFormat.totalLab}</AzFontScale>}
      </div>
    </div>
  );
};

export default observer(Main);
