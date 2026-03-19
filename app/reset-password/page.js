import { Suspense } from "react";
import ResetPasswordContent from "./content";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="page-container">
          <div className="reset-card" style={{ textAlign: "center" }}>
            Loading...
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
