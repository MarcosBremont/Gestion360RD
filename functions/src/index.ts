import { initializeApp } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions/v2";

initializeApp();
setGlobalOptions({ region: "us-east1", maxInstances: 10 });

export { onReportWritten } from "./reports";
export { onAlertPublished, onUserTokens } from "./push";
export { refreshWeather } from "./weather";
