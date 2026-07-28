/* WebGL hero layer boot — registers the shared ticker, then mounts the layer. */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { initGL } from "./gl.js";

gsap.registerPlugin(ScrollTrigger);

addEventListener("load", () => {
  initGL({ canvas: document.querySelector("[data-gl-canvas]") });
});
