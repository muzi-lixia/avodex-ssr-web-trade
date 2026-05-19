import React, { HTMLAttributes, useCallback, useEffect, useMemo } from "react";
import { observer } from "mobx-react-lite";
// import { useRouter } from "next/router";
import cx from "classnames";
import { Util } from "@az/base";
// const { useTranslation } = Hooks;
const { Big } = Util;
import store from "store";
import Storage from "utils/storage";
// import { getUpDownCls, thousands } from "utils/method";
import { Dropdown, MenuProps } from "antd";

import styles from "./index.module.scss";

import { LayEnum } from "../index";
import indentFormat from "@/hooks/indentFormat";

interface Props extends HTMLAttributes<HTMLDivElement> {
  atvLay: string;
  onLayChange: (atvLay: LayEnum) => void;
  depthMerge?: string;
  setDepthMerge: (value: string) => void;
}

const IconDiv: React.FC = () => {
  return (
    <div className={styles.iconDiv}>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
  );
};

const Main: React.FC<Props> = ({ className, atvLay, onLayChange, depthMerge, setDepthMerge, ...rest }) => {
  const { name, currentConfig, isNft } = store.market;
  const { isH5 } = store.app;

  const depthMergePrecisionAry = useMemo(() => {
    const { depthMergePrecision, pricePrecision } = currentConfig;
    if (!depthMergePrecision) return;

    const retAry: string[] = [];

    const tempPricePrecision = Big(10).pow(pricePrecision || 0);
    let temp;
    for (let i = 0; i < depthMergePrecision; i++) {
      temp = Big(10).pow(i);
      retAry.push(Big(1).div(tempPricePrecision).times(temp).toFixed());
    }

    // console.log("depthMergePrecisionAry====", retAry);

    return retAry;
  }, [currentConfig]);
  useEffect(() => {
    if (!depthMergePrecisionAry) return;
    let symbolDepthMerge = depthMergePrecisionAry[0];
    const symbolDepthMergePrecision = Storage.get("symbolDepthMergePrecision");
    if (symbolDepthMergePrecision && symbolDepthMergePrecision[name] && depthMergePrecisionAry.includes(symbolDepthMergePrecision[name])) {
      symbolDepthMerge = symbolDepthMergePrecision[name];
    }
    if (symbolDepthMerge !== depthMerge) {
      setDepthMerge(symbolDepthMerge);
    }
  }, [depthMergePrecisionAry]);

  const handleClickDepthMerge = useCallback(
    (str) => {
      setDepthMerge(str);

      const symbolDepthMergePrecision = Storage.get("symbolDepthMergePrecision") || {};
      symbolDepthMergePrecision[name] = str;
      Storage.set("symbolDepthMergePrecision", symbolDepthMergePrecision);
    },
    [setDepthMerge, name]
  );
  const dropdownItems: MenuProps["items"] = useMemo(() => {
    if (!depthMergePrecisionAry) return [];
    return depthMergePrecisionAry.map((str) => {
      return {
        key: str,
        label: <a onClick={() => handleClickDepthMerge(str)}>{indentFormat(str)}</a>,
      };
    });
  }, [depthMergePrecisionAry, handleClickDepthMerge, store.app.isNumberIndent]);

  const handleCycleLay = useCallback(() => {
    const order = [LayEnum.ask2bid, LayEnum.ask, LayEnum.bid];
    const idx = order.indexOf(atvLay as LayEnum);
    const next = order[(idx + 1) % order.length];
    onLayChange(next);
  }, [atvLay, onLayChange]);

  const h5IconCls = useMemo(() => {
    if (atvLay === LayEnum.ask2bid) return styles.icon_ask2bid;
    if (atvLay === LayEnum.ask) return styles.icon_bid;
    return styles.icon_ask;
  }, [atvLay]);

  return (
    <div className={cx(styles.main, isH5 && styles.main_h5, className)} {...rest}>
      {!isH5 ? (
        <div className={cx(styles.icons)}>
          <button onClick={() => onLayChange(LayEnum.ask2bid)} className={cx("btnTxt", styles.icon_ask2bid, { [styles.iconAtv]: atvLay === LayEnum.ask2bid })}>
            <div>
              <div></div>
              <div></div>
            </div>
            <IconDiv />
          </button>
          <button onClick={() => onLayChange(LayEnum.ask)} className={cx("btnTxt", styles.icon_bid, { [styles.iconAtv]: atvLay === LayEnum.ask })}>
            <div></div>
            <IconDiv />
          </button>
          <button onClick={() => onLayChange(LayEnum.bid)} className={cx("btnTxt", styles.icon_ask, { [styles.iconAtv]: atvLay === LayEnum.bid })}>
            <div></div>
            <IconDiv />
          </button>
        </div>
      ) : (
        <button onClick={handleCycleLay} className={cx("btnTxt", styles.iconAtv, h5IconCls)}>
          {atvLay === LayEnum.ask2bid ? (
            <div>
              <div></div>
              <div></div>
            </div>
          ) : (
            <div></div>
          )}
          <IconDiv />
        </button>
      )}
      <div>
        {isNft ? (
          <></>
        ) : (
          <>
            {!!depthMergePrecisionAry && (
              <Dropdown
                placement={isH5 ? "topLeft" : "bottomRight"}
                trigger={isH5 ? ["click"] : ["hover"]}
                // getPopupContainer={(triggerNode: HTMLElement) => triggerNode}
                menu={{
                  items: dropdownItems,
                  selectable: true,
                  selectedKeys: depthMerge ? [depthMerge] : [],
                }}
              >
                <button className={cx("btnTxt btnHover btnDrop", styles.trigger, isH5 && styles.trigger_h5)} onClick={(e) => e.preventDefault()}>
                  {indentFormat(depthMerge)}
                </button>
              </Dropdown>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default observer(Main);
// export default Main;
