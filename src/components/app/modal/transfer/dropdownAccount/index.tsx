import React, { useMemo } from "react";
import { observer } from "mobx-react-lite";
import cx from "classnames";
import { Hooks } from "@az/base";
const { useTranslation } = Hooks;
import store from "store";

import { Dropdown, DropdownProps, MenuProps } from "antd";

import styles from "./index.module.scss";

import { AccountEnum } from "store/balances";

interface Props extends DropdownProps {
  value: AccountEnum;
  skip?: AccountEnum[]; //需要跳过的账户
  onChange?: (val: AccountEnum) => void;
}

const Main: React.FC<Props> = ({ value, skip, onChange, ...rest }) => {
  const t = useTranslation();
  const { isSubAcc } = store.user;
  const { isFuturesUsdtOpen } = store.market;

  const accList = useMemo(() => {
    return [
      { key: AccountEnum.spot, label: t("trade.accSpot") },
      { key: AccountEnum.lever, label: t("trade.accMargin") },
      { key: AccountEnum.futures_u, label: t("trade.accFutureU") },
      // { key: AccountEnum.finance, label: t("trade.accFinance") },
    ];
  }, []);

  const atvAccDoc = useMemo(() => {
    return accList.find((doc) => doc.key === value) || { label: "" };
  }, [accList, value]);

  const items: MenuProps["items"] = useMemo(() => {
    const retAry: MenuProps["items"] = [];

    accList.map(({ key, label }) => {
      if (skip && skip.includes(key)) return false;
      if (key === AccountEnum.finance && isSubAcc) return false;
      let suffix = "";
      if (key === AccountEnum.futures_u && !isFuturesUsdtOpen) suffix = t("trade.notOpen");

      retAry.push({
        key,
        label: (
          <a onClick={() => onChange && onChange(key)} className={cx(suffix ? styles.notOpen : undefined)}>
            <span>{label}</span>
            {!!suffix && <small>{suffix}</small>}
          </a>
        ),
      });
    });

    return retAry;
  }, [accList, isSubAcc, skip, isFuturesUsdtOpen]);

  return (
    <Dropdown
      overlayClassName={styles.main}
      // getPopupContainer={(triggerNode: HTMLElement) => triggerNode}
      menu={{
        items,
        selectable: true,
        selectedKeys: [value],
      }}
      {...rest}
    >
      <button className={cx("btnTxt btnDrop", styles.trigger)} onClick={(e) => e.preventDefault()}>
        {atvAccDoc.label}
      </button>
    </Dropdown>
  );
};

export default observer(Main);
// export default Main;
