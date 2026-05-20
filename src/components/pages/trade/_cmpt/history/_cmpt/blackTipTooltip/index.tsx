import React from "react";
import { observer } from "mobx-react-lite";
import { Tooltip } from "antd";
import { Hooks } from "@az/base";
const { useTranslation } = Hooks;
import store from "store";

import cs from "./index.module.scss";

interface Props {
  children?: React.ReactNode;
}

const BlackTipTooltip: React.FC<Props> = ({ children }) => {
  const t = useTranslation();
  const { isH5 } = store.app;

  return (
    <Tooltip
      overlayClassName={cs.blackTipTooltip}
      className={cs.blackTipTooltipWrapper}
      placement={isH5 ? "top" : "topRight"}
      trigger={["click", "hover"]}
      title={<span dangerouslySetInnerHTML={{ __html: t("position.blackOrderRestrictionTip") }} />}
    >
      {children}
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M6.66667 13.3333C2.98477 13.3333 0 10.3485 0 6.66667C0 2.98477 2.98477 0 6.66667 0C10.3485 0 13.3333 2.98477 13.3333 6.66667C13.3333 10.3485 10.3485 13.3333 6.66667 13.3333ZM6.66667 12C9.6122 12 12 9.6122 12 6.66667C12 3.72115 9.6122 1.33333 6.66667 1.33333C3.72115 1.33333 1.33333 3.72115 1.33333 6.66667C1.33333 9.6122 3.72115 12 6.66667 12ZM7.33333 5.66667V8.66667H8V10H5.33333V8.66667H6V7H5.33333V5.66667H7.33333ZM7.66667 4C7.66667 4.55229 7.21893 5 6.66667 5C6.1144 5 5.66667 4.55229 5.66667 4C5.66667 3.44771 6.1144 3 6.66667 3C7.21893 3 7.66667 3.44771 7.66667 4Z"
          fill="var(--az-colorv2-system-warning)"
        />
      </svg>
    </Tooltip>
  );
};

export default observer(BlackTipTooltip);
