import React, { HTMLAttributes, useCallback, useMemo, useState } from "react";
import { observer } from "mobx-react-lite";
import cx from "classnames";
import { Hooks } from "@az/base";
const { useTranslation } = Hooks;
// import store from "store";

import { Checkbox, Dropdown, MenuProps } from "antd";
import AzSvg from "@/components/az/svg";
import AppDivNoData from "components/app/div/noData";
import CMPT_btnPair from "../_cmpt/btnPair";
import CMPT_filter from "../_cmpt/filter";

import styles_h5 from "../h5.module.scss";
import styles from "./h5.module.scss";

import { OpenOrderExtendProps } from "./index";
import { TradeSideEnum } from "store/trade";

interface Props extends HTMLAttributes<HTMLDivElement> {
  isHideOtherPairs: boolean;
  setHideOtherPairs: (arg: boolean) => void;
  handleCancelAll: () => void;
  handleCancelOne: (arg: string) => void;
  handleRefresh: () => void;
  handleClickEdit: (arg: OpenOrderExtendProps) => void;
  side: "" | TradeSideEnum;
  setSide: (arg: "" | TradeSideEnum) => void;
  items?: OpenOrderExtendProps[];
  disabled?: boolean;
}

const Main: React.FC<Props> = ({
  isHideOtherPairs,
  setHideOtherPairs,
  handleCancelAll,
  handleCancelOne,
  handleRefresh,
  handleClickEdit,
  side,
  setSide,
  items,
  disabled,
}) => {
  const t = useTranslation();

  const hasItem = useMemo(() => {
    return !!(items && items.length);
  }, [items]);

  const [selfSide, setSelfSide] = useState(side);
  const dropdownItemsSide: MenuProps["items"] = useMemo(() => {
    return [
      {
        key: "",
        label: <a onClick={() => setSelfSide("")}>{t("trade.all")}</a>,
      },
      {
        key: TradeSideEnum.buy,
        label: <a onClick={() => setSelfSide(TradeSideEnum.buy)}>{t("trade.buy")}</a>,
      },
      {
        key: TradeSideEnum.sell,
        label: <a onClick={() => setSelfSide(TradeSideEnum.sell)}>{t("trade.sell")}</a>,
      },
    ];
  }, []);
  const dropdownLabelSide = useMemo(() => {
    if (selfSide === TradeSideEnum.buy) return t("trade.buy");
    if (selfSide === TradeSideEnum.sell) return t("trade.sell");
    return t("trade.all");
  }, [selfSide]);

  const handleDrawerOpen = useCallback(() => {
    // console.log("handleDrawerOpen===", side);
    setSelfSide(side);
  }, [side]);
  const handleDrawerReset = useCallback(() => {
    setSide("");
    handleRefresh();
  }, []);
  const handleDrawerSearch = useCallback(() => {
    // console.log("handleDrawerSearch===", selfSide);
    setSide(selfSide);
    handleRefresh();
  }, [selfSide]);

  return (
    <div className={styles_h5.main}>
      <div className={styles_h5.nav}>
        <Checkbox className={styles_h5.checkbox} checked={isHideOtherPairs} onChange={(e) => setHideOtherPairs(e.target.checked)}>
          {t("trade.hideOtherSymbol")}
        </Checkbox>

        <div className={styles_h5.opts}>
          <button className={cx("btnTxt", styles_h5.atv)} disabled={disabled || !hasItem} onClick={handleCancelAll}>
            {t("trade.cancelAll")}
          </button>

          <CMPT_filter onOpen={handleDrawerOpen} onReset={handleDrawerReset} onSearch={handleDrawerSearch}>
            <div className={styles_h5.dropdown}>
              <p>{t("trade.direction")}</p>
              <Dropdown
                overlayClassName={styles_h5.overlay}
                disabled={disabled}
                // getPopupContainer={(triggerNode: HTMLElement) => triggerNode}
                menu={{
                  items: dropdownItemsSide,
                  selectable: true,
                  selectedKeys: [selfSide],
                }}
              >
                <button className={cx("btnTxt btnDrop", styles.trigger)} onClick={(e) => e.preventDefault()}>
                  <span>{dropdownLabelSide}</span>
                </button>
              </Dropdown>
            </div>
          </CMPT_filter>
        </div>
      </div>

      {items && (
        <div className={styles_h5.content}>
          {!items.length ? (
            <AppDivNoData />
          ) : (
            items.map((doc) => {
              return (
                <div key={doc.orderId} className={styles_h5.card}>
                  <div className={styles_h5.cardNav}>
                    <CMPT_btnPair disabled={disabled} symbol={doc.symbol} />

                    <div>
                      <button
                        disabled={disabled}
                        className={cx("btnTxt", styles.actionBtn)}
                        onClick={() => handleClickEdit(doc)}
                        style={{ marginInlineEnd: "10px" }}
                      >
                        <AzSvg icon="edit" />
                      </button>
                      <button disabled={disabled} className={cx("btnTxt", styles.actionBtn)} onClick={() => handleCancelOne(doc.orderId)}>
                        <AzSvg icon="delete" />
                      </button>
                    </div>
                  </div>

                  <div className={styles_h5.cardUl}>
                    <div className={styles_h5.cardLi}>
                      <div>{t("trade.time")}</div>
                      <div>{doc._time}</div>
                    </div>
                    <div className={styles_h5.cardLi}>
                      <div>{t("trade.type")}</div>
                      <div>{doc._type}</div>
                    </div>
                    <div className={styles_h5.cardLi}>
                      <div>{t("trade.direction")}</div>
                      <div className={doc._sideCls}>{doc._side}</div>
                    </div>
                    <div className={styles_h5.cardLi}>
                      <div>{t("trade.price")}</div>
                      <div>{doc._price}</div>
                    </div>
                    <div className={styles_h5.cardLi}>
                      <div>{t("trade.amount")}</div>
                      <div>{doc._amount}</div>
                    </div>
                    <div className={styles_h5.cardLi}>
                      <div>{t("trade.executed")}</div>
                      <div>{doc._executed}</div>
                    </div>
                    <div className={styles_h5.cardLi}>
                      <div>{t("trade.openOrderTotal")}</div>
                      <div>{doc._total}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default observer(Main);
// export default Main;
