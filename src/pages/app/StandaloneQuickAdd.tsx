import React from "react";
import { useNavigate } from "react-router-dom";
import QuickEntry from "@/finance/QuickEntry";

export default function StandaloneQuickAdd() {
  const navigate = useNavigate();

  const handleClose = () => {
    const nativeBridge = (window as unknown as { BalFinNative?: { close: () => void } }).BalFinNative;
    if (nativeBridge && typeof nativeBridge.close === "function") {
      nativeBridge.close();
    } else {
      navigate("/app", { replace: true });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm">
      <QuickEntry
        open={true}
        onClose={handleClose}
        variant="popup"
      />
    </div>
  );
}
