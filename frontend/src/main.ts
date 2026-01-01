import "@fortawesome/fontawesome-free/css/all.css";
import { App } from "./core/App";
import { BabylonWrapper } from "./core/BabylonWrapper";
import { PresenceService } from "./services/PresenceService";
import { WebGLService } from "./services/WebGLService";

// console.log("🚀 [MAIN] Booting System...");

const app = App.getInstance();
app
  .start()
  .then(() => {
    console.log("App started with user session");
    // Connect presence WebSocket for online status tracking
    PresenceService.getInstance().connect();
  })
  .catch(() => {
    console.log("App started without user session");
  })
  .finally(() => {
    // Initialize BabylonWrapper only if 3D mode is enabled
    const webglService = WebGLService.getInstance();

    console.log("[MAIN] is3DModeEnabled():", webglService.is3DModeEnabled());
    console.log("[MAIN] isWebGLSupported():", webglService.isWebGLSupported());
    console.log(
      "[MAIN] getUserPreference3DMode():",
      webglService.getUserPreference3DMode()
    );

    if (webglService.is3DModeEnabled()) {
      console.log("[MAIN] 3D Mode enabled - Initializing BabylonJS");
      document.body.classList.add("babylon-3d-mode");
      // Increase font size for better readability on 3D monitor
      document.documentElement.style.fontSize = "18px";
      BabylonWrapper.getInstanceIfEnabled();
    } else {
      console.log("[MAIN] 3D Mode disabled - Running in 2D mode");
      document.body.classList.remove("babylon-3d-mode");
      // Reset to default font size
      document.documentElement.style.fontSize = "";
    }

    // Expose for debugging
    (window as any).app = app;
    (window as any).webglService = webglService;
  });
